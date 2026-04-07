import Notification from "./Notification.model.js";
import { User } from "../users/User.model.js";
import { ROLES } from "../../middleware/roles.js";

export const createNotification = async (data) => {
  const { userId, newsId, policyId, type, title, message, targetUrl, isPolicyUpdate } = data;

  // Check for existing notification to prevent duplicates
  const existingQuery = { userId };
  if (newsId) existingQuery.newsId = newsId;
  if (policyId) existingQuery.policyId = policyId;
  
  const existing = await Notification.findOne(existingQuery);
  if (existing) {
    return existing;
  }

  const notification = new Notification({
    userId,
    type,
    title,
    message,
    targetUrl,
    newsId,
    policyId,
    isPolicyUpdate: isPolicyUpdate || false
  });

  return await notification.save();
};

export const createBulkNotifications = async (data) => {
  const { userIds, type, title, message, targetUrl, newsId, policyId, isPolicyUpdate } = data;
  
  const notifications = [];
  for (const userId of userIds) {
    try {
      const notification = await createNotification({
        userId,
        type,
        title,
        message,
        targetUrl,
        newsId,
        policyId,
        isPolicyUpdate
      });
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to create notification for user ${userId}:`, error);
    }
  }
  
  return notifications;
};

export const getUserNotifications = async (userId) => {
  return await Notification.find({ userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(50);
};

export const markNotificationRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { returnDocument: "after" }
  );
};

export const markAllNotificationsRead = async (userId) => {
  return await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

export const createReminderNotifications = async (type, title, message, targetUrl) => {
  // Get all users except Admin
  const users = await User.find({ role: { $ne: ROLES.ADMIN } }).select('_id');
  const userIds = users.map(user => user._id);
  
  return await createBulkNotifications({
    userIds,
    type: "reminder",
    title,
    message,
    targetUrl
  });
};