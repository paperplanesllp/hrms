/**
 * Task Execution Tracking Utilities
 * Provides core calculations and state management for task execution tracking
 */

/**
 * Calculate task progress percentage based on active minutes vs estimated
 */
export function calculateTaskProgress(task) {
  if (!task.estimatedMinutes || task.estimatedMinutes === 0) {
    return 0;
  }
  const percentage = (task.totalActiveMinutes / task.estimatedMinutes) * 100;
  return Math.min(Math.round(percentage), 100);
}

/**
 * Calculate total active minutes (all sessions combined)
 */
export function calculateActiveMinutes(sessions = []) {
  return sessions.reduce((total, session) => {
    if (session.endedAt && session.startedAt) {
      const durationMs = new Date(session.endedAt) - new Date(session.startedAt);
      total += Math.floor(durationMs / (1000 * 60));
    }
    return total;
  }, 0);
}

/**
 * Calculate total paused minutes (all pauses combined)
 */
export function calculatePausedMinutes(pauses = []) {
  return pauses.reduce((total, pause) => {
    if (pause.resumedAt && pause.pausedAt) {
      const durationMs = new Date(pause.resumedAt) - new Date(pause.pausedAt);
      total += Math.floor(durationMs / (1000 * 60));
    }
    return total;
  }, 0);
}

/**
 * Calculate idle time (time between assignment and first start)
 */
export function calculateIdleMinutes(createdAt, startedAt) {
  if (!startedAt || !createdAt) return 0;
  const idleMs = new Date(startedAt) - new Date(createdAt);
  return Math.floor(idleMs / (1000 * 60));
}

/**
 * Calculate total lifecycle duration
 */
export function calculateLifecycleDuration(createdAt, completedAt) {
  if (!completedAt || !createdAt) return null;
  const durationMs = new Date(completedAt) - new Date(createdAt);
  return Math.floor(durationMs / (1000 * 60));
}

/**
 * Check if task is overdue based on dueDate and executionStatus
 */
export function isTaskOverdue(dueDate, executionStatus) {
  // Completed tasks can't be overdue
  if (executionStatus === 'completed' || executionStatus === 'completed_late') {
    return false;
  }

  const now = new Date();
  const due = new Date(dueDate);
  return now > due;
}

/**
 * Calculate days until due
 */
export function getDaysUntilDue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Determine due health status
 * Consider: due date, execution status, completion time
 */
export function getDueHealth(task) {
  const daysUntilDue = getDaysUntilDue(task.dueDate);
  const isOverdue = isTaskOverdue(task.dueDate, task.executionStatus);

  // Already completed - check if on time or late
  if (task.executionStatus === 'completed' || task.executionStatus === 'completed_late') {
    if (!task.completedAt) return 'completed_on_time'; // Fallback

    const completedDate = new Date(task.completedAt);
    const dueDate = new Date(task.dueDate);

    return completedDate <= dueDate ? 'completed_on_time' : 'completed_late';
  }

  // Not started yet - check if due today or coming soon
  if (task.executionStatus === 'not_started') {
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue === 0) return 'due_today';
    if (daysUntilDue <= 2) return 'at_risk';
    return 'on_track';
  }

  // In progress or paused - check timeline
  if (isOverdue) return 'overdue';
  if (daysUntilDue === 0) return 'due_today';
  if (daysUntilDue <= 2) return 'at_risk';

  return 'on_track';
}

/**
 * Estimate time remaining for completion
 * Based on estimated minutes, active minutes, and estimated completion rate
 */
export function getEstimatedTimeRemaining(task) {
  if (!task.estimatedMinutes || task.estimatedMinutes === 0) {
    return null;
  }

  const remainingMinutes = task.estimatedMinutes - task.totalActiveMinutes;
  return Math.max(0, remainingMinutes);
}

/**
 * Get variance between estimated and actual time
 * Negative = finished early, Positive = took longer
 */
export function getEstimateVariance(task) {
  if (!task.completedAt || !task.estimatedMinutes) {
    return null;
  }

  const variance = task.totalActiveMinutes - task.estimatedMinutes;
  return variance;
}

/**
 * Get variance percentage
 */
