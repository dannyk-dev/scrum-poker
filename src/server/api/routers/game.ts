import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { getRedisClient } from "@/server/redis";
import { Role } from "@prisma/client";
import { tracked, TRPCError } from "@trpc/server";

const CH = {
  start: (r: string) => `room:${r}:game:start`,
  vote: (r: string) => `room:${r}:game:vote`,
  end: (r: string) => `room:${r}:game:end`,
  restart: (r: string) => `room:${r}:game:restart`,
} as const;

export type RoomEvent =
  | { type: "start"; gameId: string }
  | { type: "vote"; userId: string; value: number }
  | {
      type: "end";
      gameId: string;
      results: { userId: string; value: number }[];
    }
  | { type: "restart"; gameId: string };

type RedisEvt = {
  start: RoomEvent & { type: "start" };
  vote: RoomEvent & { type: "vote" };
  end: RoomEvent & { type: "end" };
  restart: RoomEvent & { type: "restart" };
};

async function* roomListener(roomId: string, signal: AbortSignal) {
  const sub = getRedisClient().duplicate();
  const channels = Object.values(CH).map((fn) => fn(roomId));
  await sub.subscribe(channels);

  const queue: RoomEvent[] = [];
  let wake: (() => void) | null = null;

  sub.on("message", (channel, raw) => {
    try {
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
    void sub.unsubscribe(channels).finally(() => sub.disconnect());
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

const getActiveGameWithVotes = (roomId: string) =>
  db.game.findFirst({
    where: { roomId, endedAt: null },
    include: { votes: { select: { userId: true, value: true } } },
  });


export const gameRouter = createTRPCRouter({
  snapshot: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input }) => {
      const game = await getActiveGameWithVotes(input.roomId);
      return game
        ? { gameId: game.id, votes: game.votes }
        : ({ gameId: null, votes: [] } as const);
    }),

  startGame: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      const g = await getActiveGameWithVotes(input.roomId);
      await getRedisClient().publish(
        CH.start(input.roomId),
        JSON.stringify({ gameId: g!.id }),
      );
      return g!;
    }),

  castVote: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        gameId: z.string(),
        value: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const ru = await ctx.db.roomUser.findUnique({
        where: { roomId_userId: {roomId: input.roomId, userId: ctx.session.user.id} },
        include: {
          user: true
        }
      });

      if (!ru || ru.role === Role.SCRUM_MASTER)
        throw new TRPCError({ code: "FORBIDDEN", message: "Scrum Master cannot vote" });


      await db.vote.upsert({
        where: { gameId_userId: { gameId: input.gameId, userId } },
        create: { gameId: input.gameId, userId, value: input.value },
        update: { value: input.value },
      });

      await getRedisClient().publish(
        CH.vote(input.roomId),
        JSON.stringify({ userId, value: input.value, username: ru.user.name }),
      );
      return { ok: true } as const;
    }),

  endGame: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const g = await db.game.findUnique({
        where: { id: input.gameId },
        select: { scrumMasterId: true },
      });
      if (!g || g.scrumMasterId !== userId)
        throw new TRPCError({ code: "FORBIDDEN" });

      await db.game.update({
        where: { id: input.gameId },
        data: { endedAt: new Date() },
      });
      const results = await db.vote.findMany({
        where: { gameId: input.gameId },
        select: { userId: true, value: true },
      });
      await getRedisClient().publish(
        CH.end(input.roomId),
        JSON.stringify({ gameId: input.gameId, results }),
      );
      return { ok: true, results } as const;
    }),

  restartGame: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string() }))
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
    .input(z.object({ roomId: z.string() }))
    .subscription(async function* ({ input, signal }) {
      for await (const ev of roomListener(input.roomId, signal!)) {
        const id = "ts" + Date.now().toString(36);
        yield tracked(id, ev);
      }
    }),
});
