import mongoose from 'mongoose';

const taskHistorySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },

    // Who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Type of action
    action: {
      type: String,
      enum: [
        'created',
        'assigned',
        'reassigned',
        'forwarded',
        'status_changed',
        'priority_changed',
        'progress_updated',
        'completed',
        'hold',
        'on_hold',
        'commented',
        'attachment_added',
        'deleted'
      ],
      required: true
    },

    // Previous values (for tracking changes)
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // New values
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Additional info about the action
    details: {
      type: String,
      default: ''
    },

    // For reassignment/forward tracking
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // IP address for audit trail
    ipAddress: {
      type: String,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: 'timestamp',
      updatedAt: false
    }
  }
);

// Indexes
taskHistorySchema.index({ taskId: 1, timestamp: -1 });
taskHistorySchema.index({ performedBy: 1 });
taskHistorySchema.index({ action: 1 });
taskHistorySchema.index({ taskId: 1, action: 1 });

export default mongoose.model('TaskHistory', taskHistorySchema);
