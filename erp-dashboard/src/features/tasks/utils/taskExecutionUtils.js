/**
 * Frontend Task Execution Utilities
 * Format and calculate task execution data for UI display
 */

/**
 * Format duration in human-readable format (e.g., "2h 30m")
 */
export function formatDuration(minutes) {
  if (minutes === 0 || !minutes) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;

  return `${hours}h ${mins}m`;
}

/**
 * Format duration in 12-hour Indian time format if needed
 */
export function formatDurationLabel(minutes) {
  if (minutes === 0 || !minutes) return 'No time tracked';
  return formatDuration(minutes);
}

/**
 * Get execution status badge styling
 */
export function getExecutionStatusStyle(status) {
  const styles = {
    not_started: {
      label: 'Not Started',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
      borderColor: 'border-slate-200',
      darkBg: 'dark:bg-slate-800',
      darkText: 'dark:text-slate-300',
      icon: '⚪'
    },
    in_progress: {
      label: 'In Progress',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      darkBg: 'dark:bg-blue-900/30',
      darkText: 'dark:text-blue-300',
      icon: '🔵'
    },
    paused: {
      label: 'Paused',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      darkBg: 'dark:bg-yellow-900/30',
      darkText: 'dark:text-yellow-300',
      icon: '⏸️'
    },
    blocked: {
      label: 'Blocked',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      darkBg: 'dark:bg-red-900/30',
      darkText: 'dark:text-red-300',
      icon: '🚫'
    },
    waiting_review: {
      label: 'Waiting Review',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
      darkBg: 'dark:bg-purple-900/30',
      darkText: 'dark:text-purple-300',
      icon: '👀'
    },
    completed: {
      label: 'Completed',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      darkBg: 'dark:bg-green-900/30',
      darkText: 'dark:text-green-300',
      icon: '✅'
    },
    completed_late: {
      label: 'Completed Late',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      darkBg: 'dark:bg-orange-900/30',
      darkText: 'dark:text-orange-300',
      icon: '⚠️'
    },
    reopened: {
      label: 'Reopened',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      darkBg: 'dark:bg-amber-900/30',
      darkText: 'dark:text-amber-300',
      icon: '🔄'
    }
  };

  return styles[status] || styles.not_started;
}

/**
 * Get due health badge styling
 */
export function getDueHealthStyle(health) {
  const styles = {
    on_track: {
      label: 'On Track',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      darkBg: 'dark:bg-green-900/30',
      darkText: 'dark:text-green-300',
      icon: '✓'
    },
    due_today: {
      label: 'Due Today',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      darkBg: 'dark:bg-yellow-900/30',
      darkText: 'dark:text-yellow-300',
      icon: '⏰'
    },
    at_risk: {
      label: 'At Risk',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      darkBg: 'dark:bg-orange-900/30',
      darkText: 'dark:text-orange-300',
      icon: '⚠️'
    },
    overdue: {
      label: 'Overdue',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      darkBg: 'dark:bg-red-900/30',
      darkText: 'dark:text-red-300',
      icon: '🔴'
    },
    completed_on_time: {
      label: 'On Time',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      darkBg: 'dark:bg-green-900/30',
      darkText: 'dark:text-green-300',
      icon: '✅'
    },
    completed_late: {
      label: 'Completed Late',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      darkBg: 'dark:bg-orange-900/30',
      darkText: 'dark:text-orange-300',
      icon: '⚠️'
    }
  };

  return styles[health] || styles.on_track;
}

/**
 * Calculate task progress percentage
 */
