import z from "zod";

export const createLeaveTypeSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  description: z.string().max(200).default(""),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#3b82f6"),
  icon: z.string().max(50).default("calendar"),
  maxDaysPerYear: z.number().int().min(1).max(365).default(5),
  requiresApproval: z.boolean().default(true)
});

export const updateLeaveTypeSchema = z.object({
  name: z.string().min(2).max(50).trim().optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
  maxDaysPerYear: z.number().int().min(1).max(365).optional(),
  requiresApproval: z.boolean().optional(),
  isActive: z.boolean().optional()
});
