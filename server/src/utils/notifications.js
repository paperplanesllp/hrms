import Notification from "../modules/notifications/Notification.model.js";
import { User } from "../modules/users/User.model.js";
import { sendTaskEmail } from "../services/emailNotification.service.js";
import { io } from "../utils/socket.js";

/**
 * Send in-app and email notification for task events
 * Wrapper function to integrate with existing controller code
 * @param {string} userId - Recipient user ID
 * @param {object} options - Notification options
 * @param {string} options.type - Notification type (e.g., 'task_forwarded', 'task_reassigned')
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.taskId - Task ID
 * @param {string} options.relatedUserId - User ID who triggered the action (optional)
 * @returns {Promise<object>} - Created notification
 */
export async function sendNotification(userId, options) {
  try {
    const {
      type,
      title,
      message,
      taskId,
      relatedUserId = null
    } = options;

    // Map old notification types to new format
    const typeMap = {
      'task_forwarded': 'task-forwarded',
      'task_reassigned': 'task-reassigned',
      'task_completed': 'task-completed',
      'task_accepted': 'task-accepted',
      'task_rejected': 'task-rejected',
      'task_on_hold': 'task-on-hold',
      'news': 'news',
      'policy': 'policy',
      'reminder': 'reminder',
      'system': 'system'
    };

    const mappedType = typeMap[type] || type;

    // Fetch user to check email preferences
    const user = await User.findById(userId).lean();
    if (!user) {
      console.warn(`User not found for notification: ${userId}`);
      return null;
    }

    // Create in-app notification
    const notification = new Notification({
      userId,
      type: mappedType,
      title,
      message,
      targetUrl: taskId ? `/tasks/${taskId}` : '/',
      taskId: taskId || null,
      triggeredBy: relatedUserId || null,
      emailSent: false
    });

    await notification.save();

    // Emit real-time socket notification
    io.to(`user_${userId}`).emit("notification", {
      id: notification._id,
      type: mappedType,
      title,
      message,
      taskId,
      createdAt: notification.createdAt
    });

    // Optionally send email based on preferences
    // Note: Email sending is optional for backward compatibility
    // Users can enable it in their preferences
    const preferences = user.emailNotificationPreferences || {};
    const preferenceKey = getPreferenceKey(mappedType);
    const shouldSendEmail = preferenceKey ? preferences[preferenceKey] !== false : false;

    if (shouldSendEmail && user.email && taskId) {
      // Prepare task data for email
      const { Task } = await import("../modules/tasks/Task.model.js");
      const task = await Task.findById(taskId).populate("assignedBy", "name").lean();
      
      if (task) {
        const taskData = {
          taskId: task._id.toString(),
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
          status: task.status,
          assignedByName: task.assignedBy?.name || "System"
        };

        const emailSent = await sendTaskEmail(user.email, mappedType, taskData);
        if (emailSent) {
          notification.emailSent = true;
          notification.emailSentAt = new Date();
          await notification.save();
        }
      }
    }

    console.log(`✅ Notification sent to ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    return null;
  }
}

/**
 * Map notification type to email preference key
 * @param {string} type - Notification type
 * @returns {string|null} - Preference key or null
 */
function getPreferenceKey(type) {
  const preferenceMap = {
    'task-assigned': 'taskAssigned',
    'task-accepted': 'taskAccepted',
    'task-rejected': 'taskRejected',
    'task-completed': 'taskCompleted',
    'task-reassigned': 'taskReassigned',
    'task-forwarded': 'taskForwarded',
    'task-due-reminder': 'dueReminder',
    'task-overdue': 'taskOverdue',
    'task-on-hold': null // No email preference for on-hold
  };

  return preferenceMap[type] || null;
}

/**
 * Send bulk notifications to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {object} options - Notification options
 * @returns {Promise<Array>} - Array of created notifications
 */
export async function sendBulkNotifications(userIds, options) {
  const notifications = [];

  for (const userId of userIds) {
    const notification = await sendNotification(userId, options);
    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>}
 */
export async function markNotificationAsRead(notificationId) {
  return Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
      { returnDocument: "after" }
  );
}

/**
 * Mark all notifications as read for user
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
export async function markAllNotificationsAsRead(userId) {
  return Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
}

/**
 * Get unread notification count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export async function getUnreadNotificationCount(userId) {
  return Notification.countDocuments({
    userId,
    isRead: false
  });
}

/**
 * Get recent notifications for user
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to fetch (default: 50)
 * @returns {Promise<Array>}
 */
export async function getRecentNotifications(userId, limit = 50) {
  return Notification.find({
    userId
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate("taskId", "title status")
  .lean();
}

export default {
  sendNotification,
  sendBulkNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  getRecentNotifications
};
