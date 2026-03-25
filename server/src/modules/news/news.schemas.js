import { z } from "zod";

export const newsCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(5, "Body must be at least 5 characters"),
  imageUrl: z.string().optional().or(z.literal(null)).or(z.literal("")),
  publishDate: z.string().optional(),
  isPolicyUpdate: z.boolean().optional().default(false)
});

export const newsUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  body: z.string().min(5).optional(),
  imageUrl: z.string().optional().or(z.literal(null)).or(z.literal("")),
  publishDate: z.string().optional(),
  isPolicyUpdate: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional()
});