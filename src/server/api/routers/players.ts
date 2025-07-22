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
import type { Notification } from "prisma/interfaces";

const notificationEmitter = new EventEmitter();
const roomUserEmitter = new EventEmitter();

export const playerRouter = createTRPCRouter({
  getNotifications: protectedProcedure.query(({ ctx }) => {
    return ctx.db.notification.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          include: {
            invitations: true,
          },
        },
      },
    });
  }),
  getPlayerEmails: protectedProcedure.query(async ({ ctx }) => {
    const players = await ctx.db.user.findMany({
      include: {
        rooms: true,
        accounts: true,
        _count: true,
      },
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
          message: "Invalid or already used token",
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

      roomUserEmitter.emit(
        `accepted:${roomUser.userId}:${roomUser.roomId}`,
        roomUser,
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
          id: input.notificationId
        }
      });

      return notif
    }),
  onNotification: protectedProcedure
    .input(z.object({ lastEventId: z.string().nullish() }).nullish())
    .subscription(async function* ({ ctx, signal, input }) {
      const channel = `user:${ctx.session.user.id}:notifications`;

      const lastEventId = input?.lastEventId ?? null;
      const catchUp = await ctx.db.notification.findMany({
        where: {
          userId: ctx.session.user.id,
          read: false,
          ...(lastEventId && { id: { gt: lastEventId } }),
        },
        orderBy: { createdAt: "asc" },
      });

      for (const n of catchUp) {
        yield tracked(n.id, n);
      }

      const sub = getRedisClient();
      await sub.subscribe(channel);

      const queue: Notification[] = [];
      const onMessage = (_chan: string, raw: string) => {
        try {
          queue.push(JSON.parse(raw) as Notification);
        } catch {
        }
      };
      sub.on("message", onMessage);

      while (!signal?.aborted) {
        while (queue.length) {
          const notif = queue.shift()!;
          yield tracked(notif.id, notif);
        }
        await sleep(1_000);
      }

      sub.off("message", onMessage);
      await sub.unsubscribe(channel).finally(() => sub.disconnect());
    }),
});
