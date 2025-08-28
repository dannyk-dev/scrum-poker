/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/server/api/routers/game-settings.ts
import { z } from "zod";
import { Prisma, type PrismaClient, ScrumPointUnit } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

/** Ensure org settings exist and return id (1 query via upsert on unique organizationId). */
async function ensureSettings(
  db: PrismaClient,
  orgId: string,
): Promise<string> {
  const gs = await db.gameSettings.upsert({
    where: { organizationId: orgId },
    update: {},
    create: { organizationId: orgId },
    select: { id: true },
  });

  return gs.id;
}

const pointInput = z.object({
  id: z.string().cuid().optional(),
  value: z.number().int(),
  timeStart: z.number().int().nonnegative(),
  timeEnd: z.number().int().nonnegative(),
  valueStartUnit: z.nativeEnum(ScrumPointUnit),
  valueEndUnit: z.nativeEnum(ScrumPointUnit),
  position: z.number().int().nonnegative().default(0),
});

const presetItemInput = pointInput.omit({ id: true });

export const gameSettingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);

    const [settings, points, presets] = await Promise.all([
      ctx.db.gameSettings.findUnique({
        where: { id: settingsId },
        select: {
          id: true,
          autoShowResults: true,
          autoShowResultsTime: true,
          onlyScrumMasterCanShowResults: true,
          lockVotes: true,
          notifyOnVote: true,
          notifyOnJoin: true,
          persistentLeave: true,
          activePresetId: true,
          activePreset: { select: { id: true, name: true } },
        },
      }),
      ctx.db.scrumPoint.findMany({
        where: { gameSettingsId: settingsId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          value: true,
          timeStart: true,
          timeEnd: true,

          valueStartUnit: true,
          valueEndUnit: true,
          position: true,
        },
      }),
      ctx.db.scrumPointPreset.findMany({
        where: { organizationId: ctx.orgId! },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          updatedAt: true,
        },
      }),
    ]);

    return { settings, points, presets };
  }),

  /** Update toggles and timers. */
  update: protectedProcedure
    .input(
      z.object({
        autoShowResults: z.boolean().optional(),
        autoShowResultsTime: z.number().nonnegative().optional(),
        onlyScrumMasterCanShowResults: z.boolean().optional(),
        lockVotes: z.boolean().optional(),
        notifyOnVote: z.boolean().optional(),
        notifyOnJoin: z.boolean().optional(),
        persistentLeave: z.boolean().optional(),
        activePresetId: z.string().cuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
      const data = { ...input };

      if (input.autoShowResultsTime !== undefined) {
        // @ts-expect-error
        data.autoShowResultsTime = new Prisma.Decimal(
          input.autoShowResultsTime,
        );
      }
      return ctx.db.gameSettings.update({
        where: { id: settingsId },
        data,
        select: {
          id: true,
          autoShowResults: true,
          autoShowResultsTime: true,
          onlyScrumMasterCanShowResults: true,
          lockVotes: true,
          notifyOnVote: true,
          notifyOnJoin: true,
          persistentLeave: true,
          activePresetId: true,
        },
      });
    }),

  /* ───────────── Scale (ScrumPoints) ───────────── */

  listPoints: protectedProcedure.query(async ({ ctx }) => {
    const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
    return ctx.db.scrumPoint.findMany({
      where: { gameSettingsId: settingsId },
      orderBy: { position: "asc" },
    });
  }),

  /** Replace entire scale atomically. */
  replaceScale: protectedProcedure
    .input(z.object({ points: z.array(pointInput.omit({ id: true })) }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
      return ctx.db.$transaction(async (tx) => {
        await tx.scrumPoint.deleteMany({
          where: { gameSettingsId: settingsId },
        });

        if (input.points.length) {
          await tx.scrumPoint.createMany({
            data: input.points.map((p, i) => ({
              gameSettingsId: settingsId,
              value: p.value,
              timeStart: p.timeStart ?? 0,
              timeEnd: p.timeEnd ?? 0,
              valueStartUnit: p.valueStartUnit,
              valueEndUnit: p.valueEndUnit,
              position: p.position ?? i,
            })),
          });
        }
        return tx.scrumPoint.findMany({
          where: { gameSettingsId: settingsId },
          orderBy: { position: "asc" },
        });
      });
    }),

  addPoint: protectedProcedure
    .input(pointInput.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
      const last = await ctx.db.scrumPoint.findFirst({
        where: { gameSettingsId: settingsId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      return ctx.db.scrumPoint.create({
        data: {
          gameSettingsId: settingsId,
          value: input.value,
          timeStart: input.timeStart ?? 0,
          timeEnd: input.timeEnd ?? 0,
          valueStartUnit: input.valueStartUnit,
          valueEndUnit: input.valueEndUnit,
          position: input.position ?? (last?.position ?? -1) + 1,
        },
      });
    }),

  updatePoint: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        value: z.number().int().optional(),
        timeStart: z.number().int().nonnegative().optional(),
        timeEnd: z.number().int().nonnegative().optional(),
        valueStartUnit: z.nativeEnum(ScrumPointUnit).optional(),
        valueEndUnit: z.nativeEnum(ScrumPointUnit).optional(),
        position: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.scrumPoint.update({ where: { id }, data });
    }),

  removePoint: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.scrumPoint.delete({ where: { id: input.id } });
      return { ok: true as const };
    }),

  reorderPoints: protectedProcedure
    .input(z.object({ orderedIds: z.array(z.string().cuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, idx) =>
          ctx.db.scrumPoint.update({ where: { id }, data: { position: idx } }),
        ),
      );
      return { ok: true as const };
    }),
  listPresets: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.scrumPointPreset.findMany({
      where: { organizationId: ctx.orgId! },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        isDefault: true,
        updatedAt: true,
      },
    });
  }),

  getPreset: protectedProcedure
    .input(z.object({ presetId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scrumPointPreset.findFirst({
        where: { id: input.presetId, organizationId: ctx.orgId! },
        include: { items: { orderBy: { position: "asc" } } },
      });
    }),

  createPreset: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        isDefault: z.boolean().optional(),
        items: z.array(presetItemInput).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const preset = await tx.scrumPointPreset.create({
          data: {
            organizationId: ctx.orgId!,
            name: input.name,
            description: input.description,
            isDefault: input.isDefault ?? false,
            createdByUserId: ctx.session.user.id,
          },
          select: { id: true, name: true },
        });
        await tx.scrumPointPresetItem.createMany({
          data: input.items.map((it, i) => ({
            presetId: preset.id,
            value: it.value,
            timeStart: it.timeStart ?? 0,
            timeEnd: it.timeEnd ?? 0,
            valueStartUnit: it.valueStartUnit,
            valueEndUnit: it.valueEndUnit,
            position: it.position ?? i,
          })),
        });
        return preset;
      });
    }),
  clearScale: protectedProcedure.mutation(async ({ ctx }) => {
    const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
    await ctx.db.scrumPoint.deleteMany({
      where: { gameSettingsId: settingsId },
    });
    return { ok: true as const };
  }),
  updatePresetMeta: protectedProcedure
    .input(
      z.object({
        presetId: z.string().cuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { presetId, ...data } = input;
      return ctx.db.scrumPointPreset.update({
        where: { id: presetId },
        data,
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          updatedAt: true,
        },
      });
    }),

  replacePresetItems: protectedProcedure
    .input(
      z.object({
        presetId: z.string().cuid(),
        items: z.array(presetItemInput).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        await tx.scrumPointPresetItem.deleteMany({
          where: { presetId: input.presetId },
        });
        await tx.scrumPointPresetItem.createMany({
          data: input.items.map((it, i) => ({
            presetId: input.presetId,
            value: it.value,
            timeStart: it.timeStart ?? 0,
            timeEnd: it.timeEnd ?? 0,
            valueStartUnit: it.valueStartUnit,
            valueEndUnit: it.valueEndUnit,
            position: it.position ?? i,
          })),
        });
      });
      return { ok: true as const };
    }),

  deletePreset: protectedProcedure
    .input(z.object({ presetId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.scrumPointPreset.delete({ where: { id: input.presetId } });
      return { ok: true as const };
    }),

  setActivePreset: protectedProcedure
    .input(z.object({ presetId: z.string().cuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
      await ctx.db.gameSettings.update({
        where: { id: settingsId },
        data: { activePresetId: input.presetId },
      });
      return { ok: true as const };
    }),

  applyPresetToScale: protectedProcedure
    .input(z.object({ presetId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.orgId as string);
      const items = await ctx.db.scrumPointPresetItem.findMany({
        where: { presetId: input.presetId },
        orderBy: { position: "asc" },
        select: {
          value: true,
          timeStart: true,
          timeEnd: true,
          valueStartUnit: true,
          valueEndUnit: true,
          position: true,
        },
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.scrumPoint.deleteMany({
          where: { gameSettingsId: settingsId },
        });
        if (items.length) {
          await tx.scrumPoint.createMany({
            data: items.map((it) => ({
              gameSettingsId: settingsId,
              value: it.value,
              timeStart: it.timeStart,
              timeEnd: it.timeEnd,
              valueStartUnit: it.valueStartUnit,
              valueEndUnit: it.valueEndUnit,
              position: it.position,
            })),
          });
        }
        await tx.gameSettings.update({
          where: { id: settingsId },
          data: { activePresetId: input.presetId },
        });
      });

      return { ok: true as const };
    }),
});
