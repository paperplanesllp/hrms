import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["Created", "Updated", "Modified", "Deleted", "Archived"],
    required: true
  },
  entity: {
    type: String,
    required: true // e.g., "Policy", "Working Hours", "Leave Request"
  },
  entityName: {
    type: String,
    required: true // Display name
  },
  changes: {
    type: String,
    required: true // Description of what changed
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ["ADMIN", "HR", "USER"],
    required: true
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
