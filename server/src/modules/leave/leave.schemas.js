import { z } from "zod";

export const createLeaveSchema = z.object({
  fromDate: z.string().min(10),
  toDate: z.string().min(10),
  leaveType: z.string().optional().default("Personal"),
  reason: z.string().optional()
});

export const updateLeaveSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  reason: z.string().optional(),
  rejectionReason: z.string().optional()
});