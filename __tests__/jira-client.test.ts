/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  JiraClient,
  type JiraBoard,
  type JiraIssue,
  type JiraSprint,
} from "@/server/integrations/jira-client";

const mockFetch = global.fetch as jest.Mock;

// lightweight Response mock
function mkRes(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers?.[k] ?? null },
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

describe("JiraClient", () => {
  let client: JiraClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new JiraClient({
      baseUrl: process.env.JIRA_BASE_URL!,
      accessToken: process.env.JIRA_ACCESS_TOKEN!,
    });
  });

  test("request GET builds URL with query and parses JSON", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(200, { hello: "world" }));
    // @ts-expect-error private
    const data = await (client as any).request(
      "GET",
      "/rest/api/3/myself",
      undefined,
      { expand: "groups", maxResults: 50 },
    );
    expect(data).toEqual({ hello: "world" });

    const raw = mockFetch.mock.calls[0][0] as string;
    const url = new URL(raw);
    expect(url.origin + url.pathname).toBe(
      `${process.env.JIRA_BASE_URL}/rest/api/3/myself`,
    );
    expect(url.searchParams.get("expand")).toBe("groups");
    expect(url.searchParams.get("maxResults")).toBe("50");
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as any).Authorization).toBe(
      `Bearer ${process.env.JIRA_ACCESS_TOKEN}`,
    );
  });

  test("request handles 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    // @ts-expect-error private
    const out = await (client as any).request(
      "DELETE",
      "/rest/api/3/issue/ABC-1",
    );
    expect(out).toBeUndefined();
  });

  // Use real timers. Our client backs off ~500ms once; that's fine.
  test("request retries once on 429 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(
        mkRes(429, { err: "rate" }, { "Retry-After": "0" }),
      )
      .mockResolvedValueOnce(mkRes(200, { ok: true }));

    // @ts-expect-error private
    const res = await (client as any).request("GET", "/rest/api/3/myself");
    expect(res).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("paged(values) aggregates pages and stops", async () => {
    const page1 = {
      values: [{ id: 1 }, { id: 2 }],
      total: 3,
      maxResults: 2,
      startAt: 0,
    };
    const page2 = { values: [{ id: 3 }], total: 3, maxResults: 2, startAt: 2 };
    mockFetch
      .mockResolvedValueOnce(mkRes(200, page1))
      .mockResolvedValueOnce(mkRes(200, page2));

    // @ts-expect-error private
    const items = await (client as any).paged(
      "/rest/agile/1.0/board",
      "values",
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ id: 1 });
  });

  test("paged(issues) aggregates pages and stops on empty", async () => {
    const p1 = {
      issues: [{ key: "A-1" as const }],
      maxResults: 50,
      startAt: 0,
    };
    const p2 = { issues: [] as JiraIssue[], maxResults: 50, startAt: 50 };
    mockFetch
      .mockResolvedValueOnce(mkRes(200, p1))
      .mockResolvedValueOnce(mkRes(200, p2));

    // @ts-expect-error private
    const items = await (client as any).paged("/rest/api/3/search", "issues");
    expect(items.map((i: JiraIssue) => i.key)).toEqual(["A-1"]);
  });

  test("listProjects returns values", async () => {
    mockFetch.mockResolvedValueOnce(
      mkRes(200, { values: [{ id: "1", key: "PRJ", name: "Project" }] }),
    );
    const res = await client.listProjects();
    expect(res[0].key).toBe("PRJ");
  });

  test("listBoards filters scrum and project", async () => {
    const boards: JiraBoard[] = [
      {
        id: 10,
        name: "Scrum 1",
        type: "scrum",
        location: { projectKey: "PRJ" },
      },
      { id: 11, name: "Scrum 2", type: "scrum" },
    ];
    const page = {
      values: boards,
      total: boards.length,
      maxResults: boards.length,
      startAt: 0,
    };
    mockFetch.mockResolvedValueOnce(mkRes(200, page));
    const res = await client.listBoards("PRJ");
    expect(res).toHaveLength(2);

    const u = new URL(mockFetch.mock.calls[0][0] as string);
    expect(u.searchParams.get("type")).toBe("scrum");
    expect(u.searchParams.get("projectKeyOrId")).toBe("PRJ");
  });

  test("listSprints and getActiveSprint", async () => {
    const sprints: JiraSprint[] = [
      { id: 1, name: "Sprint 1", state: "active", originBoardId: 10 },
    ];
    const page1 = { values: sprints, total: 1, maxResults: 50, startAt: 0 };

    mockFetch
      .mockResolvedValueOnce(mkRes(200, page1)) // listSprints() uses 1 page (total=1)
      .mockResolvedValueOnce(mkRes(200, page1)); // getActiveSprint() calls listSprints() again

    const got = await client.listSprints(10, "active");
    expect(got[0].id).toBe(1);

    const active = await client.getActiveSprint(10);
    expect(active?.id).toBe(1);
  });

  test("moveIssuesToSprint posts correct payload", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    await client.moveIssuesToSprint(7, ["PRJ-1", "PRJ-2"]);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rest/agile/1.0/sprint/7/issue");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ issues: ["PRJ-1", "PRJ-2"] }));
  });

  test("searchIssues uses JQL and fields", async () => {
    const page = {
      issues: [{ key: "P-1" }],
      total: 1,
      maxResults: 50,
      startAt: 0,
    };
    mockFetch
      .mockResolvedValueOnce(mkRes(200, page))
      .mockResolvedValueOnce(mkRes(200, { issues: [] })); // second page empty

    const out = await client.searchIssues('project = "P"', [
      "summary",
      "assignee",
    ]);
    expect(out[0].key).toBe("P-1");

    const u = new URL(mockFetch.mock.calls[0][0] as string);
    expect(u.searchParams.get("fields")).toBe("summary,assignee");
    expect(u.searchParams.get("jql")).toBe('project = "P"'); // avoid encoding asserts
  });

  test("getSprintIssues works", async () => {
    const page = {
      issues: [{ key: "P-2" }],
      total: 1,
      maxResults: 50,
      startAt: 0,
    };
    const empty = {
      issues: [] as JiraIssue[],
      total: 1,
      maxResults: 50,
      startAt: 50,
    };
    mockFetch
      .mockResolvedValueOnce(mkRes(200, page))
      .mockResolvedValueOnce(mkRes(200, empty));

    const out = await client.getSprintIssues(9, ["summary"]);
    expect(out[0].key).toBe("P-2");
  });

  test("updateIssueFields sends PUT with fields", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    await client.updateIssueFields("P-3", { summary: "x" });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rest/api/3/issue/P-3");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ fields: { summary: "x" } }));
  });

  test("setAssignee assigns and unassigns", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(204, "")); // assign
    await client.setAssignee("P-4", "acc-1");
    let body = JSON.parse(
      (mockFetch.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({ accountId: "acc-1" });

    mockFetch.mockResolvedValueOnce(mkRes(204, "")); // unassign
    await client.setAssignee("P-4", null);
    body = JSON.parse(
      (mockFetch.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(body).toEqual({ accountId: null });
  });

  test("getIssueTransitions and transitionIssue", async () => {
    mockFetch.mockResolvedValueOnce(
      mkRes(200, { transitions: [{ id: "2", name: "Done" }] }),
    );
    const t = await client.getIssueTransitions("P-5");
    expect(t.transitions[0].name).toBe("Done");

    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    await client.transitionIssue("P-5", "2");
    const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toContain("/rest/api/3/issue/P-5/transitions");
    expect(init.method).toBe("POST");
  });

  test("votes add/remove endpoints", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    await client.addVote("P-6");
    expect(mockFetch.mock.calls[0][0] as string).toContain("/votes");

    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    await client.removeVote("P-6");
    const init = mockFetch.mock.calls[1][1] as RequestInit;
    expect(init.method).toBe("DELETE");
  });

  test("resolveStoryPointsFieldId via board config", async () => {
    mockFetch.mockResolvedValueOnce(
      mkRes(200, { estimation: { field: { fieldId: "customfield_10016" } } }),
    );
    const id = await client.resolveStoryPointsFieldId(12);
    expect(id).toBe("customfield_10016");
  });

  test("resolveStoryPointsFieldId fallback to fields scan", async () => {
    // Force board-config failure then fields success; pass boardId so try/catch path runs.
    mockFetch
      .mockResolvedValueOnce(mkRes(500, { err: "no cfg" })) // board config
      .mockResolvedValueOnce(
        mkRes(200, [
          { id: "customfield_99", name: "Other" },
          { id: "customfield_10016", name: "Story point estimate" },
        ]),
      );

    const id = await client.resolveStoryPointsFieldId(99);
    expect(id).toBe("customfield_10016");
  });

  test("setStoryPoints uses resolved field id", async () => {
    mockFetch
      .mockResolvedValueOnce(
        mkRes(200, { estimation: { field: { fieldId: "customfield_10016" } } }),
      ) // resolve
      .mockResolvedValueOnce(mkRes(204, "")); // put
    await client.setStoryPoints("P-7", 8, 12);
    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(
      JSON.stringify({ fields: { customfield_10016: 8 } }),
    );
  });

  test("bulkSetStoryPoints and bulkAssign iterate", async () => {
    mockFetch.mockResolvedValueOnce(
      mkRes(200, { estimation: { field: { fieldId: "customfield_10016" } } }),
    );
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));

    await client.bulkSetStoryPoints(
      [
        { issueKey: "P-1", points: 3 },
        { issueKey: "P-2", points: 5 },
      ],
      12,
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);

    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    mockFetch.mockResolvedValueOnce(mkRes(204, ""));
    await client.bulkAssign([
      { issueKey: "P-1", accountId: "A" },
      { issueKey: "P-2", accountId: null },
    ]);
    expect((mockFetch.mock.calls[3][1] as RequestInit).method).toBe("PUT");
    expect((mockFetch.mock.calls[4][1] as RequestInit).method).toBe("PUT");
  });

  // — replace the whole test —
  test("getPlanningSnapshot returns boards, active sprint and its issues", async () => {
    const boards = {
      values: [{ id: 99, name: "Board", type: "scrum" }],
      total: 1,
      maxResults: 1,
      startAt: 0,
    };
    const sprintPage = {
      values: [{ id: 77, name: "Sprint", state: "active" }],
      total: 1,
      maxResults: 50,
      startAt: 0,
    };
    const issues = {
      issues: [{ key: "P-10" }],
      total: 1,
      maxResults: 50,
      startAt: 0,
    };

    mockFetch
      .mockResolvedValueOnce(mkRes(200, boards)) // listBoards (1 page)
      .mockResolvedValueOnce(mkRes(200, sprintPage)) // getActiveSprint -> listSprints (1 page)
      .mockResolvedValueOnce(mkRes(200, issues)); // getSprintIssues (1 page)

    const snap = await client.getPlanningSnapshot("PRJ");
    expect(snap.board?.id).toBe(99);
    expect(snap.activeSprint?.id).toBe(77);
    expect(snap.issues[0].key).toBe("P-10");
  });

  test("getMyself, searchUsers, usersAssignableToProject", async () => {
    mockFetch.mockResolvedValueOnce(
      mkRes(200, { accountId: "me", displayName: "Me" }),
    );
    const me = await client.getMyself();
    expect(me.accountId).toBe("me");

    mockFetch.mockResolvedValueOnce(mkRes(200, [{ accountId: "u1" }]));
    const users = await client.searchUsers("john");
    expect(users[0].accountId).toBe("u1");

    mockFetch.mockResolvedValueOnce(mkRes(200, [{ accountId: "u2" }]));
    const assignable = await client.usersAssignableToProject("PRJ");
    expect(assignable[0].accountId).toBe("u2");
  });
});
