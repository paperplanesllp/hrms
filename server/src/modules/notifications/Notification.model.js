import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "news", 
      "policy", 
      "reminder", 
      "system",
      // Task-specific notifications
      "task-assigned",
      "task-accepted",
      "task-rejected",
      "task-completed",
      "task-reassigned",
      "task-forwarded",
      "task-due-reminder",
      "task-overdue"
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  newsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "News"
  },
  policyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Policy"
  },
  // Task-specific field
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    default: null
  },
  // Related user (who performed the action)
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isPolicyUpdate: {
    type: Boolean,
    default: false
  },
  // Track if email was sent
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for deduplication
notificationSchema.index({ userId: 1, newsId: 1 }, { sparse: true });
notificationSchema.index({ userId: 1, policyId: 1 }, { sparse: true });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);