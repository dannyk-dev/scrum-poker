/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type JiraClientOptions = {
  /** https://yourcompany.atlassian.net */
  baseUrl: string;
  /** OAuth access token from NextAuth Atlassian provider */
  accessToken: string;
  /** Optional UA for auditing */
  userAgent?: string;
};

export type JiraProject = { id: string; key: string; name: string };
export type JiraBoard = {
  id: number;
  name: string;
  type: "scrum" | "kanban";
  location?: { projectKey?: string; projectId?: string };
};
export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  originBoardId?: number;
};
export type JiraUser = {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active?: boolean;
};
export type JiraIssue = {
  id: string;
  key: string;
  fields?: Record<string, any>;
};

export class JiraError extends Error {
  status: number;
  body: unknown;
  constructor(msg: string, status: number, body: unknown) {
    super(msg);
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | undefined>;

type PageMeta = {
  maxResults?: number;
  startAt?: number;
  total?: number;
  isLast?: boolean;
};
type ValuesPage<T> = PageMeta & { values: T[] };
type IssuesPage<T> = PageMeta & { issues: T[] };

export class JiraClient {
  private baseUrl: string;
  private token: string;
  private ua: string;

  constructor(opts: JiraClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.accessToken;
    this.ua = opts.userAgent ?? "scrum-poker/1.0";
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.ua,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 204) return undefined as T;
    if (res.ok) return (await res.json()) as T;

    if (res.status === 429) {
      const retry = Number(res.headers.get("Retry-After") ?? "1");
      await new Promise((r) => setTimeout(r, Math.max(500, retry * 1000)));
      return this.request<T>(method, path, body, query);
    }

    let payload: unknown = undefined;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text();
    }
    throw new JiraError(`Jira ${method} ${path} failed`, res.status, payload);
  }

  private async paged<T>(
    path: string,
    listKey: "values",
    query?: Query,
  ): Promise<T[]>;
  private async paged<T>(
    path: string,
    listKey: "issues",
    query?: Query,
  ): Promise<T[]>;
  private async paged<T>(
    path: string,
    listKey: "values" | "issues",
    query?: Query,
  ): Promise<T[]> {
    const out: T[] = [];
    let startAt = 0;

    for (;;) {
      if (listKey === "values") {
        const page = await this.request<ValuesPage<T>>("GET", path, undefined, {
          ...query,
          startAt,
          maxResults: 50,
        });
        const chunk = page.values ?? [];
        out.push(...chunk);
        startAt += page.maxResults ?? chunk.length;
        if (
          chunk.length === 0 ||
          page.isLast === true ||
          (page.total !== undefined && out.length >= page.total)
        )
          break;
      } else {
        const page = await this.request<IssuesPage<T>>("GET", path, undefined, {
          ...query,
          startAt,
          maxResults: 50,
        });
        const chunk = page.issues ?? [];
        out.push(...chunk);
        startAt += page.maxResults ?? chunk.length;
        if (
          chunk.length === 0 ||
          page.isLast === true ||
          (page.total !== undefined && out.length >= page.total)
        )
          break;
      }
    }
    return out;
  }

  async getMyself(): Promise<JiraUser> {
    return this.request<JiraUser>("GET", "/rest/api/3/myself");
  }

  async searchUsers(query: string, max = 20): Promise<JiraUser[]> {
    return this.request<JiraUser[]>(
      "GET",
      "/rest/api/3/user/search",
      undefined,
      { query, maxResults: max },
    );
  }

  async usersAssignableToProject(
    projectKeyOrId: string,
    query?: string,
    max = 50,
  ): Promise<JiraUser[]> {
    return this.request<JiraUser[]>(
      "GET",
      "/rest/api/3/user/assignable/search",
      undefined,
      { project: projectKeyOrId, query, maxResults: max },
    );
  }

  async listProjects(): Promise<JiraProject[]> {
    const res = await this.request<{ values: JiraProject[] }>(
      "GET",
      "/rest/api/3/project/search",
      undefined,
      { expand: "", maxResults: 1000 },
    );
    return res.values ?? [];
  }

  async listBoards(projectKeyOrId?: string): Promise<JiraBoard[]> {
    const boards = await this.paged<JiraBoard>(
      "/rest/agile/1.0/board",
      "values",
      {
        type: "scrum",
        projectKeyOrId,
      },
    );
    return boards;
  }

  async getBoardConfiguration(boardId: number): Promise<any> {
    return this.request<any>(
      "GET",
      `/rest/agile/1.0/board/${boardId}/configuration`,
    );
  }

  async listSprints(
    boardId: number,
    state?: "active" | "future" | "closed",
  ): Promise<JiraSprint[]> {
    const sprints = await this.paged<JiraSprint>(
      `/rest/agile/1.0/board/${boardId}/sprint`,
      "values",
      { state },
    );

    return sprints;
  }

  async getActiveSprint(boardId: number): Promise<JiraSprint | null> {
    const sprints = await this.listSprints(boardId, "active");
    return sprints[0] ?? null;
  }

  async moveIssuesToSprint(
    sprintId: number,
    issueKeys: string[],
  ): Promise<void> {
    await this.request("POST", `/rest/agile/1.0/sprint/${sprintId}/issue`, {
      issues: issueKeys,
    });
  }

  async searchIssues(
    jql: string,
    fields?: string[],
    max = 100,
  ): Promise<JiraIssue[]> {
    const issues = await this.paged<JiraIssue>("/rest/api/3/search", "issues", {
      jql,
      fields: fields?.join(","),
      expand: "",
      maxResults: Math.min(max, 100),
    });
    return issues;
  }

  async getSprintIssues(
    sprintId: number,
    fields?: string[],
  ): Promise<JiraIssue[]> {
    const sprintIssues = await this.paged<JiraIssue>(
      `/rest/agile/1.0/sprint/${sprintId}/issue`,
      "issues",
      {
        fields: fields?.join(","),
      },
    );
    return sprintIssues;
  }

  async addComment(issueKey: string, body: string): Promise<void> {
    await this.request("POST", `/rest/api/3/issue/${issueKey}/comment`, {
      body,
    });
  }

  async updateIssueFields(
    issueKeyOrId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    await this.request("PUT", `/rest/api/3/issue/${issueKeyOrId}`, { fields });
  }

  async setAssignee(
    issueKeyOrId: string,
    accountId: string | null,
  ): Promise<void> {
    // null unassigns
    await this.request("PUT", `/rest/api/3/issue/${issueKeyOrId}/assignee`, {
      accountId,
    });
  }

  async getIssueTransitions(
    issueKeyOrId: string,
  ): Promise<{ transitions: { id: string; name: string }[] }> {
    return this.request("GET", `/rest/api/3/issue/${issueKeyOrId}/transitions`);
  }

  async transitionIssue(
    issueKeyOrId: string,
    transitionId: string,
  ): Promise<void> {
    await this.request(
      "POST",
      `/rest/api/3/issue/${issueKeyOrId}/transitions`,
      { transition: { id: transitionId } },
    );
  }

  // --------------- Votes (Jira "Votes" feature) ---------------
  async addVote(issueKeyOrId: string): Promise<void> {
    await this.request("POST", `/rest/api/3/issue/${issueKeyOrId}/votes`);
  }
  async removeVote(issueKeyOrId: string): Promise<void> {
    await this.request("DELETE", `/rest/api/3/issue/${issueKeyOrId}/votes`);
  }

  // --------------- Story Points helpers ---------------
  /**
   * Resolve the Story Points field id.
   * Strategy:
   *  1) Board config estimation field (Agile API)
   *  2) Fallback to searching fields by common display names
   */
  async resolveStoryPointsFieldId(boardId?: number): Promise<string> {
    // Try board estimation config
    if (boardId) {
      try {
        const cfg = await this.getBoardConfiguration(boardId);
        const est = cfg?.estimation?.field;
        const fieldId = est?.fieldId ?? est?.fieldName;
        if (fieldId && typeof fieldId === "string") return fieldId; // often "customfield_10016"
      } catch {
        // ignore
      }
    }
    // Fallback: scan all fields
    const fields = await this.request<any[]>("GET", "/rest/api/3/field");
    const candidates = [
      "Story Points",
      "Story point estimate",
      "Story points",
      "Story Point Estimate",
    ].map((s) => s.toLowerCase());
    const match = fields.find((f) =>
      candidates.includes(String(f.name ?? "").toLowerCase()),
    );
    if (!match?.id) throw new Error("Could not resolve Story Points field id");
    return match.id as string;
  }

  async setStoryPoints(
    issueKeyOrId: string,
    points: number,
    boardId?: number,
  ): Promise<void> {
    const fieldId = await this.resolveStoryPointsFieldId(boardId);
    await this.updateIssueFields(issueKeyOrId, { [fieldId]: points });
  }

  async bulkSetStoryPoints(
    items: Array<{ issueKey: string; points: number }>,
    boardId?: number,
  ): Promise<void> {
    const fieldId = await this.resolveStoryPointsFieldId(boardId);
    for (const it of items) {
      await this.updateIssueFields(it.issueKey, { [fieldId]: it.points });
    }
  }

  async bulkAssign(
    items: Array<{ issueKey: string; accountId: string | null }>,
  ): Promise<void> {
    for (const it of items) {
      await this.setAssignee(it.issueKey, it.accountId);
    }
  }

  async getPlanningSnapshot(projectKeyOrId: string) {
    const boards = await this.listBoards(projectKeyOrId);
    const board = boards[0];
    const active = board ? await this.getActiveSprint(board.id) : null;
    const issues = active
      ? await this.getSprintIssues(active.id, [
          "summary",
          "assignee",
          "status",
          "priority",
        ])
      : [];
    return { boards, board, activeSprint: active, issues };
  }
}
