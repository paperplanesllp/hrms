import mongoose from "mongoose";

const leaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // e.g., "Sick Leave", "Vacation"
    description: { type: String, default: "" }, // e.g., "For medical purposes"
    color: { type: String, default: "#3b82f6" }, // Hex color for UI display
    icon: { type: String, default: "calendar" }, // Icon name (lucide icon)
    maxDaysPerYear: { type: Number, default: 5 }, // Annual limit
    requiresApproval: { type: Boolean, default: true }, // Whether HR needs to approve
    isActive: { type: Boolean, default: true }, // Soft delete capability
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);
