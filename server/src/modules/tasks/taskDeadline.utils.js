const IST_TIMEZONE = "Asia/Kolkata";
let enableDebugMode = process.env.TASK_TIMING_DEBUG === "true";
export const TASK_TIMING_STATE = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  PAUSED: "paused",
  COMPLETED: "completed",
  OVERDUE: "overdue",
};

export const REMAINING_STATE = {
  NOT_STARTED: "not_started",
  NO_ESTIMATE: "no_estimate",
  IN_PROGRESS: "in_progress",
  PAUSED: "paused",
  DUE_SOON: "due_soon",
  OVERDUE: "overdue",
  COMPLETED: "completed",
};

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

const getEstimatedTotalMinutes = (taskOrValue, fallbackHours = 0) => {
  if (taskOrValue && typeof taskOrValue === "object") {
    const totalMinutes = Number(taskOrValue?.estimatedTotalMinutes);
    if (Number.isFinite(totalMinutes) && totalMinutes >= 0) {
      return Math.round(totalMinutes);
    }

    const estimatedMinutes = Number(taskOrValue?.estimatedMinutes);
    const estimatedHours = Number(taskOrValue?.estimatedHours);
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

  const totalMinutes = Number(taskOrValue);
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
};

const formatDurationFromMinutes = (totalMinutes) => {
  const safeMinutes = Math.max(0, Math.ceil(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const formatDurationFromMs = (totalMs) => formatDurationFromMinutes((Number(totalMs) || 0) / 60000);
const DUE_SOON_THRESHOLD_MS = Number(process.env.DUE_SOON_THRESHOLD_MS) || 15 * 60 * 1000;

const isTerminalWorkflowStatus = (status) =>
  ["completed", "rejected", "cancelled"].includes(status);

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
  if (!(task?.isOnHold || task?.status === "on-hold") || !Array.isArray(task?.holdEntries) || task.holdEntries.length === 0) {
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

const getEffectivePausedDurationMs = (task, now = new Date()) =>
  toMs(task?.pausedDurationMs) + getOngoingBlockedDurationMs(task, now);

const getActiveWorkedMs = (task, now = new Date()) => {
  const current = toDate(now) || new Date();
  let activeMs = Math.max(
    toMs(task?.totalActiveTimeInSeconds) * 1000,
    toMs(task?.totalActiveMilliseconds)
  );

  if (
    task?.isRunning &&
    !task?.isPaused &&
    !(task?.isOnHold || task?.status === "on-hold") &&
    task?.currentSessionStartTime
  ) {
    const sessionStart = toDate(task.currentSessionStartTime);
    if (sessionStart) {
      activeMs += Math.max(0, current.getTime() - sessionStart.getTime());
    }
  }

  return activeMs;
};

const getPauseEntriesDurationMs = (task, now = new Date()) => {
  if (!Array.isArray(task?.pauseEntries) || task.pauseEntries.length === 0) return 0;
  const current = toDate(now) || new Date();
  return task.pauseEntries.reduce((sum, entry) => {
    const pausedAt = toDate(entry?.pausedAt);
    if (!pausedAt) return sum;
    const resumedAt = toDate(entry?.resumedAt) || current;
    return sum + Math.max(0, resumedAt.getTime() - pausedAt.getTime());
  }, 0);
};

const getHoldEntriesDurationMs = (task, now = new Date()) => {
  if (!Array.isArray(task?.holdEntries) || task.holdEntries.length === 0) return 0;
  const current = toDate(now) || new Date();
  return task.holdEntries.reduce((sum, entry) => {
    const heldAt = toDate(entry?.heldAt);
    if (!heldAt) return sum;
    const resumedAt = toDate(entry?.resumedAt) || current;
    return sum + Math.max(0, resumedAt.getTime() - heldAt.getTime());
  }, 0);
};

export function calculateTaskMetrics(task, now = new Date()) {
  const current = toDate(now) || new Date();
  const startedAt = toDate(task?.startedAt);
  const completedAt = toDate(task?.completedAt);
  const status = task?.status || 'pending';
  const terminal = isTerminalWorkflowStatus(status);
  const isStarted = Boolean(startedAt);
  const isPaused = Boolean(task?.isPaused || status === 'paused');
  const isOnHold = Boolean(task?.isOnHold || status === 'on-hold');
  const isRunning = Boolean(task?.isRunning && !isPaused && !isOnHold && !terminal);

  const estimatedMinutes = getEstimatedTotalMinutes(task);
  const estimatedMs = estimatedMinutes > 0 ? estimatedMinutes * 60 * 1000 : 0;

  const metricsNow = terminal && completedAt ? completedAt : current;

  const activeWorkedMs = terminal
    ? Math.max(
        toMs(task?.totalWorkedMilliseconds),
        toMs(task?.totalActiveTimeInSeconds) * 1000,
        toMs(task?.totalActiveMilliseconds)
      )
    : Math.max(
        toMs(task?.totalWorkedMilliseconds),
        getActiveWorkedMs(task, metricsNow)
      );

  const pausedMs = Math.max(
    toMs(task?.totalPausedMilliseconds),
    toMs(task?.pausedDurationMs),
    toMs(task?.totalPausedTimeInSeconds) * 1000,
    getPauseEntriesDurationMs(task, metricsNow)
  );

  const holdMs = Math.max(
    toMs(task?.totalHoldTimeInSeconds) * 1000,
    getHoldEntriesDurationMs(task, metricsNow)
  );

  const effectiveDueAt = isStarted && estimatedMs > 0
    ? new Date(startedAt.getTime() + estimatedMs + pausedMs + holdMs)
    : null;

  const remainingMs = terminal
    ? 0
    : estimatedMs > 0
      ? Math.max(0, estimatedMs - activeWorkedMs)
      : null;
  const deadlineRemainingMs = effectiveDueAt ? effectiveDueAt.getTime() - metricsNow.getTime() : null;

  const isOverdue = Boolean(
    isStarted &&
    !terminal &&
    estimatedMs > 0 &&
    (activeWorkedMs > estimatedMs || (effectiveDueAt && metricsNow > effectiveDueAt))
  );

  const isDueSoon = Boolean(
    isStarted &&
    !terminal &&
    !isOverdue &&
    estimatedMs > 0 &&
    (isRunning || (!isPaused && !isOnHold)) &&
    typeof deadlineRemainingMs === 'number' &&
    deadlineRemainingMs > 0 &&
    deadlineRemainingMs <= DUE_SOON_THRESHOLD_MS
  );

  const completedOnTime = terminal && completedAt && effectiveDueAt
    ? completedAt.getTime() <= effectiveDueAt.getTime()
    : null;

  const statusLabel = terminal
    ? 'Completed'
    : isOnHold
      ? 'On Hold'
      : isPaused
        ? 'Paused'
        : isOverdue
          ? 'Overdue'
          : isDueSoon
            ? 'Due Soon'
            : isRunning
              ? 'Running'
              : isStarted
                ? 'Started'
                : 'Not Started';

  const remainingRatio = estimatedMs > 0 && typeof remainingMs === 'number'
    ? remainingMs / estimatedMs
    : null;
  const timingHealth = isOverdue
    ? 'overdue'
    : remainingRatio !== null && remainingRatio < 0.2
      ? 'risk'
      : 'on-track';

  return {
    estimatedMs,
    activeWorkedMs,
    pausedMs,
    holdMs,
    effectiveDueAt,
    remainingMs,
    deadlineRemainingMs,
    isStarted,
    isRunning,
    isPaused,
    isOnHold,
    isDueSoon,
    isOverdue,
    completedOnTime,
    statusLabel,
    timingHealth,
  };
}

export function calculateDueTime(startedAt, estimatedMinutes, pausedDurationMs = 0) {
  const startDate = toDate(startedAt);
  if (!startDate) return null;

  const estimated = getEstimatedTotalMinutes(estimatedMinutes);
  if (estimated <= 0) return null;

  const paused = toMs(pausedDurationMs);
  return new Date(startDate.getTime() + estimated * 60 * 1000 + paused);
}

export const calculateDueAt = calculateDueTime;

export function getRemainingMs(task, now = new Date()) {
  const current = toDate(now) || new Date();
  const dueAt =
    calculateDueAt(task?.startedAt, task?.estimatedMinutes, getEffectivePausedDurationMs(task, current)) ||
    toDate(task?.dueAt) ||
    toDate(task?.dueDate);

  if (!dueAt) return null;
  return dueAt.getTime() - current.getTime();
}

export function applyPauseDuration(task, pauseStart, resumeTime = new Date()) {
  const pausedAt = toDate(pauseStart);
  const resumedAt = toDate(resumeTime);
  if (!pausedAt || !resumedAt || resumedAt <= pausedAt) return 0;

  const pausedMs = Math.max(0, resumedAt.getTime() - pausedAt.getTime());
  task.pausedDurationMs = toMs(task?.pausedDurationMs) + pausedMs;
  task.pausedDurationMinutes = Math.floor(task.pausedDurationMs / 60000);
  task.totalPausedTimeInSeconds = Math.round(task.pausedDurationMs / 1000);

  return pausedMs;
}

export function resolveTaskTimingState(task, now = new Date()) {
  const current = toDate(now) || new Date();
  const startedAt = toDate(task?.startedAt);

  if (!startedAt) return TASK_TIMING_STATE.NOT_STARTED;
  if (task?.timingState === TASK_TIMING_STATE.COMPLETED || isTerminalWorkflowStatus(task?.status)) {
    return TASK_TIMING_STATE.COMPLETED;
  }
  if (task?.isPaused || task?.timingState === TASK_TIMING_STATE.PAUSED || task?.status === "paused") {
    return TASK_TIMING_STATE.PAUSED;
  }

  const dueAt =
    calculateDueTime(startedAt, task?.estimatedMinutes, getEffectivePausedDurationMs(task, current)) ||
    toDate(task?.dueAt);

  if (dueAt && current.getTime() > dueAt.getTime()) {
    return TASK_TIMING_STATE.OVERDUE;
  }

  return TASK_TIMING_STATE.IN_PROGRESS;
}

export function syncTaskTimingFields(task, now = new Date()) {
  const current = toDate(now) || new Date();
  const estimatedMinutes = Math.max(
    0,
    getEstimatedTotalMinutes(task)
  );

  task.estimatedMinutes = estimatedMinutes;
  task.estimatedHours = Math.floor(estimatedMinutes / 60);
  task.estimatedTotalMinutes = estimatedMinutes;
  task.pausedDurationMs = Math.max(
    toMs(task?.pausedDurationMs),
    Math.round((Number(task?.totalPausedTimeInSeconds) || 0) * 1000)
  );
  task.pausedDurationMinutes = Math.floor(task.pausedDurationMs / 60000);

  const effectivePausedMs = task.pausedDurationMs + (Number(task?.totalHoldTimeInSeconds) || 0) * 1000 + getOngoingBlockedDurationMs(task, current);
  const computedDueAt = calculateDueTime(task?.startedAt, estimatedMinutes, effectivePausedMs);
  task.dueAt = computedDueAt;
  // NOTE: task.dueDate is intentionally NOT overwritten here.
  // dueDate = the user-set absolute deadline (shown in reports, calendar, due-date display).
  // dueAt   = the timer-computed deadline (startedAt + estimatedMinutes + pausedDurationMs).
  // These serve different purposes and must remain independent.

  task.timingState = resolveTaskTimingState(task, current);
  if (task.timingState === TASK_TIMING_STATE.OVERDUE && task.status === "in-progress") {
    task.status = "overdue";
  }

  return {
    estimatedMinutes,
    pausedDurationMs: task.pausedDurationMs,
    dueAt: task.dueAt,
    dueDate: task.dueDate,
    timingState: task.timingState,
  };
}

export function calculateRemainingTime(task, now = new Date()) {
  const nowDate = toDate(now) || new Date();
  const timingState = resolveTaskTimingState(task, nowDate);
  const estimatedMinutes = getEstimatedTotalMinutes(task);
  const metrics = calculateTaskMetrics(task, nowDate);
  const activeWorkedMs = metrics.activeWorkedMs;
  const pausedDurationMs = metrics.pausedMs + metrics.holdMs;
  const effectiveDueAt = metrics.effectiveDueAt || toDate(task?.dueAt) || toDate(task?.dueDate);
  const shouldTrackDeadline = Boolean(metrics.isStarted) && estimatedMinutes > 0;
  const estimatedLabel = estimatedMinutes > 0 ? formatDurationFromMinutes(estimatedMinutes) : "No estimate set";
  const activeWorkedLabel = activeWorkedMs > 0 ? formatDurationFromMs(activeWorkedMs) : "0m";
  const pausedDurationLabel = pausedDurationMs > 0 ? formatDurationFromMs(pausedDurationMs) : "0m";

  if (!effectiveDueAt || !shouldTrackDeadline) {
    let state = "No estimate set";
    if (!task?.startedAt) state = "Not started";

    return {
      effectiveDueAt,
      shouldTrackDeadline,
      timingState,
      state,
      estimatedMinutes,
      estimatedLabel,
      activeWorkedMs,
      activeWorkedLabel,
      pausedDurationMs,
      pausedDurationLabel,
      remainingMs: null,
      remainingMinutes: null,
      remainingSeconds: null,
      remainingLabel: state,
      isDueNow: false,
      isOverdue: false,
      isDueSoon: false,
    };
  }

  const remainingMs = metrics.deadlineRemainingMs;
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const overdueByMinutes = Math.max(1, Math.ceil(Math.abs(remainingSeconds) / 60));
  const remainingDurationLabel = formatDurationFromMinutes(Math.abs(remainingMs) / 60000);

  let state = "In progress";
  if (timingState === TASK_TIMING_STATE.PAUSED) state = "Paused";
  if (metrics.isOverdue) state = `Overdue by ${remainingDurationLabel}`;
  else if (metrics.isDueSoon) state = `Due in ${remainingDurationLabel}`;

  const remainingLabel =
    metrics.isOverdue
      ? `Overdue by ${remainingDurationLabel}`
      : `${remainingDurationLabel} remaining`;

  return {
    effectiveDueAt,
    shouldTrackDeadline,
    timingState,
    state,
    estimatedMinutes,
    estimatedLabel,
    activeWorkedMs,
    activeWorkedLabel,
    pausedDurationMs,
    pausedDurationLabel,
    remainingMs,
    remainingMinutes: remainingMs / (60 * 1000),
    remainingSeconds,
    overdueByMinutes,
    remainingLabel,
    isDueNow: remainingSeconds === 0,
    isOverdue: metrics.isOverdue,
    isDueSoon: metrics.isDueSoon,
  };
}

export function getRemainingState(task, now = new Date()) {
  const timingState = resolveTaskTimingState(task, now);
  const metrics = calculateTaskMetrics(task, now);

  if (timingState === TASK_TIMING_STATE.COMPLETED) return REMAINING_STATE.COMPLETED;
  if (!task?.startedAt) return REMAINING_STATE.NOT_STARTED;
  if (toMinutes(task?.estimatedMinutes) <= 0) return REMAINING_STATE.NO_ESTIMATE;
  if (timingState === TASK_TIMING_STATE.PAUSED) return REMAINING_STATE.PAUSED;

  const remainingMs = metrics.deadlineRemainingMs;
  if (remainingMs === null) return REMAINING_STATE.NO_ESTIMATE;
  if (metrics.isOverdue) return REMAINING_STATE.OVERDUE;
  if (metrics.isDueSoon) return REMAINING_STATE.DUE_SOON;

  return REMAINING_STATE.IN_PROGRESS;
}

export function getRemainingLabel(task, now = new Date()) {
  return calculateRemainingTime(task, now).remainingLabel || "No estimate set";
}

export function shouldSendReminder(task, reminderType, now = new Date()) {
  if (!task || isTerminalWorkflowStatus(task.status)) return false;

  const normalized = normalizeTaskTiming(task, now);
  if (!normalized.shouldTrackDeadline || normalized.normalizedTimingState === REMAINING_STATE.PAUSED) {
    return false;
  }

  const remainingMinutes = normalized.remainingMinutes;
  const remainingSeconds = normalized.remainingSeconds;

  if (reminderType === "30m") {
    return !task.thirtyMinReminderSent && remainingMinutes <= 30 && remainingMinutes > 15;
  }
  if (reminderType === "15m") {
    return !task.fifteenMinReminderSent && remainingMinutes <= 15 && remainingMinutes > 0;
  }
  if (reminderType === "due-now") {
    return !task.dueNowReminderSent && remainingSeconds === 0;
  }
  if (reminderType === "overdue") {
    return !task.overdueReminderSent && remainingSeconds < 0;
  }

  return false;
}

export function normalizeTaskTiming(task, now = new Date()) {
  const metrics = calculateTaskMetrics(task, now);
  const terminal = isTerminalWorkflowStatus(task?.status);
  const shouldTrackDeadline = Boolean(metrics.isStarted) && metrics.estimatedMs > 0 && !terminal;
  const remainingMs = shouldTrackDeadline ? metrics.deadlineRemainingMs : null;
  const remainingSeconds = typeof remainingMs === 'number' ? Math.floor(remainingMs / 1000) : null;
  const remainingMinutes = typeof remainingMs === 'number' ? remainingMs / 60000 : null;
  const remainingState = terminal
    ? REMAINING_STATE.COMPLETED
    : !metrics.isStarted
      ? REMAINING_STATE.NOT_STARTED
      : metrics.estimatedMs <= 0
        ? REMAINING_STATE.NO_ESTIMATE
        : (metrics.isPaused || metrics.isOnHold)
          ? REMAINING_STATE.PAUSED
          : metrics.isOverdue
            ? REMAINING_STATE.OVERDUE
            : metrics.isDueSoon
              ? REMAINING_STATE.DUE_SOON
              : REMAINING_STATE.IN_PROGRESS;
  const remainingLabel = terminal
    ? 'Completed'
    : typeof remainingMs !== 'number'
      ? (!metrics.isStarted ? 'Not started' : metrics.estimatedMs <= 0 ? 'No estimate set' : 'Not tracking')
      : metrics.isOverdue
        ? `Overdue by ${formatDurationFromMs(Math.abs(remainingMs))}`
        : `${formatDurationFromMs(remainingMs)} remaining`;

  return {
    dueAt: metrics.effectiveDueAt || task?.dueAt || null,
    startedAt: task?.startedAt || null,
    pausedDurationMs: metrics.pausedMs + metrics.holdMs,
    pausedDurationLabel: formatDurationFromMs(metrics.pausedMs + metrics.holdMs),
    activeWorkedMs: metrics.activeWorkedMs,
    activeWorkedLabel: formatDurationFromMs(metrics.activeWorkedMs),
    estimatedMinutes: Math.round((metrics.estimatedMs || 0) / 60000),
    estimatedLabel: metrics.estimatedMs > 0 ? formatDurationFromMs(metrics.estimatedMs) : "No estimate set",
    remainingMs,
    remainingSeconds,
    remainingMinutes,
    remainingState,
    remainingLabel,
    isOverdue: metrics.isOverdue,
    isDueSoon: metrics.isDueSoon,
    normalizedTimingState: remainingState,
    shouldTrackDeadline,
    metrics: {
      ...metrics,
      effectiveDueAt: metrics.effectiveDueAt || null,
    },
  };
}

export function extendTaskTime(task, additionalMinutes, addedBy, remarksText) {
  const extra = toMinutes(additionalMinutes);
  if (extra <= 0) {
    throw new Error("Additional time must be greater than 0 minutes");
  }

  const remarks = `${remarksText || ""}`.trim();
  if (!remarks) {
    throw new Error("Remarks are required for time extension");
  }

  const previousDue =
    calculateDueTime(task.startedAt, task.estimatedMinutes, task.pausedDurationMs) ||
    toDate(task.dueAt) ||
    toDate(task.dueDate);

  if (!previousDue) {
    throw new Error("Task due time is not available for extension");
  }

  const newDue = new Date(previousDue.getTime() + extra * 60 * 1000);

  task.dueAt = newDue;
  task.dueDate = newDue;
  task.extendedTimeMinutes = toMinutes(task.extendedTimeMinutes) + extra;
  task.extensionCount = toMinutes(task.extensionCount) + 1;
  task.taskExtended = true;
  task.status = "extended";
  task.overdueReminderSent = false;
  task.dueNowReminderSent = false;

  task.extensionHistory.push({
    addedMinutes: extra,
    previousDueAt: previousDue,
    newDueAt: newDue,
    remarks,
    extendedAt: new Date(),
    addedBy,
  });

  task.remarks.push({
    type: "extension",
    text: remarks,
    addedAt: new Date(),
    addedBy,
  });

  return task;
}

export function markTaskRejected(task, rejectionReason, userId) {
  const reason = `${rejectionReason || ""}`.trim();
  if (!reason) {
    throw new Error("Rejection reason is required");
  }

  task.status = "rejected";
  task.rejectionReason = reason;
  task.rejectedBy = userId;
  task.rejectedAt = new Date();
  task.isRunning = false;
  task.isPaused = false;
  task.currentSessionStartTime = null;
  task.timingState = TASK_TIMING_STATE.COMPLETED;

  task.remarks.push({
    type: "rejection",
    text: reason,
    addedAt: new Date(),
    addedBy: userId,
  });

  return task;
}

export function logTaskTimingSnapshot(task, now = new Date(), source = "timing") {
  if (!enableDebugMode) return;

  const snapshot = calculateRemainingTime(task, now);
  console.log("[TaskTimingDebug]", {
    source,
    taskId: task?._id?.toString?.() || null,
    createdAt: task?.createdAt || null,
    startedAt: task?.startedAt || null,
    dueAt: snapshot.effectiveDueAt || task?.dueAt || null,
    estimatedMinutes: task?.estimatedMinutes ?? null,
    remainingMs: snapshot.remainingMs,
    status: task?.status || null,
    timingState: snapshot.timingState,
  });
}

export function setTaskTimingDebugMode(enabled) {
  enableDebugMode = Boolean(enabled);
}

export function getTaskTimingDebugMode() {
  return enableDebugMode;
}

export function formatToIST(dateInput) {
  const date = toDate(dateInput);
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

export function getTaskDueDisplay(task) {
  if (!task) return 'No due date';
  const due = task.dueAt || task.dueDate;
  if (!due) return 'No due date';
  return formatToIST(due);
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
    rejectedTasks >= Math.max(2, Math.floor(totalTasks * 0.2)) ||
    overdueWithoutRequest >= Math.max(2, Math.floor(totalTasks * 0.25)) ||
    rejectedExtensions >= Math.max(2, Math.floor(extensionRequests * 0.5)) ||
    (extensionRequests > 0 && approvedExtensionRatio < 0.4)
  ) {
    classification = "Liability";
  }

  return {
    classification,
    onTimeRate: Number(onTimeRate.toFixed(2)),
  };
}

