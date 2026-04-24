/**
 * Premium Task Table - Utility Functions & Helpers
 * Advanced features: sorting, filtering, date calculations, formatting
 */

import { calculateRemainingTime, isTaskActuallyOverdue } from '../../utils/taskDeadlineUtils.js';

// ========================================
// DATE UTILITIES
// ========================================

/**
 * Calculate if a task is overdue
 * @param {Date|String} dueDate - Task due date
 * @returns {Boolean}
 */
export const isTaskOverdue = (taskOrDueDate) => {
  if (taskOrDueDate && typeof taskOrDueDate === 'object' && !Array.isArray(taskOrDueDate)) {
    return isTaskActuallyOverdue(taskOrDueDate);
  }
  if (!taskOrDueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(taskOrDueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

/**
 * Calculate days until due date
 * @param {Date|String} dueDate - Task due date
 * @returns {Number} Days remaining (negative if overdue)
 */
export const getDaysUntilDue = (taskOrDueDate) => {
  if (taskOrDueDate && typeof taskOrDueDate === 'object' && !Array.isArray(taskOrDueDate)) {
    const remaining = calculateRemainingTime(taskOrDueDate);
    if (remaining.remainingMs === null) return null;
    return Math.ceil(remaining.remainingMs / (1000 * 60 * 60 * 24));
  }
  if (!taskOrDueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(taskOrDueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get urgency level based on due date
 * @param {Date|String} dueDate - Task due date
 * @returns {String} 'overdue' | 'urgent' | 'high' | 'normal'
 */
export const getUrgencyLevel = (dueDate) => {
  const daysUntil = getDaysUntilDue(dueDate);
  if (daysUntil === null) return 'normal';
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'urgent';
  if (daysUntil <= 2) return 'high';
  return 'normal';
};

/**
 * Format date for display
 * @param {Date|String} date - Date to format
 * @param {String} format - Format type: 'short', 'long', 'full'
 * @returns {String}
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '--';
  
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return 'Today';

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    case 'long':
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    case 'full':
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    default:
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  }
};

// ========================================
// SORTING UTILITIES
// ========================================

/**
 * Sort tasks by specified field
 * @param {Array} tasks - Array of tasks
 * @param {String} field - Field to sort by
 * @param {String} direction - 'asc' or 'desc'
 * @returns {Array} Sorted tasks
 */
export const sortTasks = (tasks, field, direction = 'asc') => {
  const sorted = [...tasks].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return direction === 'asc' ? 1 : -1;
    if (bVal == null) return direction === 'asc' ? -1 : 1;

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (direction === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  return sorted;
};

/**
 * Sort tasks by priority (custom order)
 * @param {Array} tasks - Array of tasks
 * @param {String} direction - 'asc' or 'desc'
 * @returns {Array} Sorted tasks
 */
export const sortByPriority = (tasks, direction = 'desc') => {
  const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  
  return [...tasks].sort((a, b) => {
    const aOrder = priorityOrder[a.priority] ?? 4;
    const bOrder = priorityOrder[b.priority] ?? 4;
    
    if (direction === 'asc') {
      return aOrder - bOrder;
    } else {
      return bOrder - aOrder;
    }
  });
};

/**
 * Sort tasks by status (custom order)
 * @param {Array} tasks - Array of tasks
 * @param {String} direction - 'asc' or 'desc'
 * @returns {Array} Sorted tasks
 */
export const sortByStatus = (tasks, direction = 'asc') => {
  const statusOrder = {
    'overdue': 0,
    'urgent': 1,
    'in-progress': 2,
    'under-review': 3,
    'pending': 4,
    'new': 5,
    'on-hold': 6,
    'completed': 7,
    'cancelled': 8
  };
  
  return [...tasks].sort((a, b) => {
    const aOrder = statusOrder[a.status] ?? 9;
    const bOrder = statusOrder[b.status] ?? 9;
    
    if (direction === 'asc') {
      return aOrder - bOrder;
    } else {
      return bOrder - aOrder;
    }
  });
};

// ========================================
// FILTERING UTILITIES
// ========================================

/**
 * Filter tasks by status
 * @param {Array} tasks - Array of tasks
 * @param {String|Array} statuses - Status value(s) to filter by
 * @returns {Array} Filtered tasks
 */
export const filterByStatus = (tasks, statuses) => {
  if (!statuses || statuses.length === 0) return tasks;
  const statusArray = Array.isArray(statuses) ? statuses : [statuses];
  return tasks.filter(t => statusArray.includes(t.status));
};

/**
 * Filter tasks by priority
 * @param {Array} tasks - Array of tasks
 * @param {String|Array} priorities - Priority value(s) to filter by
 * @returns {Array} Filtered tasks
 */
export const filterByPriority = (tasks, priorities) => {
  if (!priorities || priorities.length === 0) return tasks;
  const priorityArray = Array.isArray(priorities) ? priorities : [priorities];
  return tasks.filter(t => priorityArray.includes(t.priority));
};

/**
 * Filter tasks by assigned user
 * @param {Array} tasks - Array of tasks
 * @param {String|Array} userIds - User ID(s) to filter by
 * @returns {Array} Filtered tasks
 */
export const filterByAssignee = (tasks, userIds) => {
  if (!userIds || userIds.length === 0) return tasks;
  const idArray = Array.isArray(userIds) ? userIds : [userIds];
  return tasks.filter(t => idArray.includes(t.assignedTo));
};

/**
 * Filter tasks by department
 * @param {Array} tasks - Array of tasks
 * @param {String|Array} departments - Department ID(s) to filter by
 * @returns {Array} Filtered tasks
 */
export const filterByDepartment = (tasks, departments) => {
  if (!departments || departments.length === 0) return tasks;
  const deptArray = Array.isArray(departments) ? departments : [departments];
  return tasks.filter(t => deptArray.includes(t.department));
};

/**
 * Filter tasks by search query (searches title, description, etc.)
 * @param {Array} tasks - Array of tasks
 * @param {String} query - Search query
 * @param {Array} searchFields - Fields to search in
 * @returns {Array} Filtered tasks
 */
export const filterBySearch = (tasks, query, searchFields = ['title', 'description']) => {
  if (!query || query.trim() === '') return tasks;
  
  const lowerQuery = query.toLowerCase();
  return tasks.filter(task => {
    return searchFields.some(field => {
      const value = task[field];
      if (value == null) return false;
      return String(value).toLowerCase().includes(lowerQuery);
    });
  });
};

/**
 * Filter tasks by due date range
 * @param {Array} tasks - Array of tasks
 * @param {String} filterType - 'today', 'tomorrow', 'this-week', 'this-month', 'overdue', 'no-date'
 * @returns {Array} Filtered tasks
 */
export const filterByDueDate = (tasks, filterType) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(today);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  switch (filterType) {
    case 'today':
      return tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due.getDate() === today.getDate() && 
               due.getMonth() === today.getMonth() && 
               due.getFullYear() === today.getFullYear();
      });
    case 'tomorrow':
      return tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due.getDate() === tomorrow.getDate() && 
               due.getMonth() === tomorrow.getMonth() && 
               due.getFullYear() === tomorrow.getFullYear();
      });
    case 'this-week':
      return tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= today && due <= weekEnd;
      });
    case 'this-month':
      return tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= today && due <= monthEnd;
      });
    case 'overdue':
      return tasks.filter(t => isTaskOverdue(t));
    case 'no-date':
      return tasks.filter(t => !t.dueDate);
    default:
      return tasks;
  }
};

