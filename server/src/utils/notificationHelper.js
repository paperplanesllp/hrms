import Notification from "../modules/notifications/Notification.model.js";
import { User } from "../modules/users/User.model.js";
import { Task } from "../modules/tasks/Task.model.js";
import { sendTaskEmail } from "../services/emailNotification.service.js";
import { getIO } from "../utils/socket.js";

/**
 * Create both in-app and email notification for task events
 * @param {object} options - Configuration object
 * @param {string} options.userId - Recipient user ID
 * @param {string} options.taskId - Task ID
 * @param {string} options.eventType - Event type (task-assigned, task-completed, etc.)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.triggeredBy - User ID who triggered the action
 * @returns {Promise<object>} - Created notification object
 */
export async function createTaskNotification(options) {
  const {
    userId,
    taskId,
    eventType,
    title,
    message,
    triggeredBy = null
  } = options;

  try {
    // Fetch user to check email preferences and get email
    const user = await User.findById(userId).lean();
    if (!user) {
      console.warn(`User not found: ${userId}`);
      return null;
    }

    // Fetch task for email template data
    const task = await Task.findById(taskId).populate("assignedBy", "name").lean();
    if (!task) {
      console.warn(`Task not found: ${taskId}`);
      return null;
    }

    // Create in-app notification
    const notification = await Notification.create({
      userId,
      taskId,
      type: eventType,
      title,
      message,
      targetUrl: `/tasks/${taskId}`,
      triggeredBy,
      emailSent: false
    });

    // Check user email preferences before sending email
    const preferences = user.emailNotificationPreferences || {};
    const preferencesMap = {
      "task-assigned": "taskAssigned",
      "task-accepted": "taskAccepted",
      "task-rejected": "taskRejected",
      "task-completed": "taskCompleted",
      "task-reassigned": "taskReassigned",
      "task-forwarded": "taskForwarded",
      "task-due-reminder": "dueReminder",
      "task-overdue": "taskOverdue"
    };

    const preferenceKey = preferencesMap[eventType];
    const shouldSendEmail = preferenceKey ? preferences[preferenceKey] !== false : true;

    // Send email notification if preferences allow
    if (shouldSendEmail && user.email) {
      const taskData = {
        taskId: task._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status,
        assignedByName: task.assignedBy?.name || "System",
        completedByName: task.completedBy?.name || "User",
        acceptedByName: task.acceptedBy?.name || "User",
        rejectedByName: task.rejectedBy?.name || "User",
        rejectionReason: task.rejectionReason,
        assignedToName: task.assignedTo?.name || "User",
        reassignedByName: task.reassignedFrom?.reassignedBy?.name || "System",
        forwardedToName: task.forwardedFrom?.forwardedTo?.name || "User",
        forwardedByName: task.forwardedFrom?.forwardedBy?.name || "System",
        forwardingReason: task.forwardedFrom?.reason || ""
      };

      const emailSent = await sendTaskEmail(user.email, eventType, taskData);
      if (emailSent) {
        // Update notification with email sent status
        notification.emailSent = true;
        notification.emailSentAt = new Date();
        await notification.save();
        console.log(`✅ Notification created and email sent for ${eventType} (${userId})`);
      }
    } else {
      console.log(`⏭️ Email skipped for ${eventType} (preference disabled or no email)`);
    }

    // Emit real-time socket notification
    try { getIO().to(`user_${userId}`).emit("notification", {
      id: notification._id,
      type: eventType,
      title,
      message,
      taskId,
      createdAt: notification.createdAt
    }); } catch (_) { /* socket not yet initialized */ }

    return notification;
  } catch (error) {
    console.error("Error creating task notification:", error);
    return null;
  }
}

/**
 * Send notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {object} options - Same options as createTaskNotification
 * @returns {Promise<Array>} - Array of created notifications
 */
export async function createNotificationsForUsers(userIds, options) {
  const notifications = [];
  
  for (const userId of userIds) {
    const notification = await createTaskNotification({
      ...options,
      userId
    });
    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

/**
 * Handle task assignment notification
 * @param {string} taskId - Task ID
 * @param {string} assignedToUserId - User ID of assigned person
 * @param {string} assignedByUserId - User ID of assigner
 * @returns {Promise<object>}
 */
export async function notifyTaskAssigned(taskId, assignedToUserId, assignedByUserId) {
  const task = await Task.findById(taskId).populate("assignedBy", "name").lean();
  
  return createTaskNotification({
    userId: assignedToUserId,
    taskId,
    eventType: "task-assigned",
    title: `New Task Assigned: ${task.title}`,
    message: `You have been assigned a new task "${task.title}" by ${task.assignedBy.name}`,
    triggeredBy: assignedByUserId
  });
}

/**
 * Handle task completion notification - notify assigner
 * @param {string} taskId - Task ID
 * @param {string} completedByUserId - User ID of who completed
 * @param {string} assignedByUserId - User ID who originally assigned
 * @returns {Promise<object>}
 */
export async function notifyTaskCompleted(taskId, completedByUserId, assignedByUserId) {
  const task = await Task.findById(taskId).populate(["assignedBy", "assignedTo"], "name").lean();
  
  return createTaskNotification({
    userId: assignedByUserId,
    taskId,
    eventType: "task-completed",
    title: `Task Completed: ${task.title}`,
    message: `Task "${task.title}" has been completed by ${task.assignedTo.name}`,
    triggeredBy: completedByUserId
  });
}

/**
 * Handle task acceptance notification - notify assigner
 * @param {string} taskId - Task ID
 * @param {string} acceptedByUserId - User ID who accepted
 * @param {string} assignedByUserId - User ID who assigned
 * @returns {Promise<object>}
 */
export async function notifyTaskAccepted(taskId, acceptedByUserId, assignedByUserId) {
  const task = await Task.findById(taskId).populate("assignedTo", "name").lean();
  
  return createTaskNotification({
    userId: assignedByUserId,
    taskId,
    eventType: "task-accepted",
    title: `Task Accepted: ${task.title}`,
    message: `Task "${task.title}" has been accepted by ${task.assignedTo.name}`,
    triggeredBy: acceptedByUserId
  });
}

/**
 * Handle task rejection notification - notify assigner
 * @param {string} taskId - Task ID
 * @param {string} rejectedByUserId - User ID who rejected
 * @param {string} assignedByUserId - User ID who assigned
 * @param {string} reason - Rejection reason
 * @returns {Promise<object>}
 */
export async function notifyTaskRejected(taskId, rejectedByUserId, assignedByUserId, reason) {
  const task = await Task.findById(taskId).populate("assignedTo", "name").lean();
  
  return createTaskNotification({
    userId: assignedByUserId,
    taskId,
    eventType: "task-rejected",
    title: `Task Rejected: ${task.title}`,
    message: `Task "${task.title}" has been rejected by ${task.assignedTo.name}. Reason: ${reason || "Not provided"}`,
    triggeredBy: rejectedByUserId
  });
}

/**
 * Handle task reassignment notification - notify new assignee
 * @param {string} taskId - Task ID
 * @param {string} newAssigneeUserId - New assignee user ID
 * @param {string} reassignedByUserId - User ID who reassigned
 * @returns {Promise<object>}
 */
export async function notifyTaskReassigned(taskId, newAssigneeUserId, reassignedByUserId) {
  const task = await Task.findById(taskId).populate(["assignedBy"], "name").lean();
  
  return createTaskNotification({
    userId: newAssigneeUserId,
    taskId,
    eventType: "task-reassigned",
    title: `Task Reassigned: ${task.title}`,
    message: `Task "${task.title}" has been reassigned to you by ${task.assignedBy.name}`,
    triggeredBy: reassignedByUserId
  });
}

/**
 * Handle task forwarding notification - notify forwarded user
 * @param {string} taskId - Task ID
 * @param {string} forwardedToUserId - User ID task is forwarded to
 * @param {string} forwardedByUserId - User ID who forwarded
 * @param {string} reason - Forwarding reason
 * @returns {Promise<object>}
 */
export async function notifyTaskForwarded(taskId, forwardedToUserId, forwardedByUserId, reason) {
  const task = await Task.findById(taskId).populate(["assignedBy"], "name").lean();
  
  return createTaskNotification({
    userId: forwardedToUserId,
    taskId,
    eventType: "task-forwarded",
    title: `Task Forwarded: ${task.title}`,
    message: `Task "${task.title}" has been forwarded to you. Reason: ${reason || "Task forwarded"}`,
    triggeredBy: forwardedByUserId
  });
}

/**
 * Handle due date reminder - notify assignee
 * @param {string} taskId - Task ID
 * @param {string} assignedToUserId - Assignee user ID
 * @returns {Promise<object>}
 */
export async function notifyDueReminder(taskId, assignedToUserId) {
  const task = await Task.findById(taskId).lean();
  
  return createTaskNotification({
    userId: assignedToUserId,
    taskId,
    eventType: "task-due-reminder",
    title: `Reminder: ${task.title} is Due Soon`,
    message: `Task "${task.title}" is due on ${new Date(task.dueDate).toLocaleDateString()}. Complete it now!`,
    triggeredBy: null
  });
}

/**
 * Handle overdue task notification - notify assignee and assigner
 * @param {string} taskId - Task ID
 * @returns {Promise<Array>}
 */
export async function notifyTaskOverdue(taskId) {
  const task = await Task.findById(taskId).lean();
  const notifications = [];

  // Notify assignee
  const assigneeNotif = await createTaskNotification({
    userId: task.assignedTo,
    taskId,
    eventType: "task-overdue",
    title: `⚠️ Task Overdue: ${task.title}`,
    message: `Task "${task.title}" is now overdue. Please complete it immediately!`,
    triggeredBy: null
  });
  if (assigneeNotif) notifications.push(assigneeNotif);

  // Notify assigner
  if (task.assignedBy.toString() !== task.assignedTo.toString()) {
    const assignerNotif = await createTaskNotification({
      userId: task.assignedBy,
      taskId,
      eventType: "task-overdue",
      title: `⚠️ Task Overdue: ${task.title}`,
      message: `Task "${task.title}" assigned to ${task.assignedToName} is now overdue.`,
      triggeredBy: null
    });
    if (assignerNotif) notifications.push(assignerNotif);
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
 * Mark all notifications for user as read
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
  createTaskNotification,
  createNotificationsForUsers,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyTaskAccepted,
  notifyTaskRejected,
  notifyTaskReassigned,
  notifyTaskForwarded,
  notifyDueReminder,
  notifyTaskOverdue,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  getRecentNotifications
};
