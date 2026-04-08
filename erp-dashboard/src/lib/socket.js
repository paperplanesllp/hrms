import { io } from "socket.io-client";
import { getAuth } from "./auth.js";
import { toast } from "../store/toastStore.js";

let socket = null;
let connectionAttempts = 0;
let heartbeatInterval = null;
let activityThrottleTimer = null;
let cachedOnlineUsers = [];

const HEARTBEAT_INTERVAL = 25000; // 25 seconds
const ACTIVITY_THROTTLE = 10000; // 10 seconds

export const initializeSocket = () => {
  const auth = getAuth();
  
  // Check if token exists and is valid
  if (!auth?.accessToken) {
    console.warn("⚠️ Socket init skipped: No auth token available");
    return null;
  }

  // Check if token is expired (basic check)
  try {
    const tokenPayload = JSON.parse(atob(auth.accessToken.split('.')[1]));
    const currentTime = Date.now() / 1000;
    if (tokenPayload.exp && tokenPayload.exp < currentTime) {
      console.warn("⚠️ Socket init skipped: Token expired");
      return null;
    }
  } catch (error) {
    console.warn("⚠️ Socket init skipped: Invalid token format");
    return null;
  }

  // Prevent multiple socket instances
  if (socket?.connected) {
    console.log("ℹ️ Socket already connected");
    return socket;
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
  const serverUrl = apiUrl.replace('/api', '');
  
  console.log("🔌 Initializing socket connection...");
  
  socket = io(serverUrl, {
    auth: {
      token: auth.accessToken
    },
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 5,
    timeout: 20000,
    path: "/socket.io/",
    withCredentials: true
  });

  // Connection established
  socket.on("connect", () => {
    console.log("✅ Socket connected successfully");
    connectionAttempts = 0;
    
    // Start heartbeat to keep presence alive
    startHeartbeat();
  });

  // Connection lost
  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected. Reason:", reason);
    stopHeartbeat();
    
    if (reason === "io server disconnect") {
      socket.connect();
    }
  });

  // Connection error
  socket.on("connect_error", (error) => {
    connectionAttempts++;
    console.error(`❌ Socket connection error (attempt ${connectionAttempts}):`, error.message);
    
    if (error.message.includes("Authentication") || error.message.includes("Invalid token")) {
      console.error("   💡 Authentication failed - stopping reconnection attempts");
      socket.disconnect();
      return;
    }
  });

  // Reconnect attempt
  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`🔄 Reconnection attempt #${attemptNumber}`);
  });

  // Max reconnect attempts reached
  socket.on("reconnect_failed", () => {
    console.error("❌ Max reconnection attempts reached");
  });

  // ============ PRESENCE EVENTS ============
  
  // Cache presence data and dispatch window events for store bridge
  socket.on("presence:init", ({ onlineUsers }) => {
    console.log("📋 Received initial presence list:", onlineUsers.length, "online users");
    cachedOnlineUsers = onlineUsers || [];
    window.dispatchEvent(new CustomEvent('socket:presence:init', { detail: { onlineUsers } }));
  });

  socket.on("presence:update", (presenceData) => {
    console.log("👁️ Presence update:", presenceData.userName, presenceData.isOnline ? "ONLINE" : "OFFLINE");
    // Update cache
    if (presenceData.isOnline) {
      const idx = cachedOnlineUsers.findIndex(u => u.userId === presenceData.userId);
      if (idx >= 0) {
        cachedOnlineUsers[idx] = { ...cachedOnlineUsers[idx], ...presenceData };
      } else {
        cachedOnlineUsers.push(presenceData);
      }
    } else {
      cachedOnlineUsers = cachedOnlineUsers.filter(u => u.userId !== presenceData.userId);
    }
    window.dispatchEvent(new CustomEvent('socket:presence:update', { detail: presenceData }));
  });

  return socket;
};

/**
 * Start heartbeat to keep user presence alive
 */
const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit("heartbeat");
    }
  }, HEARTBEAT_INTERVAL);

  console.log("❤️ Heartbeat started");
};

/**
 * Stop heartbeat
 */
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("💔 Heartbeat stopped");
  }
};

/**
 * Trigger user activity event (throttled to avoid flooding)
 */
export const triggerUserActivity = () => {
  if (activityThrottleTimer) return;
  if (socket && socket.connected) {
    socket.emit("user:activity");
  }
  activityThrottleTimer = setTimeout(() => {
    activityThrottleTimer = null;
  }, ACTIVITY_THROTTLE);
};

/**
 * Get cached online users from last presence:init
 */
export const getCachedPresenceInit = () => cachedOnlineUsers;

export const getSocket = () => socket;

export const disconnectSocket = () => {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Notification handlers
export const setupNotificationHandlers = (notificationStore = null) => {
  if (!socket) return;

  // Remove any previously registered listeners to prevent double-firing
  socket.off("new_leave_request");
  socket.off("leave_status_update");

  // HR receives new leave requests
  socket.on("new_leave_request", (data) => {
    toast({
      title: data.title,
      message: `${data.message} - ${data.details}`,
      type: "info"
    });
    
    if (notificationStore?.fetchNotifications) {
      notificationStore.fetchNotifications();
    }
  });

  // Users receive leave status updates
  socket.on("leave_status_update", (data) => {
    toast({
      title: data.title,
      message: data.message,
      type: data.status === "APPROVED" ? "success" : "error"
    });
    
    if (notificationStore?.fetchNotifications) {
      notificationStore.fetchNotifications();
    }
    
    // Emit custom event for leave page to refresh
    window.dispatchEvent(new CustomEvent("leaveStatusUpdate", { detail: data }));
  });
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  setupNotificationHandlers,
  triggerUserActivity,
  getCachedPresenceInit
};