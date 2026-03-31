import cron from "node-cron";
import { Task } from "../modules/tasks/Task.model.js";
import { 
  notifyDueReminder, 
  notifyTaskOverdue 
} from "../utils/notificationHelper.js";

let schedulerActive = false;

/**
 * Initialize task scheduler
 * Checks every minute for:
 * 1. Tasks with due reminders (1h, 1d, 2d before due date)
 * 2. Tasks that are overdue
 */
export function initializeTaskScheduler() {
  if (schedulerActive) {
    console.log("⏭️ Task scheduler already running");
    return;
  }

  // Run every minute
  const taskScheduler = cron.schedule("* * * * *", async () => {
    try {
      await checkForDueReminders();
      await checkForOverdueTasks();
    } catch (error) {
      console.error("❌ Task scheduler error:", error);
    }
  });

  schedulerActive = true;
  console.log("✅ Task scheduler initialized - running every minute");

  return taskScheduler;
}

/**
 * Check for tasks with due reminders
 * Sends notifications for tasks due in: 2 days, 1 day, 1 hour
 */
async function checkForDueReminders() {
  try {
    const now = new Date();

    // Reminder windows: [2 days, 1 day, 1 hour]
    const reminderWindows = [
      { minutes: 1440, label: "1 day" },      // 1 day = 1440 minutes
      { minutes: 1500, label: "1d 1h" },     // 1 day 1 hour
      { minutes: 1530, label: "1d 30m" },    // 1 day 30 min
      { minutes: 60, label: "1 hour" },      // 1 hour = 60 minutes
      { minutes: 90, label: "1.5 hours" },   // 1.5 hours
      { minutes: 2880, label: "2 days" }     // 2 days = 2880 minutes
    ];

    for (const window of reminderWindows) {
      const minutesFromNow = window.minutes;
      const reminderTime = new Date(now.getTime() + minutesFromNow * 60000);

      // Find tasks with due dates in this window
      // Check if task status is not 'completed' and has a reminder preference
      const tasks = await Task.find({
        status: { $ne: "completed" },
        dueDate: {
          $gte: new Date(reminderTime.getTime() - 2 * 60000), // 2 minutes before window
          $lte: new Date(reminderTime.getTime() + 2 * 60000)  // 2 minutes after window
        },
        "reminders.lastNotified": {
          $ne: reminderTime.toISOString().split('T')[0] // Not already sent today
        }
      })
      .select("_id assignedTo title dueDate reminders")
      .lean();

      for (const task of tasks) {
        try {
          // Check if assignee has this reminder enabled
          const hasDueReminder = task.reminders && task.reminders.length > 0;
          if (hasDueReminder) {
            await notifyDueReminder(task._id.toString(), task.assignedTo.toString());
            console.log(`✅ Due reminder sent for task: ${task.title} (${window.label})`);
          }
        } catch (error) {
          console.error(`❌ Error sending due reminder for task ${task._id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error checking for due reminders:", error);
  }
}

/**
 * Check for overdue tasks
 * Sends notifications for tasks whose due date has passed
 */
async function checkForOverdueTasks() {
  try {
    const now = new Date();

    // Find tasks with due dates that have passed and are not completed
    const overdueTasks = await Task.find({
      status: { $ne: "completed" },
      dueDate: { $lt: now },
      isOverdueNotified: { $ne: true } // Only notify once
    })
    .select("_id title assignedTo assignedBy")
    .lean();

    for (const task of overdueTasks) {
      try {
        await notifyTaskOverdue(task._id.toString());
        
        // Mark task as notified
        await Task.findByIdAndUpdate(
          task._id,
          { isOverdueNotified: true },
          { new: true }
        );

        console.log(`✅ Overdue notification sent for task: ${task.title}`);
      } catch (error) {
        console.error(`❌ Error sending overdue notification for task ${task._id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error checking for overdue tasks:", error);
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
