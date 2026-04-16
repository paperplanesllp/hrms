/**
 * Task Pause Management Utilities
 * Handles pausing tasks with remarks for manager review and time adjustments
 */

/**
 * Pause a task with remarks
 * @param {string} taskId - Task ID to pause
 * @param {string} remarks - Reason for pausing
 * @param {string} pausedReason - Type: 'higher_priority' | 'blocked' | 'waiting' | 'other'
 * @returns {Promise<Object>} - Updated task with pause record
 */
export const pauseTaskWithRemarks = async (taskId, remarks, pausedReason = 'other') => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/pause`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remarks,
        pausedReason,
        pausedAt: new Date().toISOString()
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Error pausing task:', err);
    throw err;
  }
};

/**
 * Resume a paused task
 * @param {string} taskId - Task ID to resume
 * @param {string} resumeRemarks - Optional remarks when resuming
 * @returns {Promise<Object>} - Updated task
 */
export const resumeTaskWithRemarks = async (taskId, resumeRemarks = '') => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/resume`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remarks: resumeRemarks,
        resumedAt: new Date().toISOString()
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Error resuming task:', err);
    throw err;
  }
};

/**
 * Get pause history for a task
 * @param {Object} task - Task object
 * @returns {Array} - Array of pause records with timestamps and remarks
 */
export const getPauseHistory = (task) => {
  if (!task.pauseHistory || !Array.isArray(task.pauseHistory)) {
    return [];
  }
  return task.pauseHistory;
};

/**
 * Format pause history for display
 * @param {Array} pauseHistory - Pause history array
 * @returns {Array} - Formatted pause records with human-readable times
 */
export const formatPauseHistory = (pauseHistory) => {
  if (!pauseHistory || !Array.isArray(pauseHistory)) {
    return [];
  }

  return pauseHistory.map(record => ({
    ...record,
    pausedAtFormatted: formatTimeIST(record.pausedAt),
    resumedAtFormatted: record.resumedAt ? formatTimeIST(record.resumedAt) : 'Still paused',
    pausedDurationFormatted: record.pausedDurationMs 
      ? formatDurationHuman(record.pausedDurationMs) 
      : 'N/A',
    reasonLabel: getPauseReasonLabel(record.pausedReason)
  }));
};

/**
 * Get human-readable pause reason
 * @param {string} reason - Pause reason code
 * @returns {string} - Human-readable label
 */
export const getPauseReasonLabel = (reason) => {
  const labels = {
    'higher_priority': 'Higher priority task assigned',
    'blocked': 'Task blocked/waiting',
    'waiting': 'Waiting for clarification',
    'other': 'Other reason'
  };
  return labels[reason] || reason;
};

/**
 * Check if task currently paused
 * @param {Object} task - Task object
 * @returns {boolean}
 */
export const isTaskCurrentlyPaused = (task) => {
  return task.isPaused === true;
};

/**
 * Get total paused duration for a task
 * @param {Object} task - Task object
 * @returns {number} - Total milliseconds paused
 */
export const getTotalPausedDuration = (task) => {
  if (!task.pauseHistory || !Array.isArray(task.pauseHistory)) {
    return 0;
  }

  return task.pauseHistory.reduce((total, record) => {
    return total + (record.pausedDurationMs || 0);
  }, 0);
};

/**
 * Format time in IST
 * @param {Date|string} date
 * @returns {string}
 */
export const formatTimeIST = (date) => {
  if (!date) return '—';
  
  try {
    const d = new Date(date);
    
    // Validate date
    if (isNaN(d.getTime())) {
      return '00:00 AM';
    }
    
    const formatted = d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    
    // Check for NaN in result
    if (!formatted || formatted.includes('NaN')) {
      return '00:00 AM';
    }
    
    return formatted;
  } catch (err) {
    console.warn('Error formatting time:', err);
    return '00:00 AM';
  }
};

/**
 * Format duration human readable
 * @param {number} ms
 * @returns {string}
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

  return `${totalSeconds}s`;
};

/**
 * Extend task deadline (HR/Manager only)
 * @param {string} taskId - Task ID to extend
 * @param {number} extensionMs - Extension duration in milliseconds
 * @param {string} extensionType - 'by-pause' or 'custom'
 * @param {number} customMinutes - Custom minutes if extensionType is 'custom'
 * @param {string} hrRemarks - Remarks from HR/Manager
 * @param {string} pauseRecordId - ID of the pause record this extends
 * @returns {Promise<Object>} - Updated task with new deadline
 */
export const extendDeadline = async (taskId, extensionMs, extensionType = 'by-pause', customMinutes = 0, hrRemarks = '', pauseRecordId = null) => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/extend-deadline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extensionMs,
        extensionType,
        customMinutes,
        hrRemarks,
        pauseRecordId,
        extendedAt: new Date().toISOString()
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Error extending deadline:', err);
    throw err;
  }
};

export default {
  pauseTaskWithRemarks,
  resumeTaskWithRemarks,
  getPauseHistory,
  formatPauseHistory,
  getPauseReasonLabel,
  isTaskCurrentlyPaused,
  getTotalPausedDuration,
  formatTimeIST,
  formatDurationHuman,
  extendDeadline
};
