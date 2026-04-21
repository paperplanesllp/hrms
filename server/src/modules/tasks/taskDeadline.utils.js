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

const isTerminalWorkflowStatus = (status) =>
  ["completed", "rejected", "cancelled"].includes(status);

export function calculateDueTime(startedAt, estimatedMinutes, pausedDurationMs = 0) {
  const startDate = toDate(startedAt);
  if (!startDate) return null;

  const estimated = toMinutes(estimatedMinutes);
  if (estimated <= 0) return null;

  const paused = toMs(pausedDurationMs);
  return new Date(startDate.getTime() + estimated * 60 * 1000 + paused);
}

export const calculateDueAt = calculateDueTime;

export function getRemainingMs(task, now = new Date()) {
  const current = toDate(now) || new Date();
  const dueAt =
    calculateDueAt(task?.startedAt, task?.estimatedMinutes, task?.pausedDurationMs) ||
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
    calculateDueTime(startedAt, task?.estimatedMinutes, task?.pausedDurationMs) ||
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
    Number.isFinite(Number(task?.estimatedMinutes))
      ? Math.round(Number(task.estimatedMinutes))
      : Math.round((Number(task?.estimatedHours) || 0) * 60)
  );

  task.estimatedMinutes = estimatedMinutes;
  task.pausedDurationMs = Math.max(
    toMs(task?.pausedDurationMs),
    Math.round((Number(task?.totalPausedTimeInSeconds) || 0) * 1000)
  );
  task.pausedDurationMinutes = Math.floor(task.pausedDurationMs / 60000);

  const computedDueAt = calculateDueTime(task?.startedAt, estimatedMinutes, task.pausedDurationMs);
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
  const effectiveDueAt =
    calculateDueTime(task?.startedAt, task?.estimatedMinutes, task?.pausedDurationMs) ||
    toDate(task?.dueAt) ||
    toDate(task?.dueDate);

  const shouldTrackDeadline = Boolean(task?.startedAt) && toMinutes(task?.estimatedMinutes) > 0;

  if (!effectiveDueAt || !shouldTrackDeadline) {
    let state = "No estimate set";
    if (!task?.startedAt) state = "Not started";

    return {
      effectiveDueAt,
      shouldTrackDeadline,
      timingState,
      state,
      remainingMs: null,
      remainingMinutes: null,
      remainingSeconds: null,
      isDueNow: false,
      isOverdue: false,
    };
  }

  const remainingMs = effectiveDueAt.getTime() - nowDate.getTime();
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const overdueByMinutes = Math.max(1, Math.ceil(Math.abs(remainingSeconds) / 60));

  let state = "In progress";
  if (timingState === TASK_TIMING_STATE.PAUSED) state = "Paused";
  if (remainingSeconds < 0) state = `Overdue by ${overdueByMinutes} min`;

  return {
    effectiveDueAt,
    shouldTrackDeadline,
    timingState,
    state,
    remainingMs,
    remainingMinutes: remainingMs / (60 * 1000),
    remainingSeconds,
    overdueByMinutes,
    isDueNow: remainingSeconds === 0,
    isOverdue: remainingSeconds < 0,
  };
}

export function getRemainingState(task, now = new Date()) {
  const timingState = resolveTaskTimingState(task, now);

  if (timingState === TASK_TIMING_STATE.COMPLETED) return REMAINING_STATE.COMPLETED;
  if (!task?.startedAt) return REMAINING_STATE.NOT_STARTED;
  if (toMinutes(task?.estimatedMinutes) <= 0) return REMAINING_STATE.NO_ESTIMATE;
  if (timingState === TASK_TIMING_STATE.PAUSED) return REMAINING_STATE.PAUSED;

  const remainingMs = getRemainingMs(task, now);
  if (remainingMs === null) return REMAINING_STATE.NO_ESTIMATE;
  if (remainingMs < 0) return REMAINING_STATE.OVERDUE;
  if (remainingMs <= 30 * 60 * 1000) return REMAINING_STATE.DUE_SOON;

  return REMAINING_STATE.IN_PROGRESS;
}

export function getRemainingLabel(task, now = new Date()) {
  const state = getRemainingState(task, now);
  const remainingMs = getRemainingMs(task, now);

  if (state === REMAINING_STATE.NOT_STARTED) return "Not started";
  if (state === REMAINING_STATE.NO_ESTIMATE) return "No estimate set";
  if (state === REMAINING_STATE.PAUSED) return "Paused";
  if (state === REMAINING_STATE.COMPLETED) return "Completed";
  if (remainingMs === null) return "No estimate set";

  const absMinutes = Math.max(1, Math.ceil(Math.abs(remainingMs) / 60000));
  const absHours = Math.floor(absMinutes / 60);
  const restMinutes = absMinutes % 60;
  const duration = absHours > 0 ? `${absHours}h ${restMinutes}m` : `${restMinutes}m`;

  if (state === REMAINING_STATE.OVERDUE) {
    return `Overdue by ${absMinutes}m`;
  }
  if (state === REMAINING_STATE.DUE_SOON) {
    return `Due in ${duration}`;
  }

  return `${duration} remaining`;
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
  const remaining = calculateRemainingTime(task, now);
  const remainingState = getRemainingState(task, now);
  const remainingLabel = getRemainingLabel(task, now);
  const isDueSoon = remainingState === REMAINING_STATE.DUE_SOON;

  return {
    dueAt: remaining.effectiveDueAt || task?.dueAt || null,
    startedAt: task?.startedAt || null,
    pausedDurationMs: toMs(task?.pausedDurationMs),
    remainingMs: remaining.remainingMs,
    remainingSeconds: remaining.remainingSeconds,
    remainingMinutes: remaining.remainingMinutes,
    remainingState,
    remainingLabel,
    isOverdue: remainingState === REMAINING_STATE.OVERDUE,
    isDueSoon,
    normalizedTimingState: remainingState,
    shouldTrackDeadline: remaining.shouldTrackDeadline,
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
