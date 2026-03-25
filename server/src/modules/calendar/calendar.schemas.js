import { z } from "zod";

export const upsertCalendarSchema = z.object({
  date: z.string().min(10),
  shiftStart: z.string().min(4).optional(),
  shiftEnd: z.string().min(4).optional(),
  note: z.string().optional()
});