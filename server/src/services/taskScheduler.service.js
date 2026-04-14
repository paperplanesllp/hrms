import cron from "node-cron";
import { Task } from "../modules/tasks/Task.model.js";
import { createNotificationsForUsers } from "../utils/notificationHelper.js";
import { calculateRemainingTime } from "../modules/tasks/taskDeadline.utils.js";

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
      "_id title assignedTo startedAt estimatedMinutes pausedDurationMinutes dueAt dueDate status isPaused thirtyMinReminderSent fifteenMinReminderSent dueNowReminderSent overdueReminderSent taskExtended"
    );

    for (const task of tasks) {
      if (task.isPaused) continue;

      const time = calculateRemainingTime(task, now);
      if (!time.shouldTrackDeadline || !time.effectiveDueAt) continue;

      const patch = { dueAt: time.effectiveDueAt, dueDate: time.effectiveDueAt };

      if (!task.thirtyMinReminderSent && time.remainingMinutes <= 30 && time.remainingMinutes > 15) {
        await notifyAssignees(task, "30m");
        patch.thirtyMinReminderSent = true;
        patch.status = task.status === "in-progress" ? "due-soon" : task.status;
      }

      if (!task.fifteenMinReminderSent && time.remainingMinutes <= 15 && time.remainingMinutes > 0) {
        await notifyAssignees(task, "15m");
        patch.fifteenMinReminderSent = true;
        patch.status = "due-soon";
      }

      if (!task.dueNowReminderSent && time.isDueNow) {
        await notifyAssignees(task, "due-now");
        patch.dueNowReminderSent = true;
      }

      if (!task.overdueReminderSent && time.isOverdue) {
        await notifyAssignees(task, "overdue");
        patch.overdueReminderSent = true;
        patch.isOverdueNotified = true;
        if (task.status !== "extension_requested") {
          patch.status = "overdue";
        }
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
