import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
  name: z.string()
});
export type Health = z.infer<typeof HealthSchema>;