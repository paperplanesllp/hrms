import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    // Basic Info
    title: { 
      type: String, 
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: ''
    },

    // Assignment (supports multiple assignees)
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }],

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Department (optional)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },

    // Task Status & Priority
    status: {
      type: String,
      enum: ['new', 'pending', 'in-progress', 'on-hold', 'under-review', 'completed', 'overdue', 'cancelled'],
      default: 'new',
      index: true
    },

    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true
    },

    // Dates
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true
    },

    completedAt: {
      type: Date,
      default: null
    },

    // Workload & Performance
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

    // Metadata
    tags: {
      type: [String],
      default: []
    },

    attachments: {
      type: [String],
      default: []
    },

    // Progress Tracking
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // Subtasks
    subtasks: [{
      _id: mongoose.Schema.Types.ObjectId,
      title: String,
      completed: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }],

    // Activity & Comments
    comments: [{
      _id: mongoose.Schema.Types.ObjectId,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      text: String,
      createdAt: { type: Date, default: Date.now }
    }],

    // Task forwarding history
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    forwardedAt: {
      type: Date,
      default: null
    },

    // Reassignment tracking
    reassignedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    reassignedAt: {
      type: Date,
      default: null
    },

    // Recurrence (optional)
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      default: null
    },
    recurringUntil: { type: Date, default: null },

    // Relations
    parentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },

    // Reminders
    reminders: [{
      reminderAt: Date,
      sent: { type: Boolean, default: false }
    }],

    // Productivity metrics
    completedOnTime: {
      type: Boolean,
      default: null
    },

    daysOverdue: {
      type: Number,
      default: 0
    },

    // Deleted (soft delete)
    isDeleted: { type: Boolean, default: false, index: true },

    // Notification tracking
    isOverdueNotified: { type: Boolean, default: false },

    // Task acceptance/rejection tracking
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ""
    },

    // === TIMER TRACKING ===
    startedAt: { type: Date, default: null },
    currentSessionStartTime: { type: Date, default: null },
    totalActiveTimeInSeconds: { type: Number, default: 0, min: 0 },
    totalPausedTimeInSeconds: { type: Number, default: 0, min: 0 },
    isRunning: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    pauseEntries: [{
      reason: { type: String, required: true, trim: true },
      pausedAt: { type: Date, required: true },
      resumedAt: { type: Date, default: null },
      pausedDurationInSeconds: { type: Number, default: 0 }
    }],

    // === WORKFLOW MANAGEMENT ===
    // Hold reason (when status = ON_HOLD)
    holdReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Hold reason cannot exceed 1000 characters'],
      default: null
    },

    // Reassignment history tracking
    reassignedHistory: [{
      previousAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      previousAssigneeName: {
        type: String,
        required: true
      },
      newAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      newAssigneeName: {
        type: String,
        required: true
      },
      reassignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      reason: {
        type: String,
        trim: true,
        maxlength: [1000, 'Reason cannot exceed 1000 characters'],
        default: ''
      },
      reassignedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Check if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  return this.status !== 'completed' && new Date() > this.dueDate;
});

// Virtual: Days until due
taskSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Indexes for efficient queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });
taskSchema.index({ department: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

// Query helper to exclude deleted tasks
taskSchema.query.active = function() {
  return this.where({ isDeleted: false });
};

export const Task = mongoose.model('Task', taskSchema);
