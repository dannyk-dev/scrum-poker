import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { getRedisClient } from "@/server/redis";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import z from "zod";

export const roomRouter = createTRPCRouter({
  getRooms: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await ctx.db.room.findMany({
      where: {
        users: {
          some: {
            userId,
          },
        },
      },
      include: {
        users: true,
        _count: true,
      },
    });
  }),
  createRoom: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const room = await db.room.create({ data: { name: input.name } });

      await ctx.db.roomUser.create({
        data: {
          role: Role.SCRUM_MASTER,
          roomId: room.id,
          userId: ctx.session.user.id,
        },
      });

      revalidatePath("/scrum-room");
      return room;
    }),
  updateRoom: protectedProcedure
    .input(z.object({ roomId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.room.update({
        where: { id: input.roomId },
        data: { name: input.name },
      });
      revalidatePath("/scrum-room");

      return room;
    }),
  deleteRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { roomId } = input;
      const room = await ctx.db.room.delete({
        where: { id: roomId },
      });

      revalidatePath("/scrum-room");
      return room;
    }),
  leaveRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { roomId } = input;

      const membership = await ctx.db.roomUser.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this room",
        });
      }

      let nextScrumMasterId: string | null = null;

      if (membership.role === Role.SCRUM_MASTER) {
        const next = await ctx.db.roomUser.findFirst({
          where: { roomId, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        });

        if (next) {
          await ctx.db.roomUser.update({
            where: { roomId_userId: { roomId, userId: next.userId } },
            data: { role: Role.SCRUM_MASTER },
          });
          nextScrumMasterId = next.userId;
        }
      }
      const redisClient = getRedisClient();

      await redisClient.publish(
        `room:${roomId}:user:leave`,
        JSON.stringify({ userId, name: ctx.session.user.name ?? "Someone", ts: Date.now() }),
      );

      await ctx.db.roomUser.delete({
        where: { roomId_userId: { roomId, userId } },
      });

      revalidatePath("/scrum-room");
      return { nextScrumMasterId };
    }),
  getRoomById: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.room.findUnique({
        where: { id: input.roomId },
        include: {
          users: {
            include: {
              user: true
            }
          },
          invitations: true,
          game: true,
        },
      });
    }),
});
