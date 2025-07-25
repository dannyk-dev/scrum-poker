import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { getRedisClient } from "@/server/redis";
import { type PrismaClient, Role } from "@prisma/client";
import { tracked, TRPCError } from "@trpc/server";
import { endGameSchema, roomQuerySchema, voteSchema } from "@/lib/schemas";
import type { Game } from "prisma/interfaces";
import type { IEndGameResponse, IGameSnapshot } from "@/lib/types/game.types";

const CH = {
  start: (r: string) => `room:${r}:game:start`,
  vote: (r: string) => `room:${r}:game:vote`,
  end: (r: string) => `room:${r}:game:end`,
  restart: (r: string) => `room:${r}:game:restart`,
} as const;

export type RoomEvent =
  | { type: "start"; gameId: string }
  | { type: "vote"; userId: string; value: number; username: string }
  | { type: "end"; gameId: string; results: { userId: string; value: number }[]; estimate: number }
  | { type: "restart"; gameId: string };

async function* roomListener(roomId: string, signal: AbortSignal) {
  const sub = getRedisClient().duplicate();
  const channels = Object.values(CH).map((fn) => fn(roomId));
  await sub.subscribe(...channels);

  const queue: RoomEvent[] = [];
  let wake: (() => void) | null = null;

  sub.on("message", (channel, raw) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = JSON.parse(raw);
      const type = Object.keys(CH).find(
        (k) => CH[k as keyof typeof CH](roomId) === channel,
      ) as keyof typeof CH;
      if (!type) return;
      queue.push({ type, ...payload } as RoomEvent);
      wake?.();
    } catch {
      /* ignore */
    }
  });

  signal.addEventListener("abort", () => {
    void sub.unsubscribe(...channels).finally(() => sub.disconnect());
    wake?.();
  });

  while (!signal.aborted) {
    if (queue.length) {
      yield queue.shift()!;
      continue;
    }
    await new Promise<void>((r) => (wake = r));
    wake = null;
  }
}

const getActiveGameWithVotes = async (
  ctxDb: PrismaClient,
  roomId: string,
): Promise<Game | null> => {
  return (await ctxDb.game.findFirst({
    where: { roomId, endedAt: null },
    include: { votes: { select: { userId: true, value: true } } },
  })) as Game;
};

export const gameRouter = createTRPCRouter({
  snapshot: protectedProcedure
    .input(roomQuerySchema)
    .query(async ({ ctx, input }): Promise<IGameSnapshot> => {
      const game = await getActiveGameWithVotes(ctx.db, input.roomId);
      return game
        ? { gameId: game.id, votes: game.votes }
        : ({ gameId: null, votes: [] } as const);
    }),

  startGame: protectedProcedure
    .input(roomQuerySchema)
    .mutation(async ({ ctx, input }): Promise<Game> => {
      const userId = ctx.session.user.id;
      const membership = await db.roomUser.findUnique({
        where: { roomId_userId: { roomId: input.roomId, userId } },
        select: { role: true },
      });
      if (membership?.role !== Role.SCRUM_MASTER)
        throw new TRPCError({ code: "FORBIDDEN" });

      await db.$transaction([
        db.game.updateMany({
          where: { roomId: input.roomId, endedAt: null },
          data: { endedAt: new Date() },
        }),
        db.game.create({
          data: { roomId: input.roomId, scrumMasterId: userId },
        }),
      ]);

      const g = await getActiveGameWithVotes(ctx.db, input.roomId);
      await getRedisClient().publish(
        CH.start(input.roomId),
        JSON.stringify({ gameId: g!.id }),
      );
      return g!;
    }),

  castVote: protectedProcedure
    .input(voteSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const ru = await ctx.db.roomUser.findUnique({
        where: {
          roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id },
        },
        include: {
          user: true,
        },
      });

      if (!ru || ru.role === Role.SCRUM_MASTER)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Scrum Master cannot vote",
        });

      await db.vote.upsert({
        where: { gameId_userId: { gameId: input.gameId, userId } },
        create: { gameId: input.gameId, userId, value: input.value },
        update: { value: input.value },
      });

      await getRedisClient().publish(
        CH.vote(input.roomId),
        JSON.stringify({
          userId,
          value: input.value,
          username: ctx.session.user.name,
        }),
      );
      return { ok: true } as const;
    }),

  endGame: protectedProcedure
    .input(endGameSchema)
    .mutation(async ({ ctx, input }): Promise<IEndGameResponse> => {
      const userId = ctx.session.user.id;

      const game = await db.game.findUnique({
        where: { id: input.gameId },
        select: { scrumMasterId: true },
      });
      if (!game || game.scrumMasterId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: 'Only the scrum master can vote' });

      await db.game.update({
        where: { id: input.gameId },
        data: { endedAt: new Date() },
      });

      const votes = await db.vote.findMany({
        where: { gameId: input.gameId },
        include: { user: { select: { id: true, name: true } } },
      });

      const deck: number[] = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];
      const nums: number[] = votes.map((v) => v.value).sort((a, b) => a - b);

      const median: number = nums.length
        ? (nums[Math.floor((nums.length - 1) / 2)] ?? 0)
        : 0;

      const estimate: number = deck.reduce<number>(
        (closest, card) =>
          Math.abs(card - median) < Math.abs(closest - median) ? card : closest,
        deck[0],
      );

      const slimResults = votes.map((v) => ({
        userId: v.userId,
        value: v.value,
      }));

      // ‑‑‑ Publish event
      await getRedisClient().publish(
        CH.end(input.roomId),
        JSON.stringify({
          type: "end",
          gameId: input.gameId,
          results: slimResults,
          estimate,
        }),
      );

      return { ok: true, results: slimResults, estimate };
    }),

  restartGame: protectedProcedure
    .input(endGameSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const g = await db.game.findUnique({
        where: { id: input.gameId },
        select: { scrumMasterId: true },
      });
      if (!g || g.scrumMasterId !== userId)
        throw new TRPCError({ code: "FORBIDDEN" });

      await db.vote.deleteMany({ where: { gameId: input.gameId } });
      await getRedisClient().publish(
        CH.restart(input.roomId),
        JSON.stringify({ gameId: input.gameId }),
      );
      return { ok: true } as const;
    }),

  roomEvents: protectedProcedure
    .input(roomQuerySchema)
    .subscription(async function* ({ input, signal }) {
      for await (const ev of roomListener(input.roomId, signal!)) {
        const id = "ts" + Date.now().toString(36);
        yield tracked(id, ev);
      }
    }),
});
