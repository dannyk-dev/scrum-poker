import { z } from 'zod';
import { createTRPCRouter, isAuthed, protectedProcedure } from '@/server/api/trpc';
import { observable } from '@trpc/server/observable';
import { redisClient } from '@/server/redis';
import { gameFinishQueue } from '@/server/queue';
import { db } from '@/server/db';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import EventEmitter, {on} from 'node:events';

const ee = new EventEmitter();
const voteEmitter = new EventEmitter();

export const gameRouter = createTRPCRouter({
  createRoom: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const room = await db.room.create({
        data: {
          name: input.name,
        },
      });
      return room;
    }),
  invitePlayers: protectedProcedure
    .input(z.object({ roomId: z.string(), emails: z.array(z.string().email()) }))
    .mutation(async ({ input, ctx }) => {
      const invites = [];
      for (const email of input.emails) {
        const token = crypto.randomBytes(16).toString('hex');
        const invitation = await db.invitation.create({
          data: {
            roomId: input.roomId,
            email,
            token,
            invitedById: ctx.session.user.id,
          },
        });

        invites.push(invitation);
        const user = await db.user.findUnique({ where: { email } });
        const roomName = ctx.db.room.findUnique({ where: { id: input.roomId } }).then(room => room?.name || 'Unknown Room');

        if (user) {
          const notif = await db.notification.create({
            data: {
              userId: user.id,
              type: 'Invitation',
              message: `You have been invited to room '${roomName}'.`,
              data: { roomId: input.roomId, token },
            },
          });
          await redisClient.publish(`user:${user.id}:notifications`, JSON.stringify(notif));
        }
      }
      return invites;
    }),
    acceptInvite: protectedProcedure
    .input(z.object({ token: z.string(), role: z.nativeEnum(Role).optional() }))
    .mutation(async ({ input, ctx }) => {
      const invite = await db.invitation.findUnique({ where: { token: input.token } });
      if (!invite || invite.accepted) throw new Error('Invalid or already used token');
      const existing = await db.roomUser.findMany({ where: { roomId: invite.roomId } });
      const isFirst = existing.length === 0;
      if (isFirst && !input.role) {
        return { needRole: true };
      }
      const roleToAssign = isFirst ? input.role! : 'USER';
      const ru = await db.roomUser.create({ data: { roomId: invite.roomId, userId: ctx.session.user.id, role: roleToAssign } });
      await db.invitation.update({ where: { id: invite.id }, data: { accepted: true, acceptedAt: new Date() } });
      return { roomUser: ru, needRole: false };
    }),
    startGame: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ru = await db.roomUser.findUnique({ where: { roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id } }, include: { room: true } });
      if (!ru || ru.role !== 'SCRUM_MASTER') throw new Error('Only Scrum Master can start the game');
      const game = await db.game.create({ data: { roomId: input.roomId, scrumMasterId: ctx.session.user.id } });

      const participants = await db.roomUser.findMany({ where: { roomId: input.roomId } });
      for (const p of participants) {
        const notif = await db.notification.create({
          data: {
            userId: p.userId,
            type: 'GameStarted',
            message: `Game #${game.id} has started in room '${ru.room.name}'.`,
            data: { roomId: input.roomId, gameId: game.id },
          },
        });
        await redisClient.publish(`user:${p.userId}:notifications`, JSON.stringify(notif));
      }

      await redisClient.publish(`room:${input.roomId}:start`, JSON.stringify({ gameId: game.id }));
      return game;
    }),
    castVote: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string(), value: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const ru = await db.roomUser.findUnique({ where: { roomId_userId: { roomId: input.roomId, userId: ctx.session.user.id } } });
      if (!ru || ru.role !== 'USER') throw new Error('Only players can vote');
      const key = `game:${input.gameId}:votes`;
      await redisClient.hset(key, ctx.session.user.id as any);
      const voteData = { userId: ctx.session.user.id, value: input.value };
      await redisClient.publish(`room:${input.roomId}:vote`, JSON.stringify(voteData));
      voteEmitter.emit(`vote:${input.roomId}`, voteData);
      return { ok: true };
    }),
  endGame: protectedProcedure
    .input(z.object({ roomId: z.string(), gameId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const game = await db.game.findUnique({ where: { id: input.gameId } });
      if (!game || game.scrumMasterId !== ctx.session.user.id) throw new Error('Only Scrum Master can end game');
      const key = `game:${input.gameId}:votes`;
      const state = await redisClient.hgetall(key);
      await gameFinishQueue.add('game-finish', { gameId: input.gameId, state });
      await redisClient.publish(`room:${input.roomId}:end`, JSON.stringify({ gameId: input.gameId }));
      return { ok: true };
    }),
  onVote: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(async function* (opts) {
      
    }),
})
  // Subscription for game end
  .subscription('onGameEnd', {
    input: z.object({ roomId: z.number() }),
    resolve({ input }) {
      return observable<{ gameId: number }>((emit) => {
        const channel = `room:${input.roomId}:end`;
        const handler = (chan: string, msg: string) => chan === channel && emit.next(JSON.parse(msg));
        redisClient.subscribe(channel);
        redisClient.on('message', handler);
        return () => { redisClient.unsubscribe(channel); redisClient.off('message', handler); };
      });
    },
  })
  // Subscription for room start
  .subscription('onGameStart', {
    input: z.object({ roomId: z.number() }),
    resolve({ input }) {
      return observable<{ gameId: number }>((emit) => {
        const channel = `room:${input.roomId}:start`;
        const handler = (chan: string, msg: string) => chan === channel && emit.next(JSON.parse(msg));
        redisClient.subscribe(channel);
        redisClient.on('message', handler);
        return () => { redisClient.unsubscribe(channel); redisClient.off('message', handler); };
      });
    },
  })
  // Subscription for user notifications
  .subscription('onNotification', {
    resolve({ ctx }) {
      return observable)(<{ id: number; type: NotificationType; message: string; data?: any }>((emit) => {
        const channel = `user:${ctx.req.session.user.id}:notifications`;
        const handler = (_chan: string, msg: string) => emit.next(JSON.parse(msg));
        redisClient.subscribe(channel);
        redisClient.on('message', handler);
        return () => { redisClient.unsubscribe(channel); redisClient.off('message', handler); };
      });
    },
  });
