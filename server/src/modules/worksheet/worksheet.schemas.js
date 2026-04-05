import { z } from "zod";

export const worksheetCreateSchema = z.object({
  date: z.string().min(1, "Date required"),
  task: z.string().min(1, "Task required"),
  hours: z.number().min(0).max(24),
  notes: z.string().optional(),
});

export const worksheetUpdateSchema = z.object({
  task: z.string().min(1).optional(),
  hours: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});
