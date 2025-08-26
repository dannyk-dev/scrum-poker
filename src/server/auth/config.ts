import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Atlassian from "next-auth/providers/atlassian";
// import { OrgRole } from "@prisma/client";
import type { OrgRole, User } from "prisma/interfaces";

import { db } from "@/server/db";
// Ensure db is correctly typed and userOrganization exists on db

/**
 * Module augmentation for `next-auth` types.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: User & DefaultSession["user"];
  }

}

type AccessibleResource = {
  id: string; // Atlassian cloudId
  name?: string;
  url?: string; // https://<site>.atlassian.net
  avatarUrl?: string;
  scopes?: string[];
};

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET!,
  providers: [
    Atlassian({
      clientId: process.env.ATLASSIAN_CLIENT_ID!,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "write:jira-work read:jira-work read:jira-user offline_access read:me",
          prompt: "consent",
        },
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  events: {
    async signIn({ user, account }) {
      try {
        if (account?.provider !== "atlassian" || !account.access_token)
          return true;

        const res = await fetch(
          "https://api.atlassian.com/oauth/token/accessible-resources",
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              Accept: "application/json",
            },
          },
        );
        if (!res.ok) return true;

        const resources = (await res.json()) as AccessibleResource[];
        if (!resources?.length) return true;

        await db.$transaction(async (tx) => {
          const orgIds: string[] = [];

          for (const r of resources) {
            if (!r?.id) continue;

            const org = await tx.organization.upsert({
              where: { atlassianCloudId: r.id },
              create: {
                atlassianCloudId: r.id,
                name: r.name ?? "Atlassian site",
                baseUrl: r.url ?? null,
                avatarUrl: r.avatarUrl ?? null,
              },
              update: {
                name: r.name ?? undefined,
                baseUrl: r.url ?? undefined,
                avatarUrl: r.avatarUrl ?? undefined,
              },
            });

            orgIds.push(org.id);

            await tx.userOrganization.upsert({
              where: {
                organizationId_userId: {
                  organizationId: org.id,
                  userId: user.id!,
                },
              },
              update: {},
              create: {
                organizationId: org.id,
                userId: user.id!,
                role: "MEMBER" as OrgRole,
              },
            });
          }

          if (!orgIds.length) return;

          await db.$transaction(async (tx) => {
            // collect orgIds the user belongs to
            const memberships = await tx.userOrganization.findMany({
              where: { userId: user.id! },
              select: { organizationId: true },
              orderBy: { joinedAt: "asc" },
            });
            if (memberships.length === 0) return true;

            const current = await tx.user.findUnique({
              where: { id: user.id! },
              select: { activeOrganizationId: true },
            });

            const firstOrgId = memberships[0]!.organizationId;
            if (
              !current?.activeOrganizationId ||
              !memberships.some(
                (m) => m.organizationId === current.activeOrganizationId,
              )
            ) {
              await tx.user.update({
                where: { id: user.id! },
                data: { activeOrganizationId: firstOrgId },
              });
            }
          });
        });

        return true;
      } catch {
        return true;
      }
    },
  },
} satisfies NextAuthConfig;