export function calculateProgress(totalActiveMinutes, estimatedMinutes) {
  if (!estimatedMinutes || estimatedMinutes === 0) return 0;
  return Math.min(Math.round((totalActiveMinutes / estimatedMinutes) * 100), 100);
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(progress) {
  if (progress <= 25) return 'bg-red-500';
  if (progress <= 50) return 'bg-orange-500';
  if (progress <= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Check if task is actionable (can perform actions)
 */
export function isTaskActionable(executionStatus) {
  return !['completed', 'completed_late'].includes(executionStatus);
}

/**
 * Get available actions for task
 */
export function getAvailableActions(executionStatus) {
  const actions = [];

  switch (executionStatus) {
    case 'not_started':
      actions.push('start', 'block', 'send_for_review');
      break;
    case 'in_progress':
      actions.push('pause', 'block', 'complete', 'send_for_review');
      break;
    case 'paused':
      actions.push('resume', 'block', 'complete', 'send_for_review');
      break;
    case 'blocked':
      actions.push('unblock');
      break;
    case 'waiting_review':
      actions.push('resume', 'reopen');
      break;
    case 'completed':
    case 'completed_late':
      actions.push('reopen');
      break;
    case 'reopened':
      actions.push('pause', 'block', 'complete', 'send_for_review');
      break;
  }

  return actions;
}

/**
 * Get action button label
 */
export function getActionLabel(action) {
  const labels = {
    start: 'Start Task',
    pause: 'Pause',
    resume: 'Resume',
    complete: 'Complete',
    block: 'Block',
    unblock: 'Resolve',
    send_for_review: 'Send for Review',
    reopen: 'Reopen'
  };
  return labels[action] || action;
}

/**
 * Get action button color
 */
export function getActionColor(action) {
  const colors = {
    start: 'green',
    pause: 'yellow',
    resume: 'blue',
    complete: 'green',
    block: 'red',
    unblock: 'green',
    send_for_review: 'purple',
    reopen: 'orange'
  };
  return colors[action] || 'blue';
}

/**
 * Get time estimate remaining
 */
export function getTimeRemaining(totalActiveMinutes, estimatedMinutes) {
  if (!estimatedMinutes || estimatedMinutes === 0) return null;
  const remaining = estimatedMinutes - totalActiveMinutes;
  return Math.max(0, remaining);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  if (!date) return 'Never';

  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return then.toLocaleDateString();
}

/**
 * Get activity icon for activity log
 */
export function getActivityIcon(action) {
  const icons = {
    created: '📝',
    assigned: '📌',
    started: '🚀',
    paused: '⏸️',
    resumed: '▶️',
    blocked: '🚫',
    unblocked: '🔓',
    sent_for_review: '👀',
    completed: '✅',
    reopened: '🔄',
    reassigned: '👤',
    priority_changed: '⭐',
    due_date_changed: '📅',
    status_changed: '🔄',
    comment_added: '💬'
  };
  return icons[action] || '📌';
}

/**
 * Format activity message for display
 */
export function formatActivityMessage(activityLog) {
  const { action, userName, details = {} } = activityLog;

  const messages = {
    created: `${userName} created this task`,
    assigned: `${userName} assigned this task`,
    started: `${userName} started working on this task`,
    paused: `${userName} paused this task${details.reason ? `: ${details.reason}` : ''}`,
    resumed: `${userName} resumed working on this task`,
    blocked: `${userName} blocked this task${details.reason ? `: ${details.reason}` : ''}`,
    unblocked: `${userName} resolved the blocker`,
    sent_for_review: `${userName} sent this task for review`,
    completed: `${userName} completed this task${details.isLate ? ' (late)' : ' (on time)'}`,
    reopened: `${userName} reopened this task${details.reason ? `: ${details.reason}` : ''}`,
    reassigned: `${userName} reassigned this task`,
    priority_changed: `${userName} changed priority to ${details.newValue}`,
    due_date_changed: `${userName} changed due date to ${details.newValue}`,
    status_changed: `${userName} changed status from ${details.oldValue} to ${details.newValue}`,
    comment_added: `${userName} added a comment`
  };

  return messages[action] || `${userName} performed action: ${action}`;
}

/**
 * Check if task is overdue
 */
export function isOverdue(dueDate, executionStatus) {
  if (['completed', 'completed_late'].includes(executionStatus)) return false;
  return new Date() > new Date(dueDate);
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get task status color for UI
 * Combines executionStatus and dueHealth for visual indicator
 */
export function getTaskStatusColor(executionStatus, dueHealth) {
  // Blocked tasks are always red
  if (executionStatus === 'blocked') return 'red';

  // Overdue tasks are red
  if (dueHealth === 'overdue') return 'red';

  // At risk or due today are orange/yellow
  if (dueHealth === 'at_risk' || dueHealth === 'due_today') return 'orange';

  // Completed on time is green
  if (dueHealth === 'completed_on_time') return 'green';
  if (dueHealth === 'completed_late') return 'orange';

  // Default colors based on execution status
  switch (executionStatus) {
    case 'completed':
    case 'completed_late':
      return 'green';
    case 'waiting_review':
      return 'purple';
    case 'in_progress':
      return 'blue';
    case 'paused':
      return 'yellow';
    default:
      return 'slate';
  }
}

/**
 * Get variance score (how much actual time differs from estimated)
 * Negative = finished early, Positive = took longer
 */
export function getVarianceScore(totalActiveMinutes, estimatedMinutes) {
  if (!estimatedMinutes) return null;
  return totalActiveMinutes - estimatedMinutes;
}

/**
 * Get variance percentage
 */
export function getVariancePercent(totalActiveMinutes, estimatedMinutes) {
  if (!estimatedMinutes || estimatedMinutes === 0) return null;
  return Math.round(((totalActiveMinutes - estimatedMinutes) / estimatedMinutes) * 100);
}

/**
 * Check if task is stalled (not started or inactive for long time)
 */
export function isTaskStalled(executionStatus, lastActivityAt, createdAt) {
  if (executionStatus === 'completed') return false;

  const now = new Date();
  const lastActivity = lastActivityAt ? new Date(lastActivityAt) : new Date(createdAt);
  const stalledMs = 48 * 60 * 60 * 1000; // 48 hours

  if (executionStatus === 'not_started') {
    // Not started and older than 24 hours
    return now - new Date(createdAt) > 24 * 60 * 60 * 1000;
  }

  // No activity for 48 hours
  return now - lastActivity > stalledMs;
}

/**
 * Get priority color for consistent display
 */
export function getPriorityColor(priority) {
  const colors = {
    'LOW': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'MEDIUM': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'HIGH': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'URGENT': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };
  return colors[priority] || colors.MEDIUM;
}
