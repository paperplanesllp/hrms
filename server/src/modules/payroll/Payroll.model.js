import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    // Employee Reference
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Payroll Period
    month: { type: String, required: true }, // "2026-03"
    year: { type: Number, required: true },

    // Salary Components - Earnings
    basicSalary: { type: Number, required: true, default: 0 },
    allowances: { type: Number, default: 0 }, // Dearness allowance, HRA, etc.
    bonus: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },

    // Salary Components - Deductions
    deductions: { type: Number, default: 0 }, // PF, Insurance, etc.
    tax: { type: Number, default: 0 }, // TDS / Income Tax

    // Calculated - Auto-calculated (Basic + Allowances + Bonus + Overtime - Deductions - Tax)
    netSalary: { type: Number, default: 0 },

    // Payment Details
    paymentMethod: { 
      type: String, 
      enum: ["Bank Transfer", "UPI", "Cash in Hand", "Cheque", "Wallet", "Other"],
      default: "Bank Transfer"
    },
    customPaymentMethod: { type: String, default: "" }, // If payment method is "Other"
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "CANCELLED"], default: "PENDING" },
    paymentDate: { type: Date },

    // Metadata
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    autoDeleteOn: { type: Date }, // Auto-delete 7 days after payment

    // Legacy support (will be deprecated)
    amount: { type: Number, default: 0 },
    status: { type: String, default: "PENDING", enum: ["PENDING", "PROCESSED"] },
    note: { type: String, default: "" },
    paidOn: { type: Date }
  },
  { timestamps: true }
);

// Unique constraint: One payroll record per employee per month/year
payrollSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Index for efficient filtering
payrollSchema.index({ paymentStatus: 1, year: 1, month: 1 });
payrollSchema.index({ createdAt: -1 });

export const Payroll = mongoose.model("Payroll", payrollSchema);