/**
 * Task Timer Utilities
 * Functions for calculating and displaying task timer data.
 * All time calculations are server-timestamp-based so they survive page refresh.
 */

/** Format total seconds into HH:MM:SS */
export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
}

/** Format total seconds into human-readable string e.g. "2h 35m" or "45s" */
export function formatSecondsHuman(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

/** Format milliseconds into human-readable string (canonical formatter) */
export function formatMilliseconds(totalMs) {
  if (!totalMs || totalMs <= 0) return '0m';
  const seconds = Math.max(0, Math.floor(totalMs / 1000));
  return formatSecondsHuman(seconds);
}

/** Format minutes into human-readable string. Use for fields stored as minutes in database */
export function formatMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Format estimated time. Use this to display estimated minutes. */
export function formatEstimatedTime(estimatedMinutes) {
  if (!estimatedMinutes || estimatedMinutes === 0) return 'No estimate';
  return formatMinutes(estimatedMinutes);
}

/**
 * Calculate total active seconds for a task, including the current running session.
 * Uses server-stored currentSessionStartTime so it's accurate after page refresh.
 */
export function calcActiveSeconds(task) {
  let total = task.totalActiveTimeInSeconds || 0;
  if (task.isRunning && task.currentSessionStartTime) {
    const elapsed = Math.floor(
      (Date.now() - new Date(task.currentSessionStartTime).getTime()) / 1000
    );
    total += Math.max(0, elapsed);
  }
  return total;
}

/**
 * Calculate total paused seconds for a task, including the current ongoing pause.
 */
export function calcPausedSeconds(task) {
  let total = task.totalPausedTimeInSeconds || 0;
  if (task.isPaused && task.pauseEntries?.length > 0) {
    const last = task.pauseEntries[task.pauseEntries.length - 1];
    if (last && !last.resumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(last.pausedAt).getTime()) / 1000
      );
      total += Math.max(0, elapsed);
    }
  }
  return total;
}

/**
 * Calculate productivity ratio as integer percentage (0–100).
 * Returns 0 if no time has been tracked yet.
 */
export function calcProductivityRatio(activeSeconds, pausedSeconds) {
  const total = activeSeconds + pausedSeconds;
  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((activeSeconds / total) * 100)));
}

/**
 * Derive the current timer state from a task object.
 * @returns {'running'|'paused'|'completed'|'pending'}
 */
export function getTimerState(task) {
  const status = task?.status;
  const timingState = task?.timingState;

  if (['completed', 'rejected', 'cancelled'].includes(status)) return 'completed';
  if (task?.isPaused || status === 'paused' || status === 'on-hold' || timingState === 'paused') return 'paused';
  if (task?.isRunning) return 'running';
  if (
    ['in-progress', 'due-soon', 'overdue', 'extended'].includes(status) ||
    ['in_progress', 'overdue'].includes(timingState)
  ) {
    return 'running';
  }
  return 'pending';
}

/**
 * Get formatted lifecycle duration from task.createdAt to task.completedAt (or now).
 */
export function getLifecycleDuration(task) {
  const start = new Date(task.createdAt);
  const end = task.completedAt ? new Date(task.completedAt) : new Date();
  return formatSecondsHuman(Math.floor((end - start) / 1000));
}
