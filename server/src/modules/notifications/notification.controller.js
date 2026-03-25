import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "./notification.service.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await getUserNotifications(req.user.id);
  res.json(notifications);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.params.id, req.user.id);
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }
  res.json({ ok: true, notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead(req.user.id);
  res.json({ ok: true, modifiedCount: result.modifiedCount });
});