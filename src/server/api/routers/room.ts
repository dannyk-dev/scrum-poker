import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { Role } from "@prisma/client";
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
        const {roomId} = input;
        const room = await ctx.db.room.delete({
            where: {id: roomId}
          })


        revalidatePath('/scrum-room');
        return room;
      }),
    getRoomById: protectedProcedure
      .input(z.object({ roomId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await ctx.db.room.findUnique({
          where: { id: input.roomId },
          include: {
            users: true,
            invitations: true,
            game: true,
          },
        });
      }),
})
