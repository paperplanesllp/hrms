import { z } from "zod";

export const companyCreateSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  domain: z.string().trim().optional().or(z.literal("")),
  contactEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export const companyUpdateSchema = z.object({
  name: z.string().min(2, "Company name is required").optional(),
  domain: z.string().trim().optional().or(z.literal("")),
  contactEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const companyAdminCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
