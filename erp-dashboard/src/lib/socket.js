import { io } from "socket.io-client";
import { getAuth } from "./auth.js";
import { toast } from "../store/toastStore.js";
import { API_BASE_URL, SERVER_BASE_URL, SOCKET_BASE_URL } from "./url.js";

let socket = null;
let connectionAttempts = 0;
let heartbeatInterval = null;
let activityThrottleTimer = null;
let cachedOnlineUsers = [];
let socketStatus = "idle";
let lastConnectErrorAt = 0;

const HEARTBEAT_INTERVAL = 25000; // 25 seconds
const ACTIVITY_THROTTLE = 10000; // 10 seconds

const normalizeSocketPath = (value) => {
  const raw = (value || "").trim();
  if (!raw) return "/socket.io/";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const getResolvedSocketPath = () => normalizeSocketPath(import.meta.env.VITE_SOCKET_PATH);

export const getSocketDebugInfo = () => ({
  socketBaseUrl: SOCKET_BASE_URL,
  socketPath: getResolvedSocketPath(),
  apiBaseUrl: API_BASE_URL,
  serverBaseUrl: SERVER_BASE_URL,
  status: socketStatus,
  connected: Boolean(socket?.connected),
});

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
  if (socket && (socket.connected || socket.active)) {
    console.log("ℹ️ Socket already initialized", getSocketDebugInfo());
    return socket;
  }

  const socketBaseUrl = SOCKET_BASE_URL;
  const socketPath = getResolvedSocketPath();
  
  console.log("🔌 Initializing socket connection", {
    socketBaseUrl,
    socketPath,
    apiBaseUrl: API_BASE_URL,
    serverBaseUrl: SERVER_BASE_URL,
  });
  
  socket = io(socketBaseUrl, {
    auth: {
      token: auth.accessToken
    },
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 4,
    timeout: 20000,
    path: socketPath,
    withCredentials: true
  });

  socketStatus = "connecting";

  // Connection established
  socket.on("connect", () => {
    console.log("✅ Socket connected successfully", {
      socketId: socket.id,
      socketBaseUrl,
      socketPath,
    });
    connectionAttempts = 0;
    socketStatus = "connected";
    
    // Start heartbeat to keep presence alive
    startHeartbeat();
  });

  // Connection lost
  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected", {
      reason,
      socketBaseUrl,
      socketPath,
    });
    stopHeartbeat();
    socketStatus = "disconnected";
    
    if (reason === "io server disconnect") {
      socketStatus = "connecting";
      socket.connect();
    }
  });

  // Connection error
  socket.on("connect_error", (error) => {
    connectionAttempts++;
    socketStatus = "error";

    const now = Date.now();
    if (now - lastConnectErrorAt > 3000) {
      lastConnectErrorAt = now;
      console.error("❌ Socket connection error", {
        attempt: connectionAttempts,
        message: error.message,
        description: error.description,
        context: error.context,
        socketBaseUrl,
        socketPath,
      });
    }
    
    if (error.message.includes("AUTH_")) {
      console.error("   💡 Authentication failed - stopping reconnection attempts");
      socket.disconnect();
      return;
    }
  });

  // Reconnect attempt
  socket.on("reconnect_attempt", (attemptNumber) => {
    socketStatus = "connecting";
    console.log("🔄 Socket reconnection attempt", {
      attempt: attemptNumber,
      socketBaseUrl,
      socketPath,
    });
  });

  // Max reconnect attempts reached
  socket.on("reconnect_failed", () => {
    socketStatus = "error";
    console.error("❌ Max socket reconnection attempts reached", {
      socketBaseUrl,
      socketPath,
    });
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

export const isSocketConnected = () => Boolean(socket && socket.connected);

export const getSocketStatus = () => socketStatus;

export const disconnectSocket = () => {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketStatus = "idle";
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
  isSocketConnected,
  getSocketStatus,
  disconnectSocket,
  setupNotificationHandlers,
  triggerUserActivity,
  getCachedPresenceInit
};