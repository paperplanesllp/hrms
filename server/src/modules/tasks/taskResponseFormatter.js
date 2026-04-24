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
    pausedDurationLabel: timing.pausedDurationLabel,
    activeWorkedMs: timing.activeWorkedMs,
    activeWorkedLabel: timing.activeWorkedLabel,
    estimatedMinutes: timing.estimatedMinutes,
    estimatedLabel: timing.estimatedLabel,
    remainingMs: timing.remainingMs,
    remainingSeconds: timing.remainingSeconds,
    remainingMinutes: timing.remainingMinutes,
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
