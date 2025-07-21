import z from "zod";

export const invitePlayerSchema = z.object({
  emails: z.array(z.string().email())
});

export type TInvitePlayerSchema = z.infer<typeof invitePlayerSchema>;
