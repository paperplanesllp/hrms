import mongoose from 'mongoose';

const employeeProductivitySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    // Task Statistics
    totalTasks: {
      type: Number,
      default: 0
    },

    completedTasks: {
      type: Number,
      default: 0
    },

    pendingTasks: {
      type: Number,
      default: 0
    },

    overdueTasks: {
      type: Number,
      default: 0
    },

    inProgressTasks: {
      type: Number,
      default: 0
    },

    onHoldTasks: {
      type: Number,
      default: 0
    },

    // Performance Metrics
    completionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    onTimeCompletionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    averageCompletionTime: {
      type: Number,
      default: 0 // in hours
    },

    // Workload Status
    currentWorkload: {
      type: String,
      enum: ['light', 'normal', 'heavy', 'overloaded'],
      default: 'normal'
    },

    assignedTasksCount: {
      type: Number,
      default: 0
    },

    // Productivity Score (0-100)
    productivityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // Metrics calculated daily/weekly
    dailyTasksCompleted: {
      type: Number,
      default: 0
    },

    weeklyTasksCompleted: {
      type: Number,
      default: 0
    },

    // Performance trend
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    },

    // Last updated
    lastCalculatedAt: {
      type: Date,
      default: Date.now
    },

    // Historical data for analytics
    scoreHistory: [{
      date: Date,
      score: Number,
      completedTasks: Number,
      overdueTasks: Number
    }],

    // Department for comparison
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Calculate productivity score
productivitySchema.methods.calculateScore = function() {
  if (this.totalTasks === 0) return 0;
  
  const completionScore = (this.completedTasks / this.totalTasks) * 50;
  const onTimeScore = this.onTimeCompletionRate * 0.3;
  const workloadScore = (1 - Math.min(this.overdueTasks / Math.max(1, this.totalTasks), 1)) * 20;
  
  return Math.round(completionScore + onTimeScore + workloadScore);
};

// Determine workload status
employeeProductivitySchema.methods.determineWorkload = function() {
  const totalAssigned = this.totalTasks;
  const completed = this.completedTasks;
  const pending = this.pendingTasks;
  const overdue = this.overdueTasks;

  const workloadRatio = pending / Math.max(1, completed);
  const overdueRatio = overdue / Math.max(1, totalAssigned);

  if (overdueRatio > 0.2 || workloadRatio > 3) {
    
    return 'overloaded';
  } else if (workloadRatio > 2) {
    return 'heavy';
  } else if (workloadRatio > 1) {
    return 'normal';
  } else {
    return 'light';
  }
};

// Indexes
employeeProductivitySchema.index({ completionRate: -1 });
employeeProductivitySchema.index({ productivityScore: -1 });
employeeProductivitySchema.index({ department: 1 });
employeeProductivitySchema.index({ lastCalculatedAt: -1 });

export default mongoose.model('EmployeeProductivity', employeeProductivitySchema);
