import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // Actor (who performed the action)
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["ADMIN", "HR", "USER"],
      required: true,
      index: true,
    },

    // Target (what was affected - optional)
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetUserName: {
      type: String,
      default: null,
    },

    // Action details
    actionType: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "PROFILE_UPDATE",
        "CONTACT_UPDATE",
        "DOCUMENT_UPLOAD",
        "LEAVE_REQUEST",
        "LEAVE_APPROVAL",
        "LEAVE_REJECTION",
        "ATTENDANCE_CHECKIN",
        "ATTENDANCE_CHECKOUT",
        "EMPLOYEE_CREATE",
        "EMPLOYEE_UPDATE",
        "EMPLOYEE_DELETE",
        "HR_ACTION",
        "ADMIN_ACTION",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    // Module/Category
    module: {
      type: String,
      enum: ["AUTH", "PROFILE", "LEAVE", "ATTENDANCE", "EMPLOYEE", "DOCUMENT", "ADMIN", "OTHER"],
      required: true,
      index: true,
    },

    // Human-readable description
    description: {
      type: String,
      required: true,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Request information
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },

    // Visibility/filtering
    visibility: {
      type: String,
      enum: ["PUBLIC", "HR_ONLY", "ADMIN_ONLY", "PRIVATE"],
      default: "PUBLIC",
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actorRole: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });
activityLogSchema.index({ visibility: 1, createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
