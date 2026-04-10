import { z } from "zod";
import { ROLES } from "../../middleware/roles.js";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum([ROLES.ADMIN, ROLES.HR, ROLES.USER]).optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (password) => /[A-Z]/.test(password),
      "Password must contain at least one uppercase letter"
    ),
  profileImageUrl: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),
  departmentId: z.string().optional().or(z.literal(null)),
  designationId: z.string().optional().or(z.literal(null)),
  officeLatitude: z.number().optional(),
  officeLongitude: z.number().optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  salaryBand: z.string().optional(),
  joiningDate: z.string().optional(),
  profileImageUrl: z.string().optional(),
  role: z.enum([ROLES.ADMIN, ROLES.HR, ROLES.USER]).optional(),
  officeLatitude: z.number().optional(),
  officeLongitude: z.number().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),
  departmentId: z.string().optional().or(z.literal(null)),
  designationId: z.string().optional().or(z.literal(null))
});

// Restricted schema for users updating their own profile (via PUT /api/users/me)
// Only allows safe fields: name, email, phone, and profileImageUrl
export const updateMyProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  profileImageUrl: z.string().optional()
});

export const convertTemporaryToPermanentSchema = z.object({
  employeeId: z.string().min(2, "Employee ID is required"),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  salaryBand: z.string().min(1, "Salary band is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
});