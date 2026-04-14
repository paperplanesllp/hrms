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

  return new Date(start.getTime() + (estimated + toMinutes(pausedDurationMinutes)) * 60000);
}

export function calculateRemainingTime(task, now = new Date()) {
  const current = toDate(now) || new Date();
  const effectiveDueAt =
    calculateDueTime(task?.startedAt, task?.estimatedMinutes, task?.pausedDurationMinutes) ||
    toDate(task?.dueAt) ||
    toDate(task?.dueDate);

  const shouldTrackDeadline = Boolean(task?.startedAt) && toMinutes(task?.estimatedMinutes) > 0;

  if (!effectiveDueAt || !shouldTrackDeadline) {
    return {
      shouldTrackDeadline,
      effectiveDueAt,
      remainingMs: null,
      remainingMinutes: null,
      isOverdue: false,
      isDueNow: false,
    };
  }

  const remainingMs = effectiveDueAt.getTime() - current.getTime();
  return {
    shouldTrackDeadline,
    effectiveDueAt,
    remainingMs,
    remainingMinutes: remainingMs / 60000,
    isDueNow: remainingMs <= 0 && remainingMs > -60000,
    isOverdue: remainingMs <= -60000,
  };
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
