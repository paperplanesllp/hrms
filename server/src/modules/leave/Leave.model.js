import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fromDate: { type: String, required: true }, // YYYY-MM-DD
    toDate: { type: String, required: true },   // YYYY-MM-DD
    leaveType: { type: String, default: "Personal" }, // Personal, Sick, Vacation, etc.
    reason: { type: String, default: "" },
    status: { type: String, default: "PENDING" }, // PENDING, APPROVED, REJECTED
    rejectionReason: { type: String, default: "" }, // HR's reason for rejection
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Leave = mongoose.model("Leave", leaveSchema);