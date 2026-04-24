const IST_TIMEZONE = "Asia/Kolkata";

const TERMINAL_STATUSES = ['completed', 'rejected', 'cancelled'];

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toMinutes = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
};

const toMs = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
};

export function getEstimatedTotalMinutes(taskOrMinutes, fallbackHours = 0) {
  if (taskOrMinutes && typeof taskOrMinutes === 'object' && !Array.isArray(taskOrMinutes)) {
    const totalMinutes = Number(taskOrMinutes?.estimatedTotalMinutes);
    if (Number.isFinite(totalMinutes) && totalMinutes >= 0) {
      return Math.round(totalMinutes);
    }

    const estimatedMinutes = Number(taskOrMinutes?.estimatedMinutes);
    const estimatedHours = Number(taskOrMinutes?.estimatedHours);
    const safeMinutes = Number.isFinite(estimatedMinutes) && estimatedMinutes >= 0 ? estimatedMinutes : 0;
    const safeHours = Number.isFinite(estimatedHours) && estimatedHours >= 0 ? estimatedHours : 0;

    if (safeHours > 0 && safeMinutes < 60) {
      return Math.round(safeHours * 60 + safeMinutes);
    }

    if (safeMinutes > 0) {
      return Math.round(safeMinutes);
    }

    return Math.round(safeHours * 60);
  }

  const totalMinutes = Number(taskOrMinutes);
  const hours = Number(fallbackHours);
  const safeMinutes = Number.isFinite(totalMinutes) && totalMinutes >= 0 ? totalMinutes : 0;
  const safeHours = Number.isFinite(hours) && hours >= 0 ? hours : 0;

  if (safeHours > 0 && safeMinutes < 60) {
    return Math.round(safeHours * 60 + safeMinutes);
  }

  if (safeMinutes > 0) {
    return Math.round(safeMinutes);
  }

  return Math.round(safeHours * 60);
}

export function formatDurationMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.ceil(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function formatDurationMs(totalMs) {
  return formatDurationMinutes((Number(totalMs) || 0) / 60000);
}

const getCurrentPauseStart = (task) => {
  if (!task?.isPaused || !Array.isArray(task?.pauseEntries) || task.pauseEntries.length === 0) {
    return null;
  }

  const activePause = [...task.pauseEntries]
    .reverse()
    .find((entry) => entry?.pausedAt && !entry?.resumedAt);

  return toDate(activePause?.pausedAt);
};

const getCurrentHoldStart = (task) => {
  if (!(task?.isOnHold || task?.status === 'on-hold') || !Array.isArray(task?.holdEntries) || task.holdEntries.length === 0) {
    return null;
  }

  const activeHold = [...task.holdEntries]
    .reverse()
    .find((entry) => entry?.heldAt && !entry?.resumedAt);

  return toDate(activeHold?.heldAt);
};

const getOngoingBlockedDurationMs = (task, now = new Date()) => {
  const current = toDate(now) || new Date();
  const pauseStartedAt = getCurrentPauseStart(task);
  const holdStartedAt = getCurrentHoldStart(task);
  const blockedStartedAt =
    [pauseStartedAt, holdStartedAt]
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  if (!blockedStartedAt) return 0;
  return Math.max(0, current.getTime() - blockedStartedAt.getTime());
};

export function getEffectivePausedDurationMs(task, now = new Date()) {
  return toMs(task?.pausedDurationMs ?? task?.pausedDurationMinutes) + getOngoingBlockedDurationMs(task, now);
}

export function getActiveWorkedMs(task, now = new Date()) {
  const current = toDate(now) || new Date();
  let activeMs = Math.max(
    toMs(task?.activeWorkedMs),
    toMs(task?.totalActiveMilliseconds),
    toMs(task?.totalActiveTimeInSeconds) * 1000
  );

  if (
    task?.isRunning &&
    !task?.isPaused &&
    !(task?.isOnHold || task?.status === 'on-hold') &&
    task?.currentSessionStartTime
  ) {
    const sessionStart = toDate(task.currentSessionStartTime);
    if (sessionStart) {
      activeMs += Math.max(0, current.getTime() - sessionStart.getTime());
    }
  }

  return activeMs;
}

export function calculateDueTime(startedAt, estimatedMinutes, pausedDurationMs = 0) {
  const start = toDate(startedAt);
  const estimated = getEstimatedTotalMinutes(estimatedMinutes);
  if (!start || estimated <= 0) return null;

  return new Date(start.getTime() + estimated * 60000 + toMs(pausedDurationMs));
}

export function calculateRemainingTime(task, now = new Date()) {
  const metrics = task?.metrics || {};
  const estimatedMs = Number(metrics.estimatedMs || 0);
  const activeWorkedMs = Number(metrics.activeWorkedMs || 0);
  const pausedDurationMs = Number(metrics.pausedMs || 0) + Number(metrics.holdMs || 0);
  const effectiveDueAt = toDate(metrics.effectiveDueAt);
  const remainingMs = typeof metrics.deadlineRemainingMs === 'number' ? metrics.deadlineRemainingMs : null;
  const remainingSeconds = typeof remainingMs === 'number' ? Math.floor(remainingMs / 1000) : null;
  const estimatedMinutes = Math.round(estimatedMs / 60000);
  const estimatedLabel = estimatedMs > 0 ? formatDurationMs(estimatedMs) : 'No estimate set';
  const activeWorkedLabel = activeWorkedMs > 0 ? formatDurationMs(activeWorkedMs) : '0m';
  const pausedDurationLabel = pausedDurationMs > 0 ? formatDurationMs(pausedDurationMs) : '0m';
  const isCompleted = task?.status === 'completed';
  const shouldTrackDeadline = Boolean(metrics.isStarted) && estimatedMs > 0 && !TERMINAL_STATUSES.includes(task?.status);
  const isOverdue = Boolean(metrics.isOverdue);
  const isDueSoon = Boolean(metrics.isDueSoon);
  const remainingDurationLabel =
    typeof remainingMs === 'number' ? formatDurationMinutes(Math.abs(remainingMs) / 60000) : null;
  let state = 'Not tracking';
  if (isCompleted) state = 'Completed';
  else if (!metrics.isStarted) state = 'Not started';
  else if (estimatedMs <= 0) state = 'No estimate set';
  else if (metrics.isPaused || metrics.isOnHold) state = 'Paused';
  else if (isOverdue && remainingDurationLabel) state = `Overdue by ${remainingDurationLabel}`;
  else if (isDueSoon && remainingDurationLabel) state = `Due in ${remainingDurationLabel}`;
  else state = 'In progress';

  return {
    shouldTrackDeadline,
    effectiveDueAt,
    state,
    estimatedMinutes,
    estimatedLabel,
    activeWorkedMs,
    activeWorkedLabel,
    pausedDurationMs,
    pausedDurationLabel,
    remainingMs,
    remainingMinutes: typeof remainingMs === 'number' ? remainingMs / 60000 : null,
    remainingSeconds,
    remainingLabel:
      typeof remainingMs !== 'number'
        ? state
        : isOverdue
          ? `Overdue by ${remainingDurationLabel}`
          : `${remainingDurationLabel} remaining`,
    isOverdue,
    isDueSoon,
    isDueNow: remainingSeconds === 0,
    isCompleted,
  };
}

export function normalizeTaskTiming(task, now = new Date()) {
  const remaining = calculateRemainingTime(task, now);

  return {
    dueAt: remaining.effectiveDueAt || null,
    estimatedMinutes: remaining.estimatedMinutes,
    estimatedLabel: remaining.estimatedLabel,
    activeWorkedMs: remaining.activeWorkedMs,
    activeWorkedLabel: remaining.activeWorkedLabel,
    pausedDurationMs: remaining.pausedDurationMs,
    pausedDurationLabel: remaining.pausedDurationLabel,
    remainingMs: remaining.remainingMs,
    remainingMinutes: remaining.remainingMinutes,
    remainingSeconds: remaining.remainingSeconds,
    remainingLabel: remaining.remainingLabel,
    state: remaining.state,
    isOverdue: remaining.isOverdue,
    isDueSoon: remaining.isDueSoon,
    shouldTrackDeadline: remaining.shouldTrackDeadline,
  };
}

export function isTaskActuallyOverdue(task, now = new Date()) {
  return calculateRemainingTime(task, now).isOverdue;
}

export function getTaskDueDisplay(task, now = new Date()) {
  const timing = calculateRemainingTime(task, now);
  if (timing.effectiveDueAt) return formatToIST(timing.effectiveDueAt);
  if (!task?.startedAt && timing.estimatedMinutes > 0) return 'Starts when task begins';
  return 'No due time';
}

export function formatTime(totalSeconds, includeSeconds = true) {
  const absSeconds = Math.max(0, Math.floor(Math.abs(Number(totalSeconds) || 0)));
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  if (!includeSeconds) {
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function extendTaskTime(task, additionalMinutes) {
  const existingDue = calculateRemainingTime(task).effectiveDueAt || toDate(task?.dueAt) || toDate(task?.dueDate);
  if (!existingDue) return null;
  const extra = toMinutes(additionalMinutes);
  if (extra <= 0) return null;
  return new Date(existingDue.getTime() + extra * 60000);
}

export function markTaskRejected(task, rejectionReason) {
  return {
    ...task,
    status: "rejected",
    rejectionReason,
    rejectedAt: new Date().toISOString(),
  };
}

export function formatToIST(value) {
  const date = toDate(value);
  if (!date) return "-";
  return date.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function evaluateEmployeePerformance(metrics) {
  const totalTasks = Math.max(0, Number(metrics?.totalTasks || 0));
  const completedOnTime = Math.max(0, Number(metrics?.completedOnTime || 0));
  const overdueCount = Math.max(0, Number(metrics?.overdueCount || 0));
  const extensionRequests = Math.max(0, Number(metrics?.extensionRequests || 0));
  const approvedExtensions = Math.max(0, Number(metrics?.approvedExtensions || 0));
  const rejectedExtensions = Math.max(0, Number(metrics?.rejectedExtensions || 0));
  const overdueWithoutRequest = Math.max(0, Number(metrics?.overdueWithoutRequest || 0));
  const rejectedTasks = Math.max(0, Number(metrics?.rejectedTasks || 0));

  const onTimeRate = totalTasks > 0 ? (completedOnTime / totalTasks) * 100 : 0;
  const approvedExtensionRatio = extensionRequests > 0 ? approvedExtensions / extensionRequests : 1;

  let classification = "Needs Improvement";
  if (
    onTimeRate >= 70 &&
    overdueWithoutRequest <= Math.max(1, Math.floor(totalTasks * 0.1)) &&
    rejectedTasks === 0 &&
    rejectedExtensions <= Math.max(1, Math.floor(extensionRequests * 0.3))
  ) {
    classification = "Asset";
  } else if (
    overdueWithoutRequest >= Math.max(2, Math.floor(totalTasks * 0.25)) ||
    rejectedTasks >= Math.max(2, Math.floor(totalTasks * 0.2)) ||
    rejectedExtensions >= Math.max(2, Math.floor(extensionRequests * 0.5)) ||
    (extensionRequests > 0 && approvedExtensionRatio < 0.4)
  ) {
    classification = "Liability";
  }

  return {
    onTimeRate: Number(onTimeRate.toFixed(2)),
    classification,
  };
}
