import mongoose from "mongoose";

const extensionRequestSchema = new mongoose.Schema(
  {
    worksheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worksheet",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskName: String, // Task being requested for extension
    originalHours: Number, // Original estimated hours (e.g., 2.5)
    requestedHours: Number, // New requested hours (e.g., 3.5)
    additionalHoursNeeded: Number, // Difference (e.g., 1)
    reason: String, // Why the extension is needed
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalReason: String, // HR/Admin's reason for approval/rejection
    requestedAt: { type: Date, default: Date.now },
    approvedAt: Date,
    workDate: String, // Date of the work (YYYY-MM-DD)
  },
  { timestamps: true }
);

// Indexes for quick queries
extensionRequestSchema.index({ userId: 1, status: 1 });
extensionRequestSchema.index({ status: 1 }); // For HR/Admin dashboard
extensionRequestSchema.index({ workDate: 1 }); // For date-based filtering

export const ExtensionRequest = mongoose.model(
  "ExtensionRequest",
  extensionRequestSchema
);
