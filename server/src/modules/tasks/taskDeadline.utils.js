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
  const startDate = toDate(startedAt);
  if (!startDate) return null;

  const estimated = toMinutes(estimatedMinutes);
  if (estimated <= 0) return null;

  const paused = toMinutes(pausedDurationMinutes);
  return new Date(startDate.getTime() + (estimated + paused) * 60 * 1000);
}

export function calculateRemainingTime(task, now = new Date()) {
  const nowDate = toDate(now) || new Date();
  const effectiveDueAt =
    calculateDueTime(task?.startedAt, task?.estimatedMinutes, task?.pausedDurationMinutes) ||
    toDate(task?.dueAt) ||
    toDate(task?.dueDate);

  const shouldTrackDeadline = Boolean(task?.startedAt) && toMinutes(task?.estimatedMinutes) > 0;

  if (!effectiveDueAt || !shouldTrackDeadline) {
    return {
      effectiveDueAt,
      shouldTrackDeadline,
      remainingMinutes: null,
      remainingSeconds: null,
      isDueNow: false,
      isOverdue: false,
    };
  }

  const remainingMs = effectiveDueAt.getTime() - nowDate.getTime();
  const remainingSeconds = Math.floor(remainingMs / 1000);

  return {
    effectiveDueAt,
    shouldTrackDeadline,
    remainingMinutes: remainingMs / (60 * 1000),
    remainingSeconds,
    isDueNow: remainingSeconds <= 0 && remainingSeconds > -60,
    isOverdue: remainingSeconds <= -60,
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
    calculateDueTime(task.startedAt, task.estimatedMinutes, task.pausedDurationMinutes) ||
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

  task.remarks.push({
    type: "rejection",
    text: reason,
    addedAt: new Date(),
    addedBy: userId,
  });

  return task;
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
