/**
 * Task Reminder System
 * Handles daily reminders for incomplete tasks using cron jobs
 * Sends notifications to users about overdue, due today, and urgent tasks
 */

const cron = require('node-cron');
const taskService = require('./tasks.service');
const notificationService = require('../notifications/notification.service');
const User = require('../users/User.model');

let reminderJobId = null;

/**
 * Initialize the task reminder system
 * Schedules a daily reminder job to run at 9 AM
 */
const initializeTaskReminders = () => {
  console.log('🔔 [REMINDERS] Initializing task reminder system...');
  
  // Schedule daily reminder at 9:00 AM every weekday (Mon-Fri)
  // Cron format: minute hour day month weekday
  // 0 9 * * 1-5 = Every weekday at 9:00 AM
  reminderJobId = cron.schedule('0 9 * * 1-5', async () => {
    console.log('📬 [REMINDERS] Running daily task reminder job at', new Date().toISOString());
    
    try {
      const result = await sendDailyTaskReminders();
      console.log('✅ [REMINDERS] Daily task reminders sent successfully', result);
    } catch (error) {
      console.error('❌ [REMINDERS] Error sending daily task reminders:', error);
    }
  });
  
  console.log('✅ [REMINDERS] Task reminder system initialized');
  return reminderJobId;
};

/**
 * Send daily task reminders to all users with incomplete tasks
 * Groups tasks by category and sends appropriate notifications
 */
const sendDailyTaskReminders = async () => {
  try {
    console.log('📅 [REMINDERS] Starting daily task reminders process...');
    
    // Get all incomplete tasks reminders data
    const remindersData = await taskService.sendDailyIncompleteTasksReminder();
    
    if (!remindersData.reminders || remindersData.reminders.length === 0) {
      console.log('ℹ️ [REMINDERS] No users with incomplete tasks to remind');
      return {
        success: true,
        remindersCount: 0,
        message: 'No incomplete tasks found'
      };
    }
    
    // Send notifications to each user
    let notificationsSent = 0;
    const notificationResults = [];
    
    for (const reminder of remindersData.reminders) {
      try {
        // Create a comprehensive notification message
        const taskSummary = createTaskSummary(reminder);
        
        // Send notification to user
        const notification = await notificationService.createNotification({
          userId: reminder.userId,
          type: 'TASK_REMINDER',
          title: 'Daily Task Reminder',
          message: taskSummary,
          data: {
            taskCounts: reminder.taskCounts,
            taskIds: [
              ...reminder.tasks.overdue.map(t => t.id),
              ...reminder.tasks.dueToday.map(t => t.id),
              ...reminder.tasks.urgent.map(t => t.id)
            ],
            reminderType: 'DAILY_INCOMPLETE_TASKS'
          }
        });
        
        notificationsSent++;
        notificationResults.push({
          userId: reminder.userId,
          userName: reminder.userName,
          success: true,
          notificationId: notification._id
        });
        
        console.log(`📧 [REMINDERS] Notification sent to ${reminder.userName}`);
      } catch (error) {
        console.error(`❌ [REMINDERS] Failed to send notification to user ${reminder.userId}:`, error);
        notificationResults.push({
          userId: reminder.userId,
          userName: reminder.userName,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`✅ [REMINDERS] Daily reminder process completed. Sent ${notificationsSent}/${remindersData.reminders.length} notifications`);
    
    return {
      success: true,
      remindersCount: remindersData.reminders.length,
      notificationsSent,
      timestamp: new Date(),
      message: `Daily reminders sent. ${notificationsSent} notifications delivered to users with incomplete tasks.`,
      results: notificationResults
    };
  } catch (error) {
    console.error('❌ [REMINDERS] Error in sendDailyTaskReminders:', error);
    throw error;
  }
};

/**
 * Create a user-friendly summary of tasks for notification
 */
const createTaskSummary = (reminder) => {
  const lines = [];
  
  lines.push(`Hello ${reminder.userName},`);
  lines.push('');
  lines.push(`📋 You have ${reminder.taskCounts.total} incomplete task${reminder.taskCounts.total !== 1 ? 's' : ''} awaiting your attention:`);
  lines.push('');
  
  if (reminder.taskCounts.overdue > 0) {
    lines.push(`🚨 ${reminder.taskCounts.overdue} overdue task${reminder.taskCounts.overdue !== 1 ? 's' : ''}`);
  }
  
  if (reminder.taskCounts.dueToday > 0) {
    lines.push(`📅 ${reminder.taskCounts.dueToday} due today`);
  }
  
  if (reminder.taskCounts.urgent > 0) {
    lines.push(`⚡ ${reminder.taskCounts.urgent} urgent task${reminder.taskCounts.urgent !== 1 ? 's' : ''}`);
  }
  
  lines.push('');
  lines.push('Please visit your task dashboard to review and update your tasks.');
  
  return lines.join('\n');
};

/**
 * Manually trigger a task reminder (for testing or on-demand)
 */
const triggerTaskReminderManually = async () => {
  console.log('🔔 [REMINDERS] Manual trigger of task reminders...');
  return await sendDailyTaskReminders();
};

/**
 * Stop the task reminder system
 */
const stopTaskReminders = () => {
  if (reminderJobId) {
    reminderJobId.stop();
    console.log('⏹️ [REMINDERS] Task reminder system stopped');
    return true;
  }
  return false;
};

/**
 * Restart the task reminder system
 */
const restartTaskReminders = () => {
  console.log('🔄 [REMINDERS] Restarting task reminder system...');
  stopTaskReminders();
  return initializeTaskReminders();
};

/**
 * Get the status of the task reminder system
 */
const getTaskReminderStatus = () => {
  return {
    isRunning: reminderJobId ? !reminderJobId.stopped : false,
    nextExecution: reminderJobId ? 'Scheduled for 9:00 AM on weekdays' : 'Not running',
    jobId: reminderJobId ? 'Active' : 'Inactive',
    schedule: '9:00 AM every weekday (Monday-Friday)'
  };
};

module.exports = {
  initializeTaskReminders,
  sendDailyTaskReminders,
  triggerTaskReminderManually,
  stopTaskReminders,
  restartTaskReminders,
  getTaskReminderStatus
};
