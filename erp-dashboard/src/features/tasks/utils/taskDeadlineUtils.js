const IST_TIMEZONE = "Asia/Kolkata";

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

export function calculateDueTime(startedAt, estimatedMinutes, pausedDurationMinutes = 0) {
  const start = toDate(startedAt);
  const estimated = toMinutes(estimatedMinutes);
  if (!start || estimated <= 0) return null;

  const pausedMs = Math.max(0, Math.round(Number(pausedDurationMinutes) || 0));
  const normalizedPausedMs = pausedMs > 1000 ? pausedMs : toMinutes(pausedDurationMinutes) * 60000;
  return new Date(start.getTime() + estimated * 60000 + normalizedPausedMs);
}

export function calculateRemainingTime(task, now = new Date()) {
  // Completed tasks must never show overdue or remaining time
  if (task?.status === 'completed') {
    return {
      shouldTrackDeadline: false,
      effectiveDueAt: toDate(task?.dueDate),
      state: 'Completed',
      remainingMs: null,
      remainingMinutes: null,
      remainingSeconds: null,
      isOverdue: false,
      isDueNow: false,
      isCompleted: true,
    };
  }

  const current = toDate(now) || new Date();
  const effectiveDueAt =
    calculateDueTime(task?.startedAt, task?.estimatedMinutes, task?.pausedDurationMs ?? task?.pausedDurationMinutes) ||
    toDate(task?.dueAt) ||
    toDate(task?.dueDate);

  const shouldTrackDeadline = Boolean(task?.startedAt) && toMinutes(task?.estimatedMinutes) > 0;

  if (!effectiveDueAt || !shouldTrackDeadline) {
    const state = !task?.startedAt ? 'Not started' : 'No estimate set';
    return {
      shouldTrackDeadline,
      effectiveDueAt,
      state,
      remainingMs: null,
      remainingMinutes: null,
      remainingSeconds: null,
      isOverdue: false,
      isDueNow: false,
    };
  }

  const remainingMs = effectiveDueAt.getTime() - current.getTime();
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const overdueByMinutes = Math.max(1, Math.ceil(Math.abs(remainingSeconds) / 60));

  // Format overdue duration as "Xh Ym" instead of raw minutes
  const h = Math.floor(overdueByMinutes / 60);
  const m = overdueByMinutes % 60;
  const overdueDurationStr = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;

  return {
    shouldTrackDeadline,
    effectiveDueAt,
    state: remainingSeconds < 0 ? `Overdue by ${overdueDurationStr}` : 'In progress',
    remainingMs,
    remainingMinutes: remainingMs / 60000,
    remainingSeconds,
    overdueByMinutes,
    isDueNow: remainingSeconds === 0,
    isOverdue: remainingSeconds < 0,
  };
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
  const existingDue = toDate(task?.dueAt) || toDate(task?.dueDate);
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
