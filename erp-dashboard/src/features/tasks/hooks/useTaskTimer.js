import { useState, useEffect } from 'react';
import { calcActiveSeconds, formatSeconds } from '../utils/taskTimerUtils.js';
import { calculateRemainingTime, formatTime } from '../utils/taskDeadlineUtils.js';

/**
 * Custom hook providing a live-updating timer display for a task.
 * - Updates every second when task.isRunning is true.
 * - Recalculates from server-stored timestamps, so accurate after page refresh.
 * - Resets correctly after pause/resume cycles when task data changes.
 */
export function useTaskTimer(task) {
  const [elapsed, setElapsed] = useState(() => calcActiveSeconds(task));

  useEffect(() => {
    // Always sync to latest server data when task changes
    setElapsed(calcActiveSeconds(task));

    if (!task.isRunning) return;

    const id = setInterval(() => {
      // calcActiveSeconds uses Date.now() internally — always fresh
      setElapsed(calcActiveSeconds(task));
    }, 1000);

    return () => clearInterval(id);
  // Re-run when any timing-relevant field changes
  }, [task.isRunning, task.totalActiveTimeInSeconds, task.currentSessionStartTime]); // eslint-disable-line

  return {
    elapsed,
    display: formatSeconds(elapsed),
  };
}

const computeCountdown = (task, now = new Date()) => {
  // Completed tasks should not show any countdown or overdue indicator
  if (task?.status === 'completed') {
    return {
      shouldTrack: false,
      remainingMs: null,
      remainingSeconds: 0,
      display: 'Completed',
      urgency: 'none',
      isOverdue: false,
      isDueNow: false,
      isCompleted: true,
      state: 'Completed',
    };
  }

  const remaining = calculateRemainingTime(task, now);

  if (!remaining.shouldTrackDeadline || remaining.remainingMs === null) {
  return {
    shouldTrack: false,
    remainingMs: null,
    remainingSeconds: 0,
    display: remaining.remainingLabel || remaining.state || '-',
    urgency: 'none',
    isOverdue: false,
    isDueNow: false,
    state: remaining.state || '-',
  };
  }

  const remainingSeconds = Math.floor(remaining.remainingMs / 1000);
  const isOverdue = remainingSeconds < 0;
  const isDueNow = remainingSeconds === 0;
  const absDisplay = formatTime(remainingSeconds, true);
  const overdueByMinutes = Math.max(1, Math.ceil(Math.abs(remainingSeconds) / 60));

  // Format overdue duration as "Xh Ym" instead of raw minutes
  const formatOverdueDuration = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  let urgency = 'normal';
  if (isOverdue) urgency = 'overdue';
  else if (isDueNow) urgency = 'due-now';
  else if (remainingSeconds <= 300) urgency = 'blink';
  else if (remainingSeconds <= 900) urgency = 'critical';
  else if (remainingSeconds <= 1800) urgency = 'warning';

  return {
    shouldTrack: true,
    remainingMs: remaining.remainingMs,
    remainingSeconds,
    display: isOverdue ? `Overdue by ${formatOverdueDuration(overdueByMinutes)}` : remaining.remainingLabel || absDisplay,
    urgency,
    isOverdue,
    isDueNow,
    overdueByMinutes,
    state: remaining.state || (isOverdue ? `Overdue by ${formatOverdueDuration(overdueByMinutes)}` : 'In progress'),
  };
};

export function useCountdownTimer(task) {
  const [tickNow, setTickNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setTickNow(new Date());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return computeCountdown(task, tickNow);
}

export const useTaskCountdown = useCountdownTimer;
