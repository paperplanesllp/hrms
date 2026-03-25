import { io } from "socket.io-client";
import { getAuth } from "./auth.js";
import { toast } from "../store/toastStore.js";

let socket = null;
let connectionAttempts = 0;

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
  });

  // Connection lost
  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected. Reason:", reason);
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

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Notification handlers
export const setupNotificationHandlers = (notificationStore) => {
  if (!socket) return;

  // HR receives new leave requests
  socket.on("new_leave_request", (data) => {
    toast({
      title: data.title,
      message: `${data.message} - ${data.details}`,
      type: "info"
    });
    
    // Refresh notifications
    notificationStore.fetchNotifications();
  });

  // Users receive leave status updates
  socket.on("leave_status_update", (data) => {
    toast({
      title: data.title,
      message: data.message,
      type: data.status === "APPROVED" ? "success" : "error"
    });
    
    // Refresh notifications and trigger leave data refresh
    notificationStore.fetchNotifications();
    
    // Emit custom event for leave page to refresh
    window.dispatchEvent(new CustomEvent("leaveStatusUpdate", { detail: data }));
  });
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  setupNotificationHandlers
};