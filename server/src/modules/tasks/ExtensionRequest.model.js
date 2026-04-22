import mongoose from 'mongoose';

const extensionRequestSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    requestedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },

    originalEstimatedMinutes: {
      type: Number,
      required: true,
      min: 0
    },

    additionalMinutesRequested: {
      type: Number,
      required: true,
      min: 1
    },

    additionalHoursRequested: {
      type: Number,
      default: 0,
      min: 0
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },

    approvalNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Approval notes cannot exceed 500 characters'],
      default: ''
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    rejectedAt: {
      type: Date,
      default: null
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for filtering extension requests
extensionRequestSchema.index({ taskId: 1, status: 1 });
extensionRequestSchema.index({ requestedFrom: 1, status: 1 });
extensionRequestSchema.index({ requestedBy: 1, createdAt: -1 });

const ExtensionRequest = mongoose.model('ExtensionRequest', extensionRequestSchema);

export default ExtensionRequest;
