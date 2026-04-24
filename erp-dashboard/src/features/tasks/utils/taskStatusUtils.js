/**
 * Premium Task Status Logic & Utilities
 * Handles realistic, analytics-safe task status display
 * 
 * Key Rules:
 * - Completed tasks NEVER show "Due" or deadline messaging
 * - Analytics separates completed/overdue/active tasks
 * - All times displayed in IST 12-hour format
 * - Smart UX prioritizes completion info over deadline info
 */

import { formatISTDateTime } from '../../../lib/dateTimeUtils.js';
import { calculateRemainingTime, formatToIST, getTaskDueDisplay } from './taskDeadlineUtils.js';

// ========================================
// TIMING STATE HELPERS
// ========================================

/**
 * Get the timing state of a task
 * @param {Object} task - Task object
 * @returns {string} - 'completed' | 'overdue' | 'due-today' | 'due-soon' | 'upcoming' | 'no-deadline'
 */
export const getTaskTimingState = (task) => {
  const remaining = calculateRemainingTime(task);

  // Rule 1: If completed, return completed state (never overdue/due)
  if (task.status === 'completed' && task.completedAt) {
    return 'completed';
  }

  // Rule 2: If task is completed but missing completedAt
  if (task.status === 'completed') {
    return 'completed';
  }

  if (!remaining.shouldTrackDeadline || !remaining.effectiveDueAt) {
    return 'no-deadline';
  }

  const diffMs = remaining.remainingMs;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  // Rule 4: Overdue (not completed, due date passed)
  if (diffMs < 0 && task.status !== 'completed') {
    return 'overdue';
  }

  // Rule 5: Due today
  if (diffDays === 0 && diffMs > 0) {
    return 'due-today';
  }

  // Rule 6: Due tomorrow
  if (diffDays === 1) {
    return 'due-tomorrow-soon';
  }

  // Rule 7: Due soon (within 3 days)
  if (diffDays > 1 && diffDays <= 3) {
    return 'due-soon';
  }

  // Rule 8: Upcoming (more than 3 days away)
  return 'upcoming';
};

// ========================================
// COMPLETION STATE HELPERS
// ========================================

/**
 * Get completion state - compares completedAt with dueDateTime
 * @param {Object} task - Task object
 * @returns {string} - 'on-time' | 'late' | 'early' | 'no-due-date' | 'not-completed'
 */
export const getCompletionState = (task) => {
  if (task.status !== 'completed' || !task.completedAt) {
    return 'not-completed';
  }

  const remaining = calculateRemainingTime(task);
  const dueTime = remaining.effectiveDueAt;
  if (!dueTime) {
    return 'no-due-date';
  }

  const completedTime = new Date(task.completedAt);

  if (completedTime <= dueTime) {
    return 'on-time';
  } else {
    return 'late';
  }
};

// ========================================
// OVERDUE DURATION HELPERS
// ========================================

/**
 * Get how much time overdue a task is
 * @param {Object} task - Task object
 * @returns {string} - e.g., "2h 15m" or "1 day 3h"
 */
export const getOverdueDuration = (task) => {
  const remaining = calculateRemainingTime(task);
  if (task.status === 'completed' || !remaining.isOverdue) {
    return null;
  }
  return formatDurationHuman(Math.abs(remaining.remainingMs || 0));
};

/**
 * Get how much time was exceeded on completed task
 * @param {Object} task - Task object
 * @returns {string} - e.g., "45m" or "1h 20m"
 */
export const getCompletionOverageDuration = (task) => {
  const remaining = calculateRemainingTime(task);
  if (task.status !== 'completed' || !task.completedAt || !remaining.effectiveDueAt) {
    return null;
  }

  const completedTime = new Date(task.completedAt);
  const dueTime = new Date(remaining.effectiveDueAt);
  const diffMs = completedTime - dueTime;

  if (diffMs <= 0) {
    return null; // Completed on time
  }

  return formatDurationHuman(diffMs);
};

/**
 * Format duration in milliseconds to human-readable format
 * @param {number} ms - Milliseconds
 * @returns {string} - e.g., "2h 15m", "1 day 3h", "45m"
 */
export const formatDurationHuman = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  if (days > 0) {
    const remainingHours = totalHours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours}h`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }

  return 'Just now';
};

// ========================================
// HUMAN-READABLE LABELS
// ========================================

/**
 * Get human deadline label for active tasks
 * @param {Object} task - Task object with dueDateTime
 * @returns {string} - e.g., "Due today, 3:00 PM", "Overdue by 2h 15m", "Due tomorrow, 11:00 AM"
 */
export const getHumanDeadlineLabel = (task) => {
  const timingState = getTaskTimingState(task);
  const remaining = calculateRemainingTime(task);
  const dueDate = remaining.effectiveDueAt ? new Date(remaining.effectiveDueAt) : null;

  switch (timingState) {
    case 'overdue': {
      const overdueDuration = getOverdueDuration(task);
      return `Overdue by ${overdueDuration}`;
    }

    case 'due-today': {
      const timeStr = formatTimeIST12Hour(dueDate);
      return `Due today, ${timeStr}`;
    }

    case 'due-tomorrow-soon': {
      const timeStr = formatTimeIST12Hour(dueDate);
      return `Due tomorrow, ${timeStr}`;
    }

    case 'due-soon': {
      const dateStr = formatDateIST(dueDate);
      const timeStr = formatTimeIST12Hour(dueDate);
      return `Due ${dateStr}, ${timeStr}`;
    }

    case 'upcoming': {
      const dateStr = formatDateIST(dueDate);
      const timeStr = formatTimeIST12Hour(dueDate);
      return `Due ${dateStr}, ${timeStr}`;
    }

    case 'no-deadline':
      return getTaskDueDisplay(task);

    default:
      return 'No deadline';
  }
};

/**
 * Get human completion label
 * @param {Object} task - Task object
 * @returns {string} - e.g., "Completed on time", "Completed late by 45m", "Completed today at 2:40 PM"
 */
export const getHumanCompletionLabel = (task) => {
  if (task.status !== 'completed') {
    return null;
  }

  const completionState = getCompletionState(task);
  const completedAt = task.completedAt ? new Date(task.completedAt) : null;

  switch (completionState) {
    case 'on-time': {
      // Check if completed significantly early
      if (task.dueDateTime) {
        const remaining = calculateRemainingTime(task);
        const dueTime = remaining.effectiveDueAt ? new Date(remaining.effectiveDueAt) : null;
        if (!dueTime) return 'Completed on time';
        const diffMs = dueTime - completedAt;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 2) {
          return 'Completed early';
        }
      }
      return 'Completed on time';
    }

    case 'late': {
      const overageDuration = getCompletionOverageDuration(task);
      return `Completed late by ${overageDuration}`;
    }

    case 'no-due-date': {
      const timeStr = formatTimeIST12Hour(completedAt);
      const dateStr = formatDateIST(completedAt);
      return `Completed ${dateStr} at ${timeStr}`;
    }

    case 'not-completed':
    default:
      return null;
  }
};

/**
 * Get primary status message for task card
 * Rules: Completed tasks show completion info, active tasks show deadline info
 * @param {Object} task - Task object
 * @returns {Object} - { label: string, type: 'completion' | 'deadline' | 'neutral', emphasis: 'high' | 'medium' | 'low' }
 */
export const getTaskStatusMessage = (task) => {
  // Completed tasks: show completion info with HIGH emphasis
  if (task.status === 'completed') {
    return {
      label: getHumanCompletionLabel(task) || 'Completed',
      type: 'completion',
      emphasis: 'high',
      icon: '✓'
    };
  }

  // In-progress tasks: show deadline info
  if (task.status === 'in-progress') {
    const timingState = getTaskTimingState(task);

    if (timingState === 'overdue') {
      const overdueDuration = getOverdueDuration(task);
      return {
        label: `Overdue by ${overdueDuration}`,
        type: 'deadline',
        emphasis: 'high',
        icon: '⚠️',
        isWarning: true
      };
    }

    if (timingState === 'due-today') {
      const timeStr = formatTimeIST12Hour(new Date(task.dueDateTime));
      return {
        label: `Due today, ${timeStr}`,
        type: 'deadline',
        emphasis: 'high',
        icon: '📅'
      };
    }

    if (timingState === 'due-tomorrow-soon') {
      return {
        label: 'Due tomorrow',
        type: 'deadline',
        emphasis: 'medium',
        icon: '📅'
      };
    }

    if (timingState === 'no-deadline') {
      return {
        label: 'In progress',
        type: 'neutral',
        emphasis: 'low',
        icon: '▶️'
      };
    }

    return {
      label: 'In progress',
      type: 'neutral',
      emphasis: 'medium',
      icon: '▶️'
    };
  }

  // Pending/Not started tasks
  if (task.status === 'pending' || task.status === 'todo') {
    const timingState = getTaskTimingState(task);

    if (timingState === 'overdue') {
      const overdueDuration = getOverdueDuration(task);
      return {
        label: `Overdue by ${overdueDuration}`,
        type: 'deadline',
        emphasis: 'high',
        icon: '⚠️',
        isWarning: true
      };
    }

    if (timingState === 'due-today') {
      return {
        label: 'Due today',
        type: 'deadline',
        emphasis: 'high',
        icon: '🔴'
      };
    }

    if (timingState === 'no-deadline') {
      return {
        label: 'No deadline',
        type: 'neutral',
        emphasis: 'low',
        icon: '—'
      };
    }

    return {
      label: 'Upcoming',
      type: 'neutral',
      emphasis: 'low',
      icon: '📋'
    };
  }

  return {
    label: task.status || 'Pending',
    type: 'neutral',
    emphasis: 'medium',
    icon: '•'
  };
};

// ========================================
// DATE/TIME FORMATTING HELPERS
// ========================================

/**
 * Format date to IST (e.g., "14 Apr 2026")
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
export const formatDateIST = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    const formatted = d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    
    return formatted.includes('NaN') ? '—' : formatted;
  } catch (err) {
    return '—';
  }
};

/**
 * Format time to IST 12-hour (e.g., "03:00 PM" or "3:00 PM")
 * @param {Date|string} date - Date/time to format
 * @returns {string} - Formatted time
 */
export const formatTimeIST12Hour = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    const formatted = d.toLocaleString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    
    return formatted.includes('NaN') ? '—' : formatted;
  } catch (err) {
    return '—';
  }
};

/**
 * Format datetime to full IST (e.g., "14 Apr 2026, 03:00 PM")
 * @param {Date|string} date - Date/time to format
 * @returns {string} - Formatted datetime
 */
export const formatDateTimeIST = (date) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    const datePart = formatDateIST(d);
    const timePart = formatTimeIST12Hour(d);
    
    if (datePart === '—' || timePart === '—') return '—';
    
    return `${datePart}, ${timePart}`;
  } catch (err) {
    return '—';
  }
};

// ========================================
// ANALYTICS HELPERS
// ========================================

/**
 * Categorize tasks for analytics
 * Safe to use - completed tasks never counted as overdue
 * @param {Array} tasks - Array of task objects
 * @returns {Object} - Categories with task arrays
 */
export const categorizeTasks = (tasks) => {
  const categories = {
    completedOnTime: [],
    completedLate: [],
    overdueActive: [],
    inProgress: [],
    notStarted: [],
    upcomingTasks: [],
    completedCancelled: [],
    totalCount: tasks.length
  };

  tasks.forEach(task => {
    // Completed tasks
    if (task.status === 'completed') {
      const completionState = getCompletionState(task);
      if (completionState === 'late') {
        categories.completedLate.push(task);
      } else if (completionState === 'on-time' || completionState === 'no-due-date') {
        categories.completedOnTime.push(task);
      }
      return;
    }

    // Cancelled tasks
    if (task.status === 'cancelled' || task.status === 'rejected') {
      categories.completedCancelled.push(task);
      return;
    }

    // Active and upcoming tasks
    const timingState = getTaskTimingState(task);

    if (timingState === 'overdue') {
      categories.overdueActive.push(task);
    } else if (task.status === 'in-progress') {
      categories.inProgress.push(task);
    } else if (timingState === 'no-deadline' || timingState === 'upcoming') {
      categories.upcomingTasks.push(task);
    } else if (task.status === 'pending' || task.status === 'todo') {
      if (timingState === 'overdue') {
        categories.overdueActive.push(task);
      } else {
        categories.notStarted.push(task);
      }
    }
  });

  return categories;
};

/**
 * Get analytics summary for display
 * @param {Array} tasks - Array of task objects
 * @returns {Object} - Summary with counts
 */
export const getTaskAnalyticsSummary = (tasks) => {
  const categories = categorizeTasks(tasks);

  return {
    totalTasks: categories.totalCount,
    completed: categories.completedOnTime.length + categories.completedLate.length,
    completedOnTime: categories.completedOnTime.length,
    completedLate: categories.completedLate.length,
    overdueActive: categories.overdueActive.length,
    inProgress: categories.inProgress.length,
    notStarted: categories.notStarted.length,
    upcoming: categories.upcomingTasks.length,
    cancelled: categories.completedCancelled.length
  };
};

// ========================================
// STATUS STYLING
// ========================================

/**
 * Get color styling for task status message
 * @param {string} type - 'completion' | 'deadline' | 'neutral'
 * @param {string} emphasis - 'high' | 'medium' | 'low'
 * @param {boolean} isWarning - Whether it's a warning state
 * @returns {Object} - Tailwind classes
 */
export const getStatusMessageStyles = (type, emphasis, isWarning = false) => {
  if (isWarning) {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700'
    };
  }

  if (type === 'completion') {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700'
    };
  }

  if (type === 'deadline' && emphasis === 'high') {
    return {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700'
    };
  }

  return {
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700'
  };
};

export default {
  getTaskTimingState,
  getCompletionState,
  getOverdueDuration,
  getCompletionOverageDuration,
  formatDurationHuman,
  getHumanDeadlineLabel,
  getHumanCompletionLabel,
  getTaskStatusMessage,
  formatDateIST,
  formatTimeIST12Hour,
  formatDateTimeIST,
  categorizeTasks,
  getTaskAnalyticsSummary,
  getStatusMessageStyles
};
