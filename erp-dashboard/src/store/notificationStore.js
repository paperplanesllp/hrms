import { create } from "zustand";

/**
 * Notification Store
 * Manages persistent notifications for News & Policy Updates
 * Supports multiple notification types and dismissal
 */
export const useNotificationStore = create((set, get) => ({
  notifications: [],

  /**
   * Add a new notification
   * @param {Object} notification - { id, type, title, message, isPolicyUpdate, newsId, imageUrl }
   */
  addNotification: (notification) => {
    set(({ notifications }) => ({
      notifications: [
        ...notifications,
        {
          id: notification.id || `notif-${Date.now()}`,
          type: notification.type || "info", // info, success, warning, error, policy
          title: notification.title,
          message: notification.message,
          isPolicyUpdate: notification.isPolicyUpdate || false,
          newsId: notification.newsId,
          imageUrl: notification.imageUrl,
          createdAt: new Date(),
          dismissed: false
        }
      ]
    }));
  },

  /**
   * Dismiss a notification
   */
  dismissNotification: (id) => {
    set(({ notifications }) => ({
      notifications: notifications.map(n =>
        n.id === id ? { ...n, dismissed: true } : n
      )
    }));
  },

  /**
   * Remove a notification permanently
   */
  removeNotification: (id) => {
    set(({ notifications }) => ({
      notifications: notifications.filter(n => n.id !== id)
    }));
  },

  /**
   * Clear all notifications
   */
  clearAll: () => {
    set({ notifications: [] });
  },

  /**
   * Clear only dismissed notifications
   */
  clearDismissed: () => {
    set(({ notifications }) => ({
      notifications: notifications.filter(n => !n.dismissed)
    }));
  },

  /**
   * Get active (non-dismissed) notifications
   */
  getActive: () => {
    const { notifications } = get();
    return notifications.filter(n => !n.dismissed);
  },

  /**
   * Get persistent policy update notifications user hasn't viewed
   */
  getPersistentPolicies: () => {
    const { notifications } = get();
    return notifications.filter(n => n.isPolicyUpdate && !n.dismissed);
  }
}));

export default useNotificationStore;