// ========================================
// GROUPING UTILITIES
// ========================================

/**
 * Group tasks by status
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Tasks grouped by status
 */
export const groupByStatus = (tasks) => {
  return tasks.reduce((groups, task) => {
    const status = task.status || 'new';
    if (!groups[status]) groups[status] = [];
    groups[status].push(task);
    return groups;
  }, {});
};

/**
 * Group tasks by priority
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Tasks grouped by priority
 */
export const groupByPriority = (tasks) => {
  return tasks.reduce((groups, task) => {
    const priority = task.priority || 'MEDIUM';
    if (!groups[priority]) groups[priority] = [];
    groups[priority].push(task);
    return groups;
  }, {});
};

/**
 * Group tasks by assigned user
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Tasks grouped by assigned user
 */
export const groupByAssignee = (tasks) => {
  return tasks.reduce((groups, task) => {
    const userId = task.assignedTo || 'unassigned';
    if (!groups[userId]) groups[userId] = [];
    groups[userId].push(task);
    return groups;
  }, {});
};

// ========================================
// STATISTICS UTILITIES
// ========================================

/**
 * Calculate task statistics
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Statistics object
 */
export const calculateTaskStats = (tasks) => {
  const stats = {
    total: tasks.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 }
  };

  tasks.forEach(task => {
    if (task.status === 'completed') stats.completed++;
    if (task.status === 'in-progress') stats.inProgress++;
    if (task.status === 'pending' || task.status === 'new') stats.pending++;
    if (isTaskOverdue(task) && task.status !== 'completed') stats.overdue++;

    stats.byPriority[task.priority]++;
  });

  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
};

/**
 * Calculate average completion time
 * @param {Array} tasks - Array of completed tasks
 * @returns {Number} Average completion time in days
 */
export const calculateAvgCompletionTime = (tasks) => {
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt);
  
  if (completedTasks.length === 0) return 0;

  const totalTime = completedTasks.reduce((sum, task) => {
    const created = new Date(task.createdAt);
    const completed = new Date(task.completedAt);
    const diffTime = completed.getTime() - created.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return sum + diffDays;
  }, 0);

  return Math.round(totalTime / completedTasks.length);
};

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validate task data before submission
 * @param {Object} taskData - Task data to validate
 * @returns {Object} Validation result with errors
 */
export const validateTaskData = (taskData) => {
  const errors = {};

  if (!taskData.title || taskData.title.trim() === '') {
    errors.title = 'Task title is required';
  } else if (taskData.title.length > 200) {
    errors.title = 'Title cannot exceed 200 characters';
  }

  if (!taskData.assignedTo) {
    errors.assignedTo = 'Task must be assigned to a user';
  }

  if (!taskData.dueDate) {
    errors.dueDate = 'Due date is required';
  } else if (new Date(taskData.dueDate) < new Date()) {
    errors.dueDate = 'Due date cannot be in the past';
  }

  if (taskData.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(taskData.priority)) {
    errors.priority = 'Invalid priority';
  }

  if (taskData.status && !['new', 'pending', 'in-progress', 'on-hold', 'under-review', 'completed', 'cancelled'].includes(taskData.status)) {
    errors.status = 'Invalid status';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ========================================
// EXPORT BATCHES FOR COMMON OPERATIONS
// ========================================

/**
 * Apply multiple filters at once
 * @param {Array} tasks - Array of tasks
 * @param {Object} filterConfig - Configuration object with filter settings
 * @returns {Array} Filtered and sorted tasks
 */
export const applyMultipleFilters = (tasks, filterConfig = {}) => {
  let filtered = tasks;

  // Apply status filter
  if (filterConfig.status && filterConfig.status.length > 0) {
    filtered = filterByStatus(filtered, filterConfig.status);
  }

  // Apply priority filter
  if (filterConfig.priority && filterConfig.priority.length > 0) {
    filtered = filterByPriority(filtered, filterConfig.priority);
  }

  // Apply assignee filter
  if (filterConfig.assignedTo && filterConfig.assignedTo.length > 0) {
    filtered = filterByAssignee(filtered, filterConfig.assignedTo);
  }

  // Apply department filter
  if (filterConfig.department && filterConfig.department.length > 0) {
    filtered = filterByDepartment(filtered, filterConfig.department);
  }

  // Apply search filter
  if (filterConfig.search && filterConfig.search.trim() !== '') {
    filtered = filterBySearch(filtered, filterConfig.search);
  }

  // Apply sorting
  if (filterConfig.sortField) {
    filtered = sortTasks(filtered, filterConfig.sortField, filterConfig.sortDirection || 'asc');
  }

  return filtered;
};
