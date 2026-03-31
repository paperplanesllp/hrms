/**
 * Task Management Utilities & Color System
 * Enterprise-level color palette for task priority and status
 */

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
export const isTaskOverdue = (dueDate, status) => {
  return status !== 'completed' && new Date() > new Date(dueDate);
};

/**
 * Get days until due date
 * @param {Date} dueDate
 * @returns {number} Days until due (negative if overdue)
 */
export const getDaysUntilDue = (dueDate) => {
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const due = new Date(new Date(dueDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const nowDate = new Date(now);
  const diffTime = due - nowDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get due date display format with actual date, time and relative info
 * @param {Date} dueDate
 * @param {string} status
 * @returns {string} Formatted date with time (e.g., "26 Mar 2026, 05:30 am")
 */
export const getDueDateDisplay = (dueDate, status) => {
  if (status === 'completed') return 'Completed';
  
  if (!dueDate) return 'No due date';
  
  try {
    const date = new Date(dueDate);
    
    // Get date components in Asia/Kolkata timezone
    const dateStr = date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    
    // Get time components separately to ensure proper formatting
    const timeStr = date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    
    // Format: "26 Mar 2026, 05:30 am"
    return `${dateStr}, ${timeStr}`;
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid date';
  }
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
