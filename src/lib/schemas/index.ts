import z from 'zod';

export * from './game.schema';
export * from './players.schema';
export * from './room.schema'

export const roomQuerySchema = z.object({
  roomId: z.string()
});
