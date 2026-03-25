import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentType", required: true },
    
    // File details
    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },
    fileSize: { type: Number }, // in bytes
    fileType: { type: String }, // e.g., "application/pdf"
    
    // Submission status
    submissionStatus: {
      type: String,
      enum: ["pending", "submitted", "approved", "rejected"],
      default: "pending"
    },
    
    // Deadline tracking
    deadline: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    daysUntilDeadline: { type: Number, default: null },
    isOverdue: { type: Boolean, default: false },
    
    // Approvals/Comments
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewComments: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    
    // Notification tracking
    reminderSentCount: { type: Number, default: 0 },
    lastReminderSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Index for quick lookups
employeeDocumentSchema.index({ employeeId: 1, documentTypeId: 1 }, { unique: true });
employeeDocumentSchema.index({ submissionStatus: 1, isOverdue: 1 });
employeeDocumentSchema.index({ deadline: 1, submissionStatus: 1 });

export const EmployeeDocument = mongoose.model("EmployeeDocument", employeeDocumentSchema);
