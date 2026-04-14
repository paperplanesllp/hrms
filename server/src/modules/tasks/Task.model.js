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
      enum: ['new', 'pending', 'in-progress', 'paused', 'on-hold', 'due-soon', 'under-review', 'extension_requested', 'completed', 'overdue', 'extended', 'rejected', 'cancelled'],
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
    dueAt: {
      type: Date,
      default: null,
      index: true
    },

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

    estimatedMinutes: {
      type: Number,
      min: 0,
      default: 0
    },

    pausedDurationMs: {
      type: Number,
      min: 0,
      default: 0
    },

    pausedDurationMinutes: {
      type: Number,
      min: 0,
      default: 0
    },

    timingState: {
      type: String,
      enum: ['not_started', 'in_progress', 'paused', 'completed', 'overdue'],
      default: 'not_started',
      index: true
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
    thirtyMinReminderSent: { type: Boolean, default: false },
    fifteenMinReminderSent: { type: Boolean, default: false },
    dueNowReminderSent: { type: Boolean, default: false },
    overdueReminderSent: { type: Boolean, default: false },

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

    // Extension workflow
    taskExtended: {
      type: Boolean,
      default: false
    },
    extendedTimeMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    extensionCount: {
      type: Number,
      min: 0,
      default: 0
    },
    extensionHistory: [{
      addedMinutes: { type: Number, required: true, min: 1 },
      previousDueAt: { type: Date, required: true },
      newDueAt: { type: Date, required: true },
      remarks: { type: String, required: true, trim: true },
      extendedAt: { type: Date, default: Date.now },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    }],

    extensionRequests: [{
      requestedTimeMinutes: { type: Number, required: true, min: 1 },
      requestRemarks: { type: String, required: true, trim: true },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      requestedAt: { type: Date, default: Date.now },
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      rejectedAt: { type: Date, default: null },
      rejectionReason: { type: String, trim: true, default: '' }
    }],

    requestedTime: {
      type: Number,
      min: 0,
      default: 0
    },
    requestRemarks: {
      type: String,
      trim: true,
      default: ''
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    },
    approvalStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },

    // Structured remarks history
    remarks: [{
      type: {
        type: String,
        enum: ['extension', 'rejection', 'note'],
        required: true
      },
      text: { type: String, required: true, trim: true },
      addedAt: { type: Date, default: Date.now },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    }],

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
  if (!this.startedAt) return false;
  if (['completed', 'rejected', 'cancelled'].includes(this.status)) return false;

  const due = this.dueAt || this.dueDate;
  if (!due) return false;
  return new Date() > new Date(due);
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
