import { z } from "zod";
import {
  createTRPCRouter,
  isAuthed,
  protectedProcedure,
} from "@/server/api/trpc";
import { observable } from "@trpc/server/observable";
import { redisClient } from "@/server/redis";
import { gameFinishQueue } from "@/server/queue";
import { db } from "@/server/db";
import crypto from "crypto";
import { Role } from "@prisma/client";
import EventEmitter from "node:events";
import { TRPCError } from "@trpc/server";
import type { Notification } from "prisma/interfaces";

const ee = new EventEmitter();
const voteEmitter = new EventEmitter();
const gameEndEmitter = new EventEmitter();
const notificationEmitter = new EventEmitter();

export const gameRouter = createTRPCRouter({
  createRoom: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return await db.room.create({ data: { name: input.name } });
    }),

  invitePlayers: protectedProcedure
    .input(z.object({ roomId: z.string(), emails: z.array(z.string().email()) }))
    .mutation(async ({ input, ctx }) => {
      const room = await db.room.findUnique({ where: { id: input.roomId } });
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });

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
          });

          const user = await db.user.findUnique({ where: { email } });
          if (user) {
            const notif = await db.notification.create({
              data: {
                userId: user.id,
                type: "Invitation",
                message: `You have been invited to room '${room.name}'.`,
                data: { roomId: input.roomId, token },
              },
            });
            await redisClient.publish(
              `user:${user.id}:notifications`,
              JSON.stringify(notif)
            );
            // Emit WebSocket notification
            notificationEmitter.emit(`notification:${user.id}`, notif);
          }
          return invitation;
        })
      );

      return invites;
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string(), role: z.nativeEnum(Role).optional() }))
    .mutation(async ({ input, ctx }) => {
      const invite = await db.invitation.findUnique({ where: { token: input.token } });
      if (!invite || invite.accepted) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or already used token" });
      }

      const members = await db.roomUser.findMany({ where: { roomId: invite.roomId } });
      const isFirst = members.length === 0;
      if (isFirst && !input.role) return { needRole: true };

      const roleToAssign = isFirst ? input.role! : Role.USER;
      const roomUser = await db.roomUser.create({
        data: {
          roomId: invite.roomId,
          userId: ctx.session.user.id,
          role: roleToAssign,
        },
      });

      await db.invitation.update({
        where: { id: invite.id },
        data: { accepted: true, acceptedAt: new Date() },
      });

      return { roomUser, needRole: false };
    }),

  // --- GAME LIFECYCLE ---
  startGame: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ru = await db.roomUser.findUnique({
        where: { roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id } },
        include: { room: true },
      });
      if (!ru || ru.role !== Role.SCRUM_MASTER) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Scrum Master can start the game" });
      }

      const game = await db.game.create({ data: { roomId: input.roomId, scrumMasterId: ctx.session.user.id } });

      const participants = await db.roomUser.findMany({ where: { roomId: input.roomId } });
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
          await redisClient.publish(`user:${p.userId}:notifications`, JSON.stringify(notif));
          // Emit WebSocket notification
          notificationEmitter.emit(`notification:${p.userId}`, notif);
        })
      );

      // Emit in-room event
      gameEndEmitter.emit(`start:${input.roomId}`, { gameId: game.id });
      return game;
    }),

  castVote: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string(), value: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const ru = await db.roomUser.findUnique({
        where: { roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id } },
      });
      if (!ru || ru.role !== Role.USER) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only players can vote" });
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
      const game = await db.game.findUnique({ where: { id: input.gameId } });
      if (!game || game.scrumMasterId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Scrum Master can end game" });
      }

      const state = await redisClient.hgetall(`game:${input.gameId}:votes`);
      await gameFinishQueue.add("game-finish", { gameId: input.gameId, state });

      // Emit end in-room event
      gameEndEmitter.emit(`end:${input.roomId}`, { gameId: input.gameId });
      return { ok: true };
    }),

  // --- SUBSCRIPTIONS ---
  onVote: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) =>
      observable<{ userId: number; value: number }>((emit) => {
        const handler = (data: { userId: number; value: number }) => emit.next(data);
        voteEmitter.on(`vote:${input.roomId}`, handler);
        return () => voteEmitter.off(`vote:${input.roomId}`, handler);
      })
    ),

  onGameEnd: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) =>
      observable<{ gameId: number }>((emit) => {
        const handler = (data: { gameId: number }) => emit.next(data);
        gameEndEmitter.on(`end:${input.roomId}`, handler);
        return () => gameEndEmitter.off(`end:${input.roomId}`, handler);
      })
    ),

  onNotification: protectedProcedure
    .subscription(({ ctx }) =>
      observable<Notification>((emit) => {
        const handler = (notif: Notification) => emit.next(notif);
        notificationEmitter.on(`notification:${ctx.session.user.id}`, handler);
        return () => notificationEmitter.off(`notification:${ctx.session.user.id}`, handler);
      })
    ),
});