export function getEstimateVariancePercent(task) {
  if (!task.completedAt || !task.estimatedMinutes || task.estimatedMinutes === 0) {
    return null;
  }

  const variancePercent = ((task.totalActiveMinutes - task.estimatedMinutes) / task.estimatedMinutes) * 100;
  return Math.round(variancePercent);
}

/**
 * Determine if task is blocked
 */
export function isTaskBlocked(blockers = []) {
  return blockers.some(blocker => blocker.status === 'active');
}

/**
 * Get active blockers
 */
export function getActiveBlockers(blockers = []) {
  return blockers.filter(blocker => blocker.status === 'active');
}

/**
 * Calculate time blocked (all blockers combined)
 */
export function calculateBlockedMinutes(blockers = []) {
  return blockers.reduce((total, blocker) => {
    if (blocker.unblockedAt && blocker.blockedAt) {
      const durationMs = new Date(blocker.unblockedAt) - new Date(blocker.blockedAt);
      total += Math.floor(durationMs / (1000 * 60));
    }
    return total;
  }, 0);
}

/**
 * Get task execution summary for display
 */
export function getTaskExecutionSummary(task) {
  const progress = calculateTaskProgress(task);
  const dueHealth = getDueHealth(task);
  const isBlocked = isTaskBlocked(task.blockers);
  const timeRemaining = getEstimatedTimeRemaining(task);
  const variance = getEstimateVariance(task);
  const variancePercent = getEstimateVariancePercent(task);
  const idleMinutes = task.startedAt ? calculateIdleMinutes(task.createdAt, task.startedAt) : null;

  return {
    executionStatus: task.executionStatus,
    dueHealth,
    progress,
    isBlocked,
    activeBlockers: getActiveBlockers(task.blockers),
    totalActiveMinutes: task.totalActiveMinutes,
    totalPausedMinutes: task.totalPausedMinutes,
    totalIdleMinutes: idleMinutes,
    timeRemaining,
    variance,
    variancePercent,
    sessionCount: task.sessions?.length || 0,
    pauseCount: task.pauses?.length || 0,
    blockerCount: task.blockers?.length || 0,
    activityLogCount: task.activityLog?.length || 0
  };
}

/**
 * Get task analytics for manager dashboard
 */
export function getTaskAnalytics(task) {
  const summary = getTaskExecutionSummary(task);
  const lifecycleDuration = task.completedAt 
    ? calculateLifecycleDuration(task.createdAt, task.completedAt)
    : null;

  return {
    ...summary,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    lastActivityAt: task.lastActivityAt,
    completedAt: task.completedAt,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    priority: task.priority,
    assignedTo: task.assignedTo,
    lifecycleDuration,
    daysSinceCreation: Math.floor((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24)),
    daysUntilDue: getDaysUntilDue(task.dueDate)
  };
}

/**
 * Add activity log entry
 */
export function addActivityLogEntry(task, action, user, details = {}) {
  if (!task.activityLog) {
    task.activityLog = [];
  }

  const entry = {
    _id: new (require('mongoose').Types.ObjectId)(),
    action,
    user: user._id,
    userName: user.name || user.email,
    timestamp: new Date(),
    details
  };

  task.activityLog.push(entry);
  return entry;
}

/**
 * Start a new work session
 */
export function startWorkSession(task, currentTime = new Date()) {
  if (!task.sessions) {
    task.sessions = [];
  }

  const session = {
    _id: new (require('mongoose').Types.ObjectId)(),
    startedAt: currentTime,
    endedAt: null,
    durationMinutes: 0,
    isActive: true
  };

  task.sessions.push(session);
  task.lastActivityAt = currentTime;

  return session;
}

/**
 * End active work session
 */
export function endWorkSession(task, currentTime = new Date()) {
  if (!task.sessions || task.sessions.length === 0) {
    return null;
  }

  const activeSession = task.sessions.find(s => s.isActive);
  if (!activeSession) {
    return null;
  }

  activeSession.endedAt = currentTime;
  activeSession.isActive = false;
  activeSession.durationMinutes = Math.floor((currentTime - new Date(activeSession.startedAt)) / (1000 * 60));

  // Update total active minutes
  task.totalActiveMinutes = calculateActiveMinutes(task.sessions);
  task.lastActivityAt = currentTime;

  return activeSession;
}

/**
 * Add pause entry
 */
export function addPause(task, reason = 'No reason provided', currentTime = new Date()) {
  if (!task.pauses) {
    task.pauses = [];
  }

  const pause = {
    _id: new (require('mongoose').Types.ObjectId)(),
    reason,
    pausedAt: currentTime,
    resumedAt: null,
    durationMinutes: 0
  };

  task.pauses.push(pause);
  task.lastActivityAt = currentTime;

  return pause;
}

/**
 * Resume from pause
 */
export function resumeFromPause(task, currentTime = new Date()) {
  if (!task.pauses || task.pauses.length === 0) {
    return null;
  }

  const activePause = task.pauses.find(p => !p.resumedAt);
  if (!activePause) {
    return null;
  }

  activePause.resumedAt = currentTime;
  activePause.durationMinutes = Math.floor((currentTime - new Date(activePause.pausedAt)) / (1000 * 60));

  // Update total paused minutes
  task.totalPausedMinutes = calculatePausedMinutes(task.pauses);
  task.lastActivityAt = currentTime;

  return activePause;
}

/**
 * Add blocker
 */
export function addBlocker(task, reason, currentTime = new Date()) {
  if (!task.blockers) {
    task.blockers = [];
  }

  const blocker = {
    _id: new (require('mongoose').Types.ObjectId)(),
    reason,
    blockedAt: currentTime,
    unblockedAt: null,
    unblocker: null,
    status: 'active'
  };

  task.blockers.push(blocker);
  task.lastActivityAt = currentTime;
  task.executionStatus = 'blocked';

  return blocker;
}

/**
 * Resolve blocker
 */
export function resolveBlocker(task, blockerId, unblockerUser, currentTime = new Date()) {
  if (!task.blockers) {
    return null;
  }

  const blocker = task.blockers.find(b => b._id.toString() === blockerId.toString());
  if (!blocker) {
    return null;
  }

  blocker.unblockedAt = currentTime;
  blocker.unblocker = unblockerUser._id;
  blocker.status = 'resolved';

  task.lastActivityAt = currentTime;

  return blocker;
}

/**
 * Calculate overdue duration in minutes
 */
export function calculateOverdueDuration(dueDate, currentTime = new Date()) {
  const due = new Date(dueDate);
  if (currentTime <= due) {
    return 0;
  }

  const overdueMs = currentTime - due;
  return Math.floor(overdueMs / (1000 * 60));
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(minutes) {
  if (minutes === 0 || !minutes) return '0 mins';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;

  return `${hours}h ${mins}m`;
}

/**
 * Format duration for display with details
 */
export function formatDurationWithDetails(minutes) {
  if (minutes === 0 || !minutes) return { display: '0 mins', hours: 0, minutes: 0 };

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  let display = '';
  if (hours > 0) display += `${hours}h `;
  display += `${mins}m`;

  return {
    display: display.trim(),
    hours,
    minutes: mins,
    total: minutes
  };
}

/**
 * Get execution status label
 */
export function getExecutionStatusLabel(status) {
  const labels = {
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'paused': 'Paused',
    'blocked': 'Blocked',
    'waiting_review': 'Waiting Review',
    'completed': 'Completed',
    'completed_late': 'Completed Late',
    'reopened': 'Reopened'
  };
  return labels[status] || status;
}

/**
 * Get due health label
 */
export function getDueHealthLabel(health) {
  const labels = {
    'on_track': 'On Track',
    'due_today': 'Due Today',
    'at_risk': 'At Risk',
    'overdue': 'Overdue',
    'completed_on_time': 'Completed On Time',
    'completed_late': 'Completed Late'
  };
  return labels[health] || health;
}

/**
 * Get execution status color for UI
 */
export function getExecutionStatusColor(status) {
  const colors = {
    'not_started': 'slate',
    'in_progress': 'blue',
    'paused': 'yellow',
    'blocked': 'red',
    'waiting_review': 'purple',
    'completed': 'green',
    'completed_late': 'orange',
    'reopened': 'amber'
  };
  return colors[status] || 'slate';
}

/**
 * Get due health color for UI
 */
export function getDueHealthColor(health) {
  const colors = {
    'on_track': 'green',
    'due_today': 'yellow',
    'at_risk': 'orange',
    'overdue': 'red',
    'completed_on_time': 'green',
    'completed_late': 'orange'
  };
  return colors[health] || 'slate';
}
