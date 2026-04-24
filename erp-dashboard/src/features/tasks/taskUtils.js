/**
 * Task Management Utilities & Color System
 * Enterprise-level color palette for task priority and status
 */

import { calculateRemainingTime, getTaskDueDisplay, isTaskActuallyOverdue } from './utils/taskDeadlineUtils.js';

// ========================================
// PRIORITY COLOR SYSTEM
// ========================================

export const PRIORITY_STYLES = {
  LOW: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    dot: 'bg-green-500',
    dotRing: 'ring-green-500/20',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700',
    glow: 'shadow-lg shadow-green-500/10 hover:shadow-green-500/20',
    icon: 'text-green-600 dark:text-green-400'
  },
  MEDIUM: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-500',
    dotRing: 'ring-blue-500/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-300 dark:border-blue-700',
    glow: 'shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20',
    icon: 'text-blue-600 dark:text-blue-400'
  },
  HIGH: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
    dotRing: 'ring-orange-500/20',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-300 dark:border-orange-700',
    glow: 'shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20',
    icon: 'text-orange-600 dark:text-orange-400'
  },
  URGENT: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
    dotRing: 'ring-red-500/20',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-700',
    glow: 'shadow-lg shadow-red-500/10 hover:shadow-red-500/20',
    icon: 'text-red-600 dark:text-red-400'
  }
};

// ========================================
// STATUS COLOR SYSTEM
// ========================================

export const STATUS_STYLES = {
  pending: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400'
  },
  'in-progress': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400'
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400'
  },
  'on-hold': {
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
    icon: 'text-slate-600 dark:text-slate-400'
  },
  paused: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    icon: 'text-orange-600 dark:text-orange-400'
  },
  'due-soon': {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: 'text-yellow-600 dark:text-yellow-400'
  },
  extension_requested: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-700',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    icon: 'text-indigo-600 dark:text-indigo-400'
  },
  overdue: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400'
  },
  extended: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-300 dark:border-cyan-700',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    icon: 'text-cyan-600 dark:text-cyan-400'
  },
  rejected: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    icon: 'text-rose-600 dark:text-rose-400'
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400'
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get priority styles object
 * @param {string} priority - LOW, MEDIUM, HIGH, URGENT
 * @returns {object} Priority styles
 */
export const getPriorityStyles = (priority) => {
  return PRIORITY_STYLES[priority?.toUpperCase()] || PRIORITY_STYLES.MEDIUM;
};

/**
 * Get status styles object
 * @param {string} status - pending, in-progress, completed, on-hold, cancelled
 * @returns {object} Status styles
 */
export const getStatusStyles = (status) => {
  return STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.pending;
};

/**
 * Get priority label
 * @param {string} priority - LOW, MEDIUM, HIGH, URGENT
 * @returns {string} Readable priority label
 */
export const getPriorityLabel = (priority) => {
  const labels = {
    LOW: 'Low Priority',
    MEDIUM: 'Medium Priority',
    HIGH: 'High Priority',
    URGENT: 'Urgent'
  };
  return labels[priority?.toUpperCase()] || 'Medium Priority';
};

/**
 * Get status label
 * @param {string} status - pending, in-progress, completed, on-hold, cancelled
 * @returns {string} Readable status label
 */
export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    'on-hold': 'On Hold',
    paused: 'Paused',
    'due-soon': 'Due Soon',
    extension_requested: 'Extension Requested',
    overdue: 'Overdue',
    extended: 'Extended',
    rejected: 'Rejected',
    cancelled: 'Cancelled'
  };
  return labels[status?.toLowerCase()] || 'Pending';
};

/**
 * Get priority order for sorting (higher value = higher priority)
 * @param {string} priority
 * @returns {number}
 */
export const getPriorityOrder = (priority) => {
  const order = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4
  };
  return order[priority?.toUpperCase()] || 2;
};

/**
 * Check if task is overdue
 * @param {Date} dueDate
 * @param {string} status
 * @returns {boolean}
 */
export const isTaskOverdue = (taskOrDueDate, status) => {
  if (taskOrDueDate && typeof taskOrDueDate === 'object' && !Array.isArray(taskOrDueDate)) {
    return isTaskActuallyOverdue(taskOrDueDate);
  }

  if (['completed', 'rejected', 'cancelled'].includes(status)) return false;
  if (!taskOrDueDate) return false;
  return new Date() > new Date(taskOrDueDate);
};

/**
 * Get days until due date
 * @param {Date} dueDate
 * @returns {number} Days until due (negative if overdue)
 */
export const getDaysUntilDue = (taskOrDueDate) => {
  if (taskOrDueDate && typeof taskOrDueDate === 'object' && !Array.isArray(taskOrDueDate)) {
    const remaining = calculateRemainingTime(taskOrDueDate);
    if (!remaining.effectiveDueAt) return null;
    if (remaining.remainingMs === null) return null;
    return Math.ceil(remaining.remainingMs / (1000 * 60 * 60 * 24));
  }

  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const due = new Date(new Date(taskOrDueDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const nowDate = new Date(now);
  const diffTime = due - nowDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get due date display format with actual date and time, or just date for date-only entries
 * @param {Date} dueDate
 * @param {string} status
 * @returns {string} Formatted date with time (e.g., "26 Mar 2026, 05:30 am") or just date for date-only entries
 */
export const getDueDateDisplay = (taskOrDueDate, status) => {
  if (taskOrDueDate && typeof taskOrDueDate === 'object' && !Array.isArray(taskOrDueDate)) {
    if (taskOrDueDate.status === 'completed') return 'Completed';
    return getTaskDueDisplay(taskOrDueDate);
  }

  if (status === 'completed') return 'Completed';
  if (!taskOrDueDate) return 'No due date';
  return getTaskDueDisplay({ dueDate: taskOrDueDate, status });
};

/**
 * Get progress color based on completion percentage
 * @param {number} progress - 0-100
 * @returns {string} Tailwind classes
 */
export const getProgressColor = (progress) => {
  if (progress === 100) return 'bg-green-500';
  if (progress >= 75) return 'bg-blue-500';
  if (progress >= 50) return 'bg-amber-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

/**
 * Common priority options for dropdowns/selects
 */
export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low Priority', color: 'green' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'blue' },
  { value: 'HIGH', label: 'High Priority', color: 'orange' },
  { value: 'URGENT', label: 'Urgent', color: 'red' }
];

/**
 * Common status options for dropdowns/selects
 */
export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'in-progress', label: 'In Progress', color: 'blue' },
  { value: 'paused', label: 'Paused', color: 'orange' },
  { value: 'due-soon', label: 'Due Soon', color: 'yellow' },
  { value: 'extension_requested', label: 'Extension Requested', color: 'indigo' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'extended', label: 'Extended', color: 'cyan' },
  { value: 'rejected', label: 'Rejected', color: 'rose' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'on-hold', label: 'On Hold', color: 'slate' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

/**
 * Task filter defaults
 */
export const DEFAULT_TASK_FILTERS = {
  status: null,
  priority: null,
  dateRange: 'all', // all, today, week, month, overdue
  assignedTo: null,
  search: ''
};

/**
 * Sort options for task lists
 */
export const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority (High to Low)' },
  { value: 'dueDate', label: 'Due Date (Soonest)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'progress', label: 'Progress (Most)', direction: 'desc' }
];

export default {
  PRIORITY_STYLES,
  STATUS_STYLES,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  DEFAULT_TASK_FILTERS,
  SORT_OPTIONS,
  getPriorityStyles,
  getStatusStyles,
  getPriorityLabel,
  getStatusLabel,
  getPriorityOrder,
  isTaskOverdue,
  getDaysUntilDue,
  getDueDateDisplay,
  getProgressColor
};
