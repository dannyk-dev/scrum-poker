import { z } from 'zod'

export const roomSchema = z.object({
  name: z.string().min(1)
});

export type TRoomSchema = z.infer<typeof roomSchema>;
