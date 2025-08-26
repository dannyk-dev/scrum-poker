/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { getRedisClient } from "@/server/redis";
import { Role } from "@prisma/client";
import { tracked, TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import z from "zod";
import crypto from "crypto";
import EventEmitter from "events";
import { sleep } from "@/lib/utils";
import type { Invitation, Notification } from "prisma/interfaces";

const notificationEmitter = new EventEmitter();

export const playerRouter = createTRPCRouter({
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    const notifs = await ctx.db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const tokens = notifs
      .filter((n) => n.type === "Invitation")
      .map((n) => (n.data as any)?.token)
      .filter(Boolean) as string[];

    let inviteMap: Record<
      string,
      { accepted: boolean; acceptedAt: Date | null }
    > = {};
    if (tokens.length) {
      const invites = await ctx.db.invitation.findMany({
        where: { token: { in: tokens } },
        select: { token: true, accepted: true, acceptedAt: true },
      });
      inviteMap = Object.fromEntries(
        invites.map((i) => [
          i.token,
          { accepted: i.accepted, acceptedAt: i.acceptedAt },
        ]),
      );
    }

    return notifs.map((n) => {
      if (n.type !== "Invitation") return n;

      const token = (n.data as any)?.token;
      const extra = inviteMap[token] ?? { accepted: false, acceptedAt: null };

      return {
        ...n,
        data: { ...(n.data as object), ...extra },
      };
    });
  }),
  getPlayerEmails: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId
    const players = await ctx.db.user.findMany({
      include: {
        rooms: true,
        accounts: true,
        _count: true,
      },
      where: {
        activeOrganizationId: orgId
      }
    });

    return players;
  }),
  invitePlayers: protectedProcedure
    .input(
      z.object({ roomId: z.string(), emails: z.array(z.string().email()) }),
    )
    .mutation(async ({ input, ctx }) => {
      const redisClient = getRedisClient();
      const room = await db.room.findUnique({ where: { id: input.roomId } });
      if (!room)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });

      const invites = await Promise.all(
        input.emails.map(async (email) => {
          const token = crypto.randomBytes(16).toString("hex");
          const invitation = await db.invitation.create({
            data: {
              roomId: input.roomId,
              email,
              token,
              invitedById: ctx.session.user.id,
            },
            include: {
              invitedBy: true,
            },
          });

          const user = await db.user.findUnique({ where: { email } });
          if (user) {
            const notif = await db.notification.create({
              data: {
                userId: user.id,
                type: "Invitation",
                message: `Invitiation received.`,
                data: {
                  roomId: input.roomId,
                  token,
                  roomName: room.name,
                  inviteBy: invitation.invitedBy.name,
                },
              },
            });
            await redisClient.publish(
              `user:${user.id}:notifications`,
              JSON.stringify(notif),
            );
            notificationEmitter.emit(`notification:${user.id}`, notif);
          }
          return invitation;
        }),
      );

      return invites;
    }),
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invite = await db.invitation.findUnique({
        where: { token: input.token },
      });

      if (!invite || invite.accepted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has already been accepted.",
        });
      }

      const pub = getRedisClient();
      const roomExists = await ctx.db.room.findUnique({
        where: {
          id: invite.roomId,
        },
      });

      if (!roomExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room no longer exists",
        });
      }

      const roomUser = await db.roomUser.create({
        data: {
          roomId: invite.roomId,
          userId: ctx.session.user.id,
          role: Role.USER,
        },
        include: {
          user: true,
        },
      });

      await db.invitation.update({
        where: { id: invite.id },
        data: { accepted: true, acceptedAt: new Date() },
      });

      await pub.publish(
        `room:${roomUser.roomId}:user:join`,
        JSON.stringify({
          userId: ctx.session.user.id,
          name: ctx.session.user.name ?? "Someone",
          ts: Date.now(),
        }),
      );

      revalidatePath("/scrum-room");
      return { roomUser, needRole: false };
    }),
  viewNotification: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.notification.update({
        data: {
          read: true,
        },
        where: {
          id: input.notificationId,
        },
      });
    }),
  deleteNotification: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const notif = await ctx.db.notification.delete({
        where: {
          id: input.notificationId,
        },
      });

      return notif;
    }),
  onNotification: protectedProcedure
    .input(z.object({ lastEventId: z.string().nullish() }).nullish())
    .subscription(async function* ({ ctx, input, signal }) {
      const userId = ctx.session.user.id;
      let lastId = input?.lastEventId ?? null;

      const enrichBatch = async (rows: Notification[]) => {
        const tokens = rows
          .filter((n) => n.type === "Invitation")
          .map((n) => (n.data as any)?.token)
          .filter(Boolean) as string[];

        let inviteMap: Record<
          string,
          { accepted: boolean; acceptedAt: Date | null }
        > = {};
        if (tokens.length) {
          const invites = await ctx.db.invitation.findMany({
            where: { token: { in: tokens } },
            select: { token: true, accepted: true, acceptedAt: true },
          });
          inviteMap = Object.fromEntries(
            invites.map((i) => [
              i.token,
              { accepted: i.accepted, acceptedAt: i.acceptedAt },
            ]),
          );
        }

        return rows.map((n) => {
          if (n.type !== "Invitation") return n;
          const token = (n.data as any)?.token;
          const extra = inviteMap[token] ?? {
            accepted: false,
            acceptedAt: null,
          };
          return { ...n, data: { ...(n.data as object), ...extra } };
        });
      };

      const baseWhere = { userId, read: false } as any;
      if (lastId) {
        const since = new Date(Number(lastId));
        if (!Number.isFinite(since.valueOf())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid lastEventId",
          });
        }
        baseWhere.createdAt = { gt: since };
      }

      const backlogRaw = await ctx.db.notification.findMany({
        where: baseWhere,
        orderBy: { createdAt: "asc" },
      });

      const backlog = await enrichBatch(backlogRaw);

      for (const n of backlog) {
        const id = n.createdAt.getTime().toString();
        yield tracked(id, n);
        lastId = id;
      }

      const sub = getRedisClient();
      const channel = `user:${userId}:notifications`;
      await sub.subscribe(channel);

      type LiveRow = Notification & { ts: number };
      const queue: LiveRow[] = [];

      const onMsg = (_c: string, raw: string) => {
        try {
          const n = JSON.parse(raw) as Notification;
          queue.push({ ...n, ts: Date.now() });
        } catch {} // ignore malformed
      };
      sub.on("message", onMsg);

      try {
        while (!signal?.aborted) {
          if (queue.length) {
            const batch: LiveRow[] = queue.splice(0, queue.length);
            const enriched = await enrichBatch(batch);
            for (const n of enriched) {
              const id = (n as LiveRow).ts.toString();
              if (id !== lastId) {
                yield tracked(id, n);
                lastId = id;
              }
            }
          }
          await sleep(1000); // lighter latency
        }
      } finally {
        sub.off("message", onMsg);
        await sub.unsubscribe(channel).finally(() => sub.disconnect());
      }
    }),
  onUserJoined: protectedProcedure
    .input(
      z
        .object({ roomId: z.string(), lastEventId: z.string().nullish() })
        .nullish(),
    )
    .subscription(async function* ({ ctx, input, signal }) {
      const roomId = input?.roomId;
      let lastId = input?.lastEventId ?? null;

      if (lastId) {
        const since = new Date(Number(lastId));
        if (!Number.isFinite(since.valueOf())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid lastEventId",
          });
        }

        const pastJoins = await ctx.db.roomUser.findMany({
          where: { roomId, joinedAt: { gt: since } },
          orderBy: { joinedAt: "asc" },
          include: { user: true },
        });

        for (const ru of pastJoins) {
          const id = ru.joinedAt.getTime().toString();
          yield tracked(id, {
            userId: ru.userId,
            name: ru.user.name ?? "Someone",
            kind: "join" as const,
            lastId: id,
          });
          lastId = id;
        }
      }
      const joinChan = `room:${roomId}:user:join`;
      const leaveChan = `room:${roomId}:user:leave`;
      const sub = getRedisClient();
      await sub.subscribe(joinChan);
      await sub.subscribe(leaveChan);

      type Live = {
        userId: string;
        name: string;
        ts: number;
        kind: "join" | "leave";
      };
      const queue: Live[] = [];

      const onMsg = (chan: string, raw: string) => {
        try {
          const base = JSON.parse(raw) as {
            userId: string;
            name: string;
            ts: number;
          };
          const kind = chan.endsWith("leave") ? "leave" : "join";
          if (base.ts.toString() !== lastId) queue.push({ ...base, kind });
        } catch {
          /* ignore bad payload */
        }
      };
      sub.on("message", onMsg);

      try {
        while (!signal?.aborted) {
          while (queue.length) {
            const evt = queue.shift()!;
            const id = evt.ts.toString();
            yield tracked(id, {
              userId: evt.userId,
              name: evt.name,
              kind: evt.kind,
              lastId: id,
            });
            lastId = id;
          }
          await sleep(2000); // small idle delay
        }
      } finally {
        sub.off("message", onMsg);
        await sub.unsubscribe(joinChan);
        await sub.unsubscribe(leaveChan);
        sub.disconnect();
      }
    }),
});
