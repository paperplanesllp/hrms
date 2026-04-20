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
const MAX_RECONNECTION_ATTEMPTS = 5;

const normalizeSocketPath = (value) => {
  const raw = (value || "").trim();
  if (!raw) return "/socket.io/";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const getResolvedSocketPath = () => normalizeSocketPath(import.meta.env.VITE_SOCKET_PATH);

/**
 * Get production-safe socket URL - NEVER hardcode localhost for production
 */
const getProductionSafeSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }
  
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  if (serverUrl && serverUrl.trim()) {
    return serverUrl.trim().replace(/\/$/, "");
  }
  
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiUrl && apiUrl.trim()) {
    return apiUrl.replace(/\/api\/?$/, "");
  }
  
  // In production, use window.location.origin for same-domain socket connection
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Development fallback only
  return "http://localhost:5000";
};

export const getSocketDebugInfo = () => ({
  socketBaseUrl: SOCKET_BASE_URL,
  socketPath: getResolvedSocketPath(),
  apiBaseUrl: API_BASE_URL,
  serverBaseUrl: SERVER_BASE_URL,
  status: socketStatus,
  connected: Boolean(socket?.connected),
  productionSafeUrl: getProductionSafeSocketUrl(),
});

/**
 * Validate JWT token expiration
 */
const isTokenExpired = (token) => {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return true;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // If token expires within next 60 seconds, consider it expired
    return payload.exp && payload.exp < (currentTime + 60);
  } catch (error) {
    console.warn("⚠️ Could not parse token:", error.message);
    return true;
  }
};

export const initializeSocket = () => {
  const auth = getAuth();
  
  // Check if token exists and is valid
  if (!auth?.accessToken) {
    console.warn("⚠️ Socket init skipped: No auth token available", {
      hasAuth: !!auth,
      hasAccessToken: !!auth?.accessToken
    });
    return null;
  }

  // Check if token is expired
  if (isTokenExpired(auth.accessToken)) {
    console.warn("⚠️ Socket init skipped: Token expired or expiring soon");
    return null;
  }

  // Prevent multiple socket instances
  if (socket && (socket.connected || socket.active)) {
    console.log("ℹ️ Socket already initialized", getSocketDebugInfo());
    return socket;
  }

  // Use production-safe URL that never hardcodes localhost
  const socketBaseUrl = getProductionSafeSocketUrl();
  const socketPath = getResolvedSocketPath();
  
  console.log("🔌 Initializing socket connection", {
    socketBaseUrl,
    socketPath,
    environment: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    envSocketUrl: import.meta.env.VITE_SOCKET_URL,
    envServerUrl: import.meta.env.VITE_SERVER_URL,
    envApiUrl: import.meta.env.VITE_API_BASE_URL,
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
    reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
    timeout: 20000,
    path: socketPath,
    withCredentials: true,
    // For HTTPS domains, use secure websocket
    secure: import.meta.env.PROD && window.location.protocol === 'https:',
    rejectUnauthorized: false
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

  // Connection error with improved auth diagnostics
  socket.on("connect_error", (error) => {
    connectionAttempts++;
    socketStatus = "error";

    const now = Date.now();
    // Log errors less frequently to avoid console spam
    const shouldLog = now - lastConnectErrorAt > 3000 || connectionAttempts <= 2;
    
    if (shouldLog) {
      lastConnectErrorAt = now;
      
      const auth = getAuth();
      const isAuthError = error.message && error.message.includes("AUTH_");
      
      console.error("❌ Socket connection error", {
        attempt: connectionAttempts,
        message: error.message,
        description: error.description,
        context: error.context,
        socketBaseUrl,
        socketPath,
        isAuthError,
        hasToken: !!auth?.accessToken,
        tokenExpired: auth?.accessToken ? isTokenExpired(auth.accessToken) : 'N/A',
      });
      
      if (isAuthError) {
        console.error("   💡 Authentication failed:", {
          errorType: error.message,
          hint: auth?.accessToken 
            ? "Token validation failed on server - may need to re-login"
            : "No token found - user not logged in"
        });
      } else {
        console.error("   💡 Connection failed:", {
          hint: `Cannot reach ${socketBaseUrl} - check if server is running and CORS is configured`
        });
      }
    }
    
    // Stop reconnecting if auth error
    if (error.message && error.message.includes("AUTH_")) {
      console.error("   🛑 Stopping reconnection attempts due to auth error");
      socket.disconnect();
      socketStatus = "auth_failed";
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