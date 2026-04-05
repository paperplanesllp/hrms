import mongoose from 'mongoose';

const subTaskSchema = new mongoose.Schema(
  {
    // Reference to parent task
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },

    // Subtask details
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    description: {
      type: String,
      trim: true,
      default: ''
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'on-hold'],
      default: 'pending',
      index: true
    },

    // Completion tracking
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    completedAt: {
      type: Date,
      default: null
    },

    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    estimatedHours: {
      type: Number,
      min: 0,
      default: 0
    },

    actualHours: {
      type: Number,
      min: 0,
      default: 0
    },

    // Order
    order: {
      type: Number,
      default: 0
    },

    // AI-generated flag
    isAIGenerated: {
      type: Boolean,
      default: false
    },

    // AI confidence score (0-1)
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },

    // Optional: dependencies
    dependsOnSubTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubTask',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Check if subtask is overdue
subTaskSchema.virtual('isOverdue').get(function() {
  return this.status !== 'completed' && this.taskId?.dueDate && new Date() > this.taskId.dueDate;
});

// Indexes
subTaskSchema.index({ taskId: 1, status: 1 });
subTaskSchema.index({ taskId: 1, order: 1 });
subTaskSchema.index({ assignedTo: 1 });
subTaskSchema.index({ createdAt: -1 });

// Query helper
subTaskSchema.query.active = function() {
  return this.where({ status: { $ne: 'cancelled' } });
};

export default mongoose.model('SubTask', subTaskSchema);
