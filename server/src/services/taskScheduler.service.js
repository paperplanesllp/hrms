import cron from "node-cron";
import { Task } from "../modules/tasks/Task.model.js";
import { createNotificationsForUsers } from "../utils/notificationHelper.js";
import {
  TASK_TIMING_STATE,
  normalizeTaskTiming,
  shouldSendReminder,
  syncTaskTimingFields,
} from "../modules/tasks/taskDeadline.utils.js";

let schedulerActive = false;

/**
 * Initialize task scheduler
 * Checks every minute for:
 * 1. Deadline reminders (30m, 15m, due-now)
 * 2. Overdue transitions
 */
export function initializeTaskScheduler() {
  if (schedulerActive) {
    console.log("⏭️ Task scheduler already running");
    return;
  }

  // Run every minute
  const taskScheduler = cron.schedule("* * * * *", async () => {
    try {
      await checkTaskDeadlines();
    } catch (error) {
      console.error("❌ Task scheduler error:", error);
    }
  });

  schedulerActive = true;
  console.log("✅ Task scheduler initialized - running every minute");

  return taskScheduler;
}

/**
 * Build standardized reminder title and message.
 */
function buildReminderTemplate(type, taskName) {
  if (type === "30m") {
    return {
      title: "⏰ Task Reminder",
      message: `"${taskName}" is due in 30 minutes.\nPlease plan to complete it on time.`,
    };
  }

  if (type === "15m") {
    return {
      title: "⚠️ Task Due Soon",
      message: `"${taskName}" is due in 15 minutes.\nPlease give it immediate attention.`,
    };
  }

  if (type === "due-now") {
    return {
      title: "🚨 Task Deadline Reached",
      message: `"${taskName}" has reached its deadline.\nPlease complete it as soon as possible.`,
    };
  }

  return {
    title: "⚠️ Task Overdue",
    message: `"${taskName}" is now overdue.\nPlease prioritize and complete it as soon as possible.`,
  };
}

async function notifyAssignees(task, type) {
  const assigneeIds = (task.assignedTo || []).map((u) => u.toString());
  if (!assigneeIds.length) return;

  const payload = buildReminderTemplate(type, task.title || "Untitled Task");

  await createNotificationsForUsers(assigneeIds, {
    taskId: task._id,
    eventType: type === "overdue" ? "task-overdue" : "task-due-reminder",
    title: payload.title,
    message: payload.message,
    triggeredBy: null,
  });
}

/**
 * Evaluate all started tasks with estimated minutes and send one-time reminders.
 */
async function checkTaskDeadlines() {
  try {
    const now = new Date();

    const tasks = await Task.find({
      isDeleted: false,
      startedAt: { $ne: null },
      estimatedMinutes: { $gt: 0 },
      status: { $nin: ["completed", "cancelled", "rejected"] },
    }).select(
      "_id title assignedTo startedAt estimatedMinutes pausedDurationMs pausedDurationMinutes totalPausedTimeInSeconds dueAt dueDate status isPaused thirtyMinReminderSent fifteenMinReminderSent dueNowReminderSent overdueReminderSent taskExtended"
    );

    for (const task of tasks) {
      if (task.isPaused) continue;

      syncTaskTimingFields(task, now);
      const normalized = normalizeTaskTiming(task, now);
      if (!normalized.shouldTrackDeadline || !normalized.dueAt) continue;

      const patch = {
        dueAt: normalized.dueAt,
        dueDate: normalized.dueAt,
        timingState: normalized.isOverdue ? TASK_TIMING_STATE.OVERDUE : TASK_TIMING_STATE.IN_PROGRESS,
      };

      if (shouldSendReminder(task, "30m", now)) {
        await notifyAssignees(task, "30m");
        patch.thirtyMinReminderSent = true;
        patch.status = task.status === "in-progress" ? "due-soon" : task.status;
      }

      if (shouldSendReminder(task, "15m", now)) {
        await notifyAssignees(task, "15m");
        patch.fifteenMinReminderSent = true;
        patch.status = "due-soon";
      }

      if (shouldSendReminder(task, "due-now", now)) {
        await notifyAssignees(task, "due-now");
        patch.dueNowReminderSent = true;
      }

      if (shouldSendReminder(task, "overdue", now)) {
        await notifyAssignees(task, "overdue");
        patch.overdueReminderSent = true;
        patch.isOverdueNotified = true;
        if (task.status !== "extension_requested") {
          patch.status = "overdue";
        }
      }

      if (patch.status && patch.status !== task.status) {
        console.log("[TaskScheduler] status transition", {
          taskId: task._id.toString(),
          from: task.status,
          to: patch.status,
        });
      }

      await Task.updateOne({ _id: task._id }, { $set: patch });
    }
  } catch (error) {
    console.error("❌ Error while checking task deadlines:", error);
  }
}

/**
 * Stop the scheduler
 */
export function stopTaskScheduler() {
  schedulerActive = false;
  console.log("✅ Task scheduler stopped");
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    active: schedulerActive,
    status: schedulerActive ? "Running" : "Stopped"
  };
}

export default {
  initializeTaskScheduler,
  stopTaskScheduler,
  getSchedulerStatus
};
