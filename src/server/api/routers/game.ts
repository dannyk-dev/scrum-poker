import { z } from "zod";
import {
  createTRPCRouter,
  isAuthed,
  protectedProcedure,
} from "@/server/api/trpc";
import { observable } from "@trpc/server/observable";
import { getRedisClient } from "@/server/redis";
import { db } from "@/server/db";

import { Role } from "@prisma/client";
import EventEmitter, { on } from "node:events";
import { tracked, TRPCError } from "@trpc/server";
import type { Notification, RoomUser } from "prisma/interfaces";
import { revalidatePath } from "next/cache";

type EventMap<T> = Record<keyof T, any[]>;
class IterableEventEmitter<T extends EventMap<T>> extends EventEmitter<T> {
  toIterable<TEventName extends keyof T & string>(
    eventName: TEventName,
    opts?: NonNullable<Parameters<typeof on>[2]>,
  ): AsyncIterable<T[TEventName]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return on(this as any, eventName, opts) as any;
  }
}


export interface InviteEvents {
  onNotification: [notification: Notification]
}

const ee = new EventEmitter();
const voteEmitter = new EventEmitter();
const gameEndEmitter = new EventEmitter();
// const notificationEmitter = new EventEmitter();




export const gameRouter = createTRPCRouter({
  // --- GAME LIFECYCLE ---
  startGame: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redisClient = getRedisClient();
      const ru = await db.roomUser.findUnique({
        where: {
          roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id },
        },
        include: { room: true },
      });
      if (!ru || ru.role !== Role.SCRUM_MASTER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Scrum Master can start the game",
        });
      }

      const game = await db.game.create({
        data: { roomId: input.roomId, scrumMasterId: ctx.session.user.id },
      });

      const participants = await db.roomUser.findMany({
        where: { roomId: input.roomId },
      });
      await Promise.all(
        participants.map(async (p) => {
          const notif = await db.notification.create({
            data: {
              userId: p.userId,
              type: "GameStarted",
              message: `Game #${game.id} has started in room '${ru.room.name}'.`,
              data: { roomId: input.roomId, gameId: game.id },
            },
          });
          await redisClient.publish(
            `user:${p.userId}:notifications`,
            JSON.stringify(notif),
          );

        }),
      );

      // Emit in-room event
      gameEndEmitter.emit(`start:${input.roomId}`, { gameId: game.id });
      return game;
    }),

  castVote: protectedProcedure
    .input(
      z.object({ roomId: z.string(), gameId: z.string(), value: z.number() }),
    )
    .mutation(async ({ input, ctx }) => {
      const redisClient = getRedisClient();
      const ru = await db.roomUser.findUnique({
        where: {
          roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id },
        },
      });
      if (!ru || ru.role !== Role.USER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only players can vote",
        });
      }

      const key = `game:${input.gameId}:votes`;
      await redisClient.hset(key, ctx.session.user.id);

      const vote = { userId: ctx.session.user.id, value: input.value };
      voteEmitter.emit(`vote:${input.roomId}`, vote);
      return { ok: true };
    }),

  endGame: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redisClient = getRedisClient();
      const game = await db.game.findUnique({ where: { id: input.gameId } });
      if (!game || game.scrumMasterId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Scrum Master can end game",
        });
      }

      const state = await redisClient.hgetall(`game:${input.gameId}:votes`);

      gameEndEmitter.emit(`end:${input.roomId}`, { gameId: input.gameId });
      return { ok: true };
    }),
  getNotifications: protectedProcedure.query(({ ctx }) => {
    return ctx.db.notification.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          include: {
            invitations: true,
          }
        }
      }
    });
  }),


  // --- SUBSCRIPTIONS ---
  onVote: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) =>
      observable<{ userId: number; value: number }>((emit) => {
        const handler = (data: { userId: number; value: number }) =>
          emit.next(data);
        voteEmitter.on(`vote:${input.roomId}`, handler);
        return () => voteEmitter.off(`vote:${input.roomId}`, handler);
      }),
    ),

  onGameEnd: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) =>
      observable<{ gameId: number }>((emit) => {
        const handler = (data: { gameId: number }) => emit.next(data);
        gameEndEmitter.on(`end:${input.roomId}`, handler);
        return () => gameEndEmitter.off(`end:${input.roomId}`, handler);
      }),
    ),


});
