import React, { useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { useNotificationStore } from "../../store/enterpriseNotificationStore.js";
import { usePresenceStore } from "../../store/presenceStore.js";
import { getAuth } from "../../lib/auth.js";
import { initializeSocket, disconnectSocket, getSocket, getCachedPresenceInit, triggerUserActivity } from "../../lib/socket.js";
import { startLocationTracking, stopLocationTracking } from "../../lib/locationTracker.js";
import api from "../../lib/api.js";

export default function SocketProvider({ children }) {
  const userId = useAuthStore((s) => s.user?._id || s.user?.id || null);
  const presenceInitialized = useRef(false);

  // Bridge socket presence events to Zustand presenceStore
  useEffect(() => {
    if (!userId) {
      disconnectSocket();
      stopLocationTracking();
      usePresenceStore.getState().clearPresence();
      presenceInitialized.current = false;
      return;
    }

    const auth = getAuth();
    if (!auth?.accessToken) return;

    const socket = initializeSocket();
    if (!socket) return;

    // Initialize realtime notifications
    const { initializeRealTime, fetchNotifications } = useNotificationStore.getState();
    initializeRealTime();
    fetchNotifications();

    // Fetch all users from API and initialize presence store
    if (!presenceInitialized.current) {
      presenceInitialized.current = true;
      api.get('/users').then(res => {
        const users = Array.isArray(res.data) ? res.data : res.data?.users || [];
        const store = usePresenceStore.getState();
        store.initializeUsers(users);

        // Apply any cached presence:init data that arrived before store was ready
        const cached = getCachedPresenceInit();
        if (cached.length > 0) {
          store.handlePresenceInit(cached);
        }
      }).catch(err => {
        console.error('Failed to load users for presence:', err);
      });
    }

    // Bridge window events (dispatched by socket.js) to presenceStore
    const onPresenceInit = (e) => {
      usePresenceStore.getState().handlePresenceInit(e.detail.onlineUsers);
    };
    const onPresenceUpdate = (e) => {
      usePresenceStore.getState().handlePresenceUpdate(e.detail);
    };

    window.addEventListener('socket:presence:init', onPresenceInit);
    window.addEventListener('socket:presence:update', onPresenceUpdate);

    // Document-level activity tracking — throttled in triggerUserActivity
    const onActivity = () => triggerUserActivity();
    document.addEventListener('mousemove', onActivity, { passive: true });
    document.addEventListener('keydown', onActivity, { passive: true });
    document.addEventListener('click', onActivity, { passive: true });
    document.addEventListener('scroll', onActivity, { passive: true });
    document.addEventListener('touchstart', onActivity, { passive: true });

    // Start location tracking
    startLocationTracking();

    return () => {
      window.removeEventListener('socket:presence:init', onPresenceInit);
      window.removeEventListener('socket:presence:update', onPresenceUpdate);
      document.removeEventListener('mousemove', onActivity);
      document.removeEventListener('keydown', onActivity);
      document.removeEventListener('click', onActivity);
      document.removeEventListener('scroll', onActivity);
      document.removeEventListener('touchstart', onActivity);
      disconnectSocket();
      stopLocationTracking();
    };
  }, [userId]);

  return <>{children}</>;
}