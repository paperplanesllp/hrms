import { create } from "zustand";
import api from "../lib/api.js";
import { setupNotificationHandlers } from "../lib/socket.js";
import { toast } from "./toastStore.js";

const announcedNotificationIds = new Set();

const getNotificationKey = (notification) => {
  return notification?._id || notification?.newsId || notification?.policyId || notification?.id;
};

const announceNewsNotificationsOnce = (notifications = [], { suppressToast = false } = {}) => {
  notifications.forEach((notification) => {
    const key = getNotificationKey(notification);
    if (!key || announcedNotificationIds.has(key)) return;

    const isNews = notification.type === "news" || notification.newsId;
    const isPolicy = notification.type === "policy" || notification.isPolicyUpdate;
    if (!isNews && !isPolicy) return;

    announcedNotificationIds.add(key);
    if (suppressToast) return;

    toast({
      title: isPolicy ? "Policy update" : "New news",
      message: notification.message || notification.title || "A new company update is available.",
      type: isPolicy ? "warning" : "info",
    });
  });
};

/**
 * Enterprise Notification Store
 * Manages persistent notifications with database sync and real-time updates
 */
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  loading: false,
  unreadCount: 0,

  /**
   * Initialize real-time notifications
   */
  initializeRealTime: () => {
    setupNotificationHandlers(get());
  },

  /**
   * Fetch notifications from server
   */
  fetchNotifications: async (options = {}) => {
    try {
      set({ loading: true });
      const res = await api.get("/notifications");
      const notifications = res.data || [];
      announceNewsNotificationsOnce(notifications, options);
      set({ 
        notifications, 
        loading: false,
        unreadCount: notifications.length
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ loading: false });
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      set(({ notifications }) => {
        const next = notifications.filter(n => n._id !== notificationId);
        return {
          notifications: next,
          unreadCount: next.length
        };
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      await api.patch("/notifications/read-all");
      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  },

  /**
   * Get unread count
   */
  getUnreadCount: () => {
    const { unreadCount } = get();
    return unreadCount;
  },

  /**
   * Get policy notifications
   */
  getPolicyNotifications: () => {
    const { notifications } = get();
    return notifications.filter(n => n.isPolicyUpdate);
  }
}));

export default useNotificationStore;
