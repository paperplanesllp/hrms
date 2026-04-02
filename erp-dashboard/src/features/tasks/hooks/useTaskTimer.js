import { useState, useEffect } from 'react';
import { calcActiveSeconds, formatSeconds } from '../utils/taskTimerUtils.js';

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
