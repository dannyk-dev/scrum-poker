import { z } from "zod";
import { ScrumPointUnit } from "@prisma/client";

export const presetSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        value: z.number().int(),
        timeStart: z.number().int().nonnegative(),
        timeEnd: z.number().int().nonnegative(),
        valueStartUnit: z.nativeEnum(ScrumPointUnit),
        valueEndUnit: z.nativeEnum(ScrumPointUnit),
      }),
    )
    .min(1, "Add at least one point"),
  isDefault: z.boolean().optional(),
});

export type PresetForm = z.infer<typeof presetSchema>;
