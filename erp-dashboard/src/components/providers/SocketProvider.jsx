import React, { useEffect } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { useNotificationStore } from "../../store/enterpriseNotificationStore.js";
import { getAuth } from "../../lib/auth.js";
import { initializeSocket, disconnectSocket } from "../../lib/socket.js";
import { startLocationTracking, stopLocationTracking } from "../../lib/locationTracker.js";

export default function SocketProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const { initializeRealTime, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (user) {
      // Check if auth token is available
      const auth = getAuth();
      if (!auth?.accessToken) {
        console.warn("⚠️ User logged in but no token found. Waiting...");
        return;
      }

      console.log("📱 SocketProvider: Initializing socket for", user.email);

      // Initialize socket connection
      const socket = initializeSocket();
      
      if (socket) {
        // Setup notification handlers
        initializeRealTime();
        
        // Fetch initial notifications
        fetchNotifications();
        console.log("✅ SocketProvider: Socket initialized successfully");
      } else {
        console.warn("⚠️ SocketProvider: Socket initialization returned null");
      }

      // Start location tracking
      console.log("📍 SocketProvider: Starting location tracking");
      startLocationTracking();

      // Cleanup on unmount or user change
      return () => {
        console.log("🧹 SocketProvider: Cleaning up socket connection");
        disconnectSocket();
        console.log("📍 SocketProvider: Stopping location tracking");
        stopLocationTracking();
      };
    } else {
      // Disconnect if user logs out
      console.log("🚪 SocketProvider: User logged out, disconnecting socket");
      disconnectSocket();
      console.log("📍 SocketProvider: Stopping location tracking on logout");
      stopLocationTracking();
    }
  }, [user, initializeRealTime, fetchNotifications]);

  return <>{children}</>;
}