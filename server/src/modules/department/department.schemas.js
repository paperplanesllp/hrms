import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required").trim(),
  description: z.string().optional(),
  headName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  budget: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional()
});

export const designationSchema = z.object({
  name: z.string().min(1, "Designation name is required").trim(),
  departmentId: z.string().min(1, "Department is required"),
  description: z.string().optional(),
  level: z.enum(["entry", "mid", "senior", "lead", "manager", "director"]).optional(),
  salary: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional()
});

export const designationUpdateSchema = z.object({
  id: z.string().min(1, "Designation ID is required"),
  name: z.string().min(1, "Designation name is required").trim(),
  departmentId: z.string().min(1, "Department is required"),
  description: z.string().optional(),
  level: z.enum(["entry", "mid", "senior", "lead", "manager", "director"]).optional(),
  salary: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional()
});
