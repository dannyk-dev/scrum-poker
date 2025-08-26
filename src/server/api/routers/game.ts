/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/server/api/routers/game.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PrismaClient, Role, ScrumPointUnit } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getRedisClient } from "@/server/redis";
import { endGameSchema, roomQuerySchema, voteSchema } from "@/lib/schemas";
import type { IEndGameResponse, IGameSnapshot } from "@/lib/types/game.types";
import type { RoomEvent } from "@/lib/types/events.types";
import { tracked } from "@trpc/server";

/* channels */
const CH = {
  start: (r: string) => `room:${r}:game:start`,
  vote: (r: string) => `room:${r}:game:vote`,
  end: (r: string) => `room:${r}:game:end`,
  restart: (r: string) => `room:${r}:game:restart`,
} as const;

/* redis listener */
async function* roomListener(roomId: string, signal: AbortSignal) {
  const sub = getRedisClient().duplicate();
  const channels = Object.values(CH).map((fn) => fn(roomId));
  await sub.subscribe(...channels);

  const queue: RoomEvent[] = [];
  let wake: (() => void) | null = null;

  sub.on("message", (channel, raw) => {
    try {
      const payload = JSON.parse(raw) as Record<string, unknown>;
      const type = (Object.keys(CH) as (keyof typeof CH)[]).find(
        (k) => CH[k](roomId) === channel,
      );
      if (!type) return;
      queue.push({ type, ...payload } as RoomEvent);
      wake?.();
    } catch {}
  });

  const cleanup = () =>
    void sub.unsubscribe(...channels).finally(() => sub.disconnect());
  signal.addEventListener("abort", () => {
    cleanup();
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

/* helpers */
async function ensureSettings(db: PrismaClient, orgId: string): Promise<string> {
  const existing = await db.gameSettings.findUnique({
    where: { organizationId: orgId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.$transaction(async (tx) => {
    const gs = await tx.gameSettings.create({ data: { organizationId: orgId } });
    return gs.id;
  });
  return created;
}

async function resolveScrumPointId(
  db: PrismaClient,
  orgId: string,
  value: number,
): Promise<string> {
  const gsId = await ensureSettings(db, orgId);

  const found = await db.scrumPoint.findFirst({
    where: { gameSettingsId: gsId, value },
    select: { id: true },
  });
  if (found) return found.id;

  const last = await db.scrumPoint.findFirst({
    where: { gameSettingsId: gsId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const created = await db.scrumPoint.create({
    data: {
      gameSettingsId: gsId,
      value,
      timeStart: 0,
      timeEnd: 0,
      valueUnit: ScrumPointUnit.HOUR,
      position: (last?.position ?? -1) + 1,
    },
    select: { id: true },
  });
  return created.id;
}

async function getScaleValues(db: PrismaClient, orgId: string): Promise<number[]> {
  const gsId = await ensureSettings(db, orgId);
  const pts = await db.scrumPoint.findMany({
    where: { gameSettingsId: gsId },
    orderBy: { position: "asc" },
    select: { value: true },
  });
  
  return pts.length ? pts.map((p) => p.value) : [1, 2, 3, 5, 8, 13, 20, 40, 100];
}

async function getActiveGameWithVotes(db: PrismaClient, roomId: string) {
  return db.game.findFirst({
    where: { roomId, endedAt: null },
    include: {
      votes: {
        select: { userId: true, scrumPoint: { select: { value: true } } },
      },
    },
  });
}

/* router */
export const gameRouter = createTRPCRouter({
  snapshot: protectedProcedure
    .input(roomQuerySchema)
    .query(async ({ ctx, input }): Promise<IGameSnapshot> => {
      const room = await ctx.db.room.findFirst({
        where: { id: input.roomId, organizationId: ctx.orgId! },
        select: { id: true },
      });
      if (!room) throw new TRPCError({ code: "FORBIDDEN" });

      const game = await getActiveGameWithVotes(ctx.db, input.roomId);
      return game
        ? {
            gameId: game.id,
            votes: game.votes.map((v) => ({
              userId: v.userId,
              value: v.scrumPoint?.value ?? 0,
            })),
          }
        : ({ gameId: null, votes: [] } as const);
    }),

  startGame: protectedProcedure
    .input(roomQuerySchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const membership = await ctx.db.roomUser.findUnique({
        where: { roomId_userId: { roomId: input.roomId, userId } },
        select: { role: true, room: { select: { organizationId: true } } },
      });
      if (!membership || membership.room.organizationId !== ctx.orgId!)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (membership.role !== Role.SCRUM_MASTER)
        throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.$transaction([
        ctx.db.game.updateMany({
          where: { roomId: input.roomId, endedAt: null },
          data: { endedAt: new Date() },
        }),
        ctx.db.game.create({
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
        where: { roomId_userId: { roomId: input.roomId, userId } },
        select: { role: true, room: { select: { organizationId: true } } },
      });
      if (!ru || ru.room.organizationId !== ctx.orgId!)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (ru.role === Role.SCRUM_MASTER)
        throw new TRPCError({ code: "FORBIDDEN", message: "Scrum Master cannot vote" });

      const scrumPointId = await resolveScrumPointId(
        ctx.db as PrismaClient,
        ctx.orgId,
        input.value,
      );

      await ctx.db.vote.upsert({
        where: { gameId_userId: { gameId: input.gameId, userId } },
        create: { gameId: input.gameId, userId, scrumPointId },
        update: { scrumPointId },
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

      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: {
          scrumMasterId: true,
          room: { select: { organizationId: true } },
        },
      });
      if (!game || game.scrumMasterId !== userId || game.room.organizationId !== ctx.orgId!)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the scrum master can end the game",
        });

      await ctx.db.game.update({
        where: { id: input.gameId },
        data: { endedAt: new Date() },
      });

      const votes = await ctx.db.vote.findMany({
        where: { gameId: input.gameId },
        include: { scrumPoint: { select: { value: true } }, user: true },
      });

      const values = votes
        .map((v) => v.scrumPoint?.value ?? 0)
        .filter((v) => v > 0)
        .sort((a, b) => a - b);

      const median = (values.length
        ? values[Math.floor((values.length - 1) / 2)]
        : 0) as number;

      const deck = await getScaleValues(ctx.db as PrismaClient, ctx.orgId);
      const estimate = deck.reduce<number>(
        (closest, card) =>
          Math.abs(card - median) < Math.abs(closest - median) ? card : closest,
        deck[0]!,
      );

      const slimResults = votes.map((v) => ({
        userId: v.userId,
        value: v.scrumPoint?.value ?? 0,
      }));

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

      const g = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: {
          scrumMasterId: true,
          room: { select: { organizationId: true } },
        },
      });
      if (!g || g.scrumMasterId !== userId || g.room.organizationId !== ctx.orgId)
        throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.vote.deleteMany({ where: { gameId: input.gameId } });
      await getRedisClient().publish(
        CH.restart(input.roomId),
        JSON.stringify({ gameId: input.gameId }),
      );
      return { ok: true } as const;
    }),

  roomEvents: protectedProcedure
    .input(roomQuerySchema)
    .subscription(async function* ({ ctx, input, signal }) {
      const ok = await ctx.db.room.findFirst({
        where: { id: input.roomId, organizationId: ctx.orgId! },
        select: { id: true },
      });
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });

      for await (const ev of roomListener(input.roomId, signal!)) {
        const id = "ts" + Date.now().toString(36);
        yield tracked(id, ev);
      }
    }),
});
