import z from "zod";

export const gameQuerySchema = z.object({
  gameId: z.string()
});

// export const endGameSchema = gameQuerySchema.merge(roomQuerySchema);
// export const voteSchema = endGameSchema.extend({
//   value: z.number().int().positive()
// });
