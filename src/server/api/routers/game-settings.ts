// src/server/api/routers/game-settings.ts
import { z } from "zod";
import { Prisma, PrismaClient, ScrumPointUnit } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

async function ensureSettings(db: PrismaClient, orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, gameSettingsId: true },
  });

  if (org?.gameSettingsId) return org.gameSettingsId as string;

  return await db.$transaction(async (tx: any) => {
    const gs = await tx.gameSettings.create({ data: {} });
    await tx.organization.update({
      where: { id: orgId },
      data: { gameSettingsId: gs.id },
    });
    return gs.id as string;
  });
}

const pointInput = z.object({
  id: z.string().cuid().optional(),
  value: z.number().int(),
  timeStart: z.number().int().default(0),
  timeEnd: z.number().int().default(0),
  valueUnit: z.nativeEnum(ScrumPointUnit),
  position: z.number().int().nonnegative().default(0),
});

const presetItemInput = pointInput.omit({ id: true });

export const gameSettingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settingsId = await ensureSettings(ctx.db, ctx.orgId);

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
        select: { id: true, value: true, timeStart: true, timeEnd: true, valueUnit: true, position: true },
      }),
      ctx.db.scrumPointPreset.findMany({
        where: { organizationId: ctx.org.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        select: { id: true, name: true, description: true, isDefault: true, updatedAt: true },
      }),
    ]);
    return { settings, points, presets };
  }),

  /** Update toggles and timers */
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
      const settingsId = await ensureSettings(ctx.db, ctx.orgId!);
      const data = { ...input };
      if (input.autoShowResultsTime !== undefined) {
        data.autoShowResultsTime = new Prisma.Decimal(input.autoShowResultsTime);
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

  /** SCALE: list */
  listPoints: protectedOrgProcedure.query(async ({ ctx }) => {
    const settingsId = await ensureSettings(ctx.db, ctx.org.id);
    return ctx.db.scrumPoint.findMany({
      where: { gameSettingsId: settingsId },
      orderBy: { position: "asc" },
    });
  }),

  /** SCALE: replace all (atomic) */
  replaceScale: adminOrgProcedure
    .input(z.object({ points: z.array(pointInput.omit({ id: true })) }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.org.id);
      return ctx.db.$transaction(async (tx) => {
        await tx.scrumPoint.deleteMany({ where: { gameSettingsId: settingsId } });
        if (input.points.length) {
          await tx.scrumPoint.createMany({
            data: input.points.map((p, idx) => ({
              gameSettingsId: settingsId,
              value: p.value,
              timeStart: p.timeStart ?? 0,
              timeEnd: p.timeEnd ?? 0,
              valueUnit: p.valueUnit,
              position: p.position ?? idx,
            })),
            skipDuplicates: true,
          });
        }
        return tx.scrumPoint.findMany({
          where: { gameSettingsId: settingsId },
          orderBy: { position: "asc" },
        });
      });
    }),

  /** SCALE: add one */
  addPoint: adminOrgProcedure.input(pointInput.omit({ id: true })).mutation(async ({ ctx, input }) => {
    const settingsId = await ensureSettings(ctx.db, ctx.org.id);
    const last = await ctx.db.scrumPoint.findFirst({
      where: { gameSettingsId: settingsId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    return ctx.db.scrumPoint.create({
      data: {
        gameSettingsId: settingsId,
        ...input,
        position: input.position ?? (last?.position ?? 0) + 1,
      },
    });
  }),

  /** SCALE: update one */
  updatePoint: adminOrgProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        value: z.number().int().optional(),
        timeStart: z.number().int().optional(),
        timeEnd: z.number().int().optional(),
        valueUnit: z.nativeEnum(ScrumPointUnit).optional(),
        position: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scrumPoint.update({
        where: { id: input.id },
        data: { ...input, id: undefined },
      });
    }),

  /** SCALE: remove one */
  removePoint: adminOrgProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    return ctx.db.scrumPoint.delete({ where: { id: input.id } });
  }),

  /** SCALE: reorder by ids in new order */
  reorderPoints: adminOrgProcedure
    .input(z.object({ orderedIds: z.array(z.string().cuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const updates = input.orderedIds.map((id, idx) =>
        ctx.db.scrumPoint.update({ where: { id }, data: { position: idx } }),
      );
      await Promise.all(updates);
      return { ok: true };
    }),

  /** PRESETS: list */
  listPresets: protectedOrgProcedure.query(async ({ ctx }) => {
    return ctx.db.scrumPointPreset.findMany({
      where: { organizationId: ctx.org.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, isDefault: true, updatedAt: true },
    });
  }),

  /** PRESETS: get with items */
  getPreset: protectedOrgProcedure
    .input(z.object({ presetId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scrumPointPreset.findFirst({
        where: { id: input.presetId, organizationId: ctx.org.id },
        include: { items: { orderBy: { position: "asc" } } },
      });
    }),

  /** PRESETS: create (with items) */
  createPreset: adminOrgProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        items: z.array(presetItemInput).min(1),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const preset = await tx.scrumPointPreset.create({
          data: {
            organizationId: ctx.org.id,
            name: input.name,
            description: input.description,
            isDefault: input.isDefault ?? false,
            createdByUserId: ctx.session.user.id,
          },
        });
        await tx.scrumPointPresetItem.createMany({
          data: input.items.map((it, idx) => ({
            presetId: preset.id,
            value: it.value,
            timeStart: it.timeStart ?? 0,
            timeEnd: it.timeEnd ?? 0,
            valueUnit: it.valueUnit,
            position: it.position ?? idx,
          })),
          skipDuplicates: true,
        });
        return preset;
      });
    }),

  /** PRESETS: update meta */
  updatePresetMeta: adminOrgProcedure
    .input(
      z.object({
        presetId: z.string().cuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scrumPointPreset.update({
        where: { id: input.presetId },
        data: { name: input.name, description: input.description, isDefault: input.isDefault },
        select: { id: true, name: true, description: true, isDefault: true, updatedAt: true },
      });
    }),

  /** PRESETS: replace items */
  replacePresetItems: adminOrgProcedure
    .input(z.object({ presetId: z.string().cuid(), items: z.array(presetItemInput).min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        await tx.scrumPointPresetItem.deleteMany({ where: { presetId: input.presetId } });
        await tx.scrumPointPresetItem.createMany({
          data: input.items.map((it, idx) => ({
            presetId: input.presetId,
            value: it.value,
            timeStart: it.timeStart ?? 0,
            timeEnd: it.timeEnd ?? 0,
            valueUnit: it.valueUnit,
            position: it.position ?? idx,
          })),
          skipDuplicates: true,
        });
        return { ok: true };
      });
    }),

  /** PRESETS: delete */
  deletePreset: adminOrgProcedure.input(z.object({ presetId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.scrumPointPreset.delete({ where: { id: input.presetId } });
    return { ok: true };
  }),

  /** Activate preset (link only) */
  setActivePreset: adminOrgProcedure
    .input(z.object({ presetId: z.string().cuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.org.id);
      await ctx.db.gameSettings.update({
        where: { id: settingsId },
        data: { activePresetId: input.presetId },
      });
      return { ok: true };
    }),

  /** Apply preset items to the current scale (copy items -> scrumPoints) */
  applyPresetToScale: adminOrgProcedure
    .input(z.object({ presetId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const settingsId = await ensureSettings(ctx.db, ctx.org.id);
      const items = await ctx.db.scrumPointPresetItem.findMany({
        where: { presetId: input.presetId },
        orderBy: { position: "asc" },
      });
      return ctx.db.$transaction(async (tx) => {
        await tx.scrumPoint.deleteMany({ where: { gameSettingsId: settingsId } });
        await tx.scrumPoint.createMany({
          data: items.map((it) => ({
            gameSettingsId: settingsId,
            value: it.value,
            timeStart: it.timeStart,
            timeEnd: it.timeEnd,
            valueUnit: it.valueUnit,
            position: it.position,
          })),
          skipDuplicates: true,
        });
        await tx.gameSettings.update({
          where: { id: settingsId },
          data: { activePresetId: input.presetId },
        });
        return { ok: true };
      });
    }),
});
