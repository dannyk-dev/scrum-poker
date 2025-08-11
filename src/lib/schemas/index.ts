import z from 'zod';


export * from './players.schema';
export * from './room.schema'

export const roomQuerySchema = z.object({
  roomId: z.string()
});

export const gameQuerySchema = z.object({
  gameId: z.string()
});

export const endGameSchema = gameQuerySchema.merge(roomQuerySchema);
export const voteSchema = endGameSchema.extend({
  value: z.number().refine((val) => val >= 0)
});
