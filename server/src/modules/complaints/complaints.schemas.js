import { z } from "zod";

export const createComplaintSchema = z.object({
  subject: z.string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be at most 200 characters"),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be at most 5000 characters"),
  category: z.enum(["Technical Issue", "Leave Management", "Payroll", "Attendance", "Others"])
    .optional()
    .default("Others"),
  priority: z.enum(["Low", "Medium", "High", "Urgent"])
    .optional()
    .default("Medium")
});

export const replyComplaintSchema = z.object({
  replyMessage: z.string()
    .min(5, "Reply must be at least 5 characters")
    .max(5000, "Reply must be at most 5000 characters"),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
    .optional()
    .default("RESOLVED")
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
});

export const updateSatisfactionSchema = z.object({
  satisfactionRating: z.number().min(1).max(5),
  satisfactionComment: z.string().max(1000).optional()
});
