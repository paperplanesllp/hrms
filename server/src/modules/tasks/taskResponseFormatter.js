import { normalizeTaskTiming } from './taskDeadline.utils.js';

const toPlain = (task) => (typeof task?.toObject === 'function' ? task.toObject({ virtuals: true }) : task);

export function formatTaskResponse(task, now = new Date()) {
  const plainTask = toPlain(task);
  if (!plainTask) return plainTask;

  const timing = normalizeTaskTiming(plainTask, now);

  return {
    ...plainTask,
    dueAt: timing.dueAt,
    startedAt: timing.startedAt,
    pausedDurationMs: timing.pausedDurationMs,
    remainingMs: timing.remainingMs,
    remainingSeconds: timing.remainingSeconds,
    remainingState: timing.remainingState,
    remainingLabel: timing.remainingLabel,
    isOverdue: timing.isOverdue,
    isDueSoon: timing.isDueSoon,
    normalizedTimingState: timing.normalizedTimingState,
  };
}

export function formatTaskCollection(tasks = [], now = new Date()) {
  return tasks.map((task) => formatTaskResponse(task, now));
}
