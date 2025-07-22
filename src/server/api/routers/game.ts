import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { getRedisClient } from "@/server/redis";
import { db } from "@/server/db";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { tracked } from "@trpc/server";
import { sleep } from "@/lib/utils";

/**
 * Channel helpers -----------------------------------------------------------
 */
const ch = {
  gameStart: (roomId: string) => `room:${roomId}:game:start`,
  vote: (roomId: string) => `room:${roomId}:vote`,
  gameEnd: (roomId: string) => `room:${roomId}:game:end`,
  gameRestart: (roomId: string) => `room:${roomId}:game:restart`,
};

/**
 * Utility: create a dedicated Redis subscriber that auto‑disconnects on abort
 */
const makeSub = async (
  channel: string,
  signal: AbortSignal,
  onMessage: (raw: string) => void,
) => {
  const sub = getRedisClient();
  await sub.subscribe(channel);
  sub.on("message", (_c, raw) => onMessage(raw));
  signal.addEventListener("abort", () => {
    sub.off("message", onMessage);
    void sub.unsubscribe(channel).finally(() => void sub.disconnect());
  });
  return sub;
};

export const gameRouter = createTRPCRouter({
  startGame: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { roomId } = input;

      const ru = await db.roomUser.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!ru || ru.role !== Role.SCRUM_MASTER) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.game.updateMany({
        where: { roomId, endedAt: null },
        data: { endedAt: new Date() },
      });

      const game = await db.game.create({
        data: { roomId, scrumMasterId: userId },
      });

      await getRedisClient().publish(ch.gameStart(roomId), JSON.stringify({ gameId: game.id }));

      return game;
    }),
  castVote: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string(), value: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { roomId, gameId, value } = input;

      const ru = await db.roomUser.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!ru || ru.role !== Role.USER) throw new TRPCError({ code: "FORBIDDEN" });

      await db.vote.upsert({
        where: { gameId_userId: { gameId, userId } },
        create: { gameId, userId, value },
        update: { value },
      });

      await getRedisClient().hset(`game:${gameId}:votes`, userId, value);

      await getRedisClient().publish(ch.vote(roomId), JSON.stringify({ userId, value }));

      return { ok: true };
    }),
  endGame: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { roomId, gameId } = input;

      const game = await db.game.findUnique({ where: { id: gameId } });
      if (!game || game.scrumMasterId !== userId) throw new TRPCError({ code: "FORBIDDEN" });

      // Mark ended
      await db.game.update({ where: { id: gameId }, data: { endedAt: new Date() } });

      // Gather votes from DB (authoritative)
      const votes = await db.vote.findMany({
        where: { gameId },
        select: { userId: true, value: true },
      });

      await getRedisClient().publish(ch.gameEnd(roomId), JSON.stringify({ gameId, results: votes }));

      // Clear redis hash – optional housekeeping
      await getRedisClient().del(`game:${gameId}:votes`);

      return { ok: true, results: votes };
    }),

  /**
   * Allows Scrum‑Master to restart the same game (clears votes, keeps same id).
   */
  restartGame: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { roomId, gameId } = input;

      const game = await db.game.findUnique({ where: { id: gameId } });
      if (!game || game.scrumMasterId !== userId) throw new TRPCError({ code: "FORBIDDEN" });

      // Delete votes DB + Redis
      await db.vote.deleteMany({ where: { gameId } });
      await getRedisClient().del(`game:${gameId}:votes`);

      await getRedisClient().publish(ch.gameRestart(roomId), JSON.stringify({ gameId }));
      return { ok: true };
    }),

  /** ---------------------------------------------------------------------
   * Subscriptions (v12 async‑generator w/ tracked for resumability)
   * --------------------------------------------------------------------*/

  onGameStart: protectedProcedure
    .input(z.object({ roomId: z.string(), lastEventId: z.string().nullish() }))
    .subscription(async function* ({ ctx, input, signal }) {
      const { roomId, lastEventId } = input;
      let lastId = lastEventId ?? null;

      // Catch‑up: all games with id > lastId
      const past = await db.game.findMany({
        where: { roomId, ...(lastId && { id: { gt: lastId } }) },
        orderBy: { createdAt: "asc" },
      });
      for (const g of past) {
        yield tracked(g.id, { gameId: g.id });
        lastId = g.id;
      }

      // Live
      const queue: { gameId: string }[] = [];
      await makeSub(ch.gameStart(roomId), signal, (raw) => {
        try {
          const ev = JSON.parse(raw) as { gameId: string };
          if (ev.gameId !== lastId) queue.push(ev);
        } catch {}
      });

      while (!signal.aborted) {
        while (queue.length) {
          const ev = queue.shift()!;
          yield tracked(ev.gameId, ev);
          lastId = ev.gameId;
        }
        await sleep(100);
      }
    }),

  onVote: protectedProcedure
    .input(z.object({ roomId: z.string(), lastEventId: z.string().nullish() }))
    .subscription(async function* ({ input, signal }) {
      const { roomId, lastEventId } = input;
      let lastId = lastEventId ?? null;

      const queue: { userId: string; value: number }[] = [];
      await makeSub(ch.vote(roomId), signal, (raw) => {
        try { queue.push(JSON.parse(raw)); } catch {}
      });

      while (!signal.aborted) {
        while (queue.length) {
          const v = queue.shift()!;
          const eventId = `${v.userId}-${Date.now()}`;
          if (eventId !== lastId) {
            yield tracked(eventId, v);
            lastId = eventId;
          }
        }
        await sleep(100);
      }
    }),

  onGameEnd: protectedProcedure
    .input(z.object({ roomId: z.string(), lastEventId: z.string().nullish() }))
    .subscription(async function* ({ ctx, input, signal }) {
      const { roomId, lastEventId } = input;
      let lastId = lastEventId ?? null;

      // Catch‑up ended games with id > lastId
      const past = await db.game.findMany({
        where: { roomId, endedAt: { not: null }, ...(lastId && { id: { gt: lastId } }) },
        orderBy: { endedAt: "asc" },
        include: { votes: { select: { userId: true, value: true } } },
      });
      for (const g of past) {
        yield tracked(g.id, { gameId: g.id, results: g.votes });
        lastId = g.id;
      }

      // Live
      const queue: { gameId: string; results: { userId: string; value: number }[] }[] = [];
      await makeSub(ch.gameEnd(roomId), signal, (raw) => {
        try {
          const ev = JSON.parse(raw);
          if (ev.gameId !== lastId) queue.push(ev);
        } catch {}
      });

      while (!signal.aborted) {
        while (queue.length) {
          const ev = queue.shift()!;
          yield tracked(ev.gameId, ev);
          lastId = ev.gameId;
        }
        await sleep(100);
      }
    }),

  onGameRestart: protectedProcedure
    .input(z.object({ roomId: z.string(), lastEventId: z.string().nullish() }))
    .subscription(async function* ({ input, signal }) {
      const { roomId, lastEventId } = input;
      let lastId = lastEventId ?? null;

      const queue: { gameId: string }[] = [];
      await makeSub(ch.gameRestart(roomId), signal, (raw) => {
        try {
          const ev = JSON.parse(raw) as { gameId: string };
          if (ev.gameId !== lastId) queue.push(ev);
        } catch {}
      });

      while (!signal.aborted) {
        while (queue.length) {
          const ev = queue.shift()!;
          yield tracked(ev.gameId, ev);
          lastId = ev.gameId;
        }
        await sleep(100);
      }
    }),
});
