import { z } from "zod";

// Validation for creating/updating payroll records
export const upsertPayrollSchema = z.object({
  userId: z.string().min(10, "Invalid user ID"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"), // e.g., "2026-03"
  year: z.number().int().min(2000).max(2099, "Invalid year"),
  
  // Salary Components
  basicSalary: z.number().nonnegative("Basic salary must be non-negative").default(0),
  allowances: z.number().nonnegative("Allowances must be non-negative").default(0),
  bonus: z.number().nonnegative("Bonus must be non-negative").default(0),
  overtimePay: z.number().nonnegative("Overtime pay must be non-negative").default(0),
  
  // Deductions
  deductions: z.number().nonnegative("Deductions must be non-negative").default(0),
  tax: z.number().nonnegative("Tax must be non-negative").default(0),
  
  // Calculated fields
  netSalary: z.number().nonnegative().default(0),
  
  // Payment Details
  paymentMethod: z.enum(["Bank Transfer", "UPI", "Cash in Hand", "Cheque", "Wallet", "Other"]).default("Bank Transfer"),
  customPaymentMethod: z.string().optional().default(""),
  paymentStatus: z.enum(["PENDING", "PAID", "CANCELLED"]).default("PENDING"),
  paymentDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()).optional(),
  
  // Metadata
  notes: z.string().optional().default(""),
  
  // Legacy fields (for backward compatibility)
  amount: z.number().nonnegative().optional(),
  status: z.enum(["PENDING", "PROCESSED"]).optional(),
  note: z.string().optional(),
  paidOn: z.date().optional()
}).transform(data => {
  // Auto-calculate net salary if not provided
  if (!data.netSalary || data.netSalary === 0) {
    data.netSalary = data.basicSalary + data.allowances + data.bonus + data.overtimePay - data.deductions - data.tax;
  }
  
  // For backward compatibility: set amount from netSalary
  if (!data.amount) {
    data.amount = data.netSalary;
  }
  
  return data;
});

// Schema for batch payroll generation
export const bulkPayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  year: z.number().int(),
  payrolls: z.array(upsertPayrollSchema)
});

// Schema for payment status update
export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["PENDING", "PAID", "CANCELLED"]),
  paymentDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()).optional(),
  paymentMethod: z.enum(["Bank Transfer", "UPI", "Cash in Hand", "Cheque", "Wallet", "Other"]).optional(),
  customPaymentMethod: z.string().optional()
});