import { create } from "zustand";
import api from "../lib/api.js";
import { setupNotificationHandlers } from "../lib/socket.js";

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
  fetchNotifications: async () => {
    try {
      set({ loading: true });
      const res = await api.get("/notifications");
      const notifications = res.data || [];
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
      set(({ notifications }) => ({
        notifications: notifications.filter(n => n._id !== notificationId)
      }));
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