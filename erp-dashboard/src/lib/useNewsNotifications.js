import { useEffect } from "react";
import api from "../lib/api.js";
import { useAuthStore } from "../store/authStore.js";
import { useNotificationStore } from "../store/notificationStore.js";

/**
 * Hook: useNewsNotifications
 * Automatically checks for unread news and policy updates on app load
 * Displays notifications for new content
 */
export function useNewsNotifications() {
  const user = useAuthStore(s => s.user);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;

    const checkNewNews = async () => {
      try {
        const res = await api.get("/news");
        const news = res.data || [];

        // Check for policy updates that user hasn't viewed
        news.forEach(item => {
          if (item.isPolicyUpdate && !item.viewedBy?.includes(user.id)) {
            addNotification({
              id: `news-${item._id}`,
              type: "policy",
              title: "📋 Policy Update",
              message: item.title,
              isPolicyUpdate: true,
              newsId: item._id
            });
          }
        });

        // Check for very recent news (published in last 24 hours) the user might not have seen
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentNews = news.filter(item => {
          const pubDate = new Date(item.publishDate);
          return pubDate > twentyFourHoursAgo && !item.isPolicyUpdate;
        });

        if (recentNews.length > 0 && recentNews[0]) {
          const latest = recentNews[0];
          addNotification({
            id: `recent-${latest._id}`,
            type: "info",
            title: "📰 New Article",
            message: `Check out: ${latest.title}`,
            isPolicyUpdate: false,
            newsId: latest._id
          });
        }
      } catch (error) {
        console.error("Error checking news notifications:", error);
      }
    };

    // Check on load
    checkNewNews();

    // Optionally check every 5 minutes
    const interval = setInterval(checkNewNews, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id, addNotification]);
}

export default useNewsNotifications;
