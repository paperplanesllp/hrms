import { toast } from "../../../store/toastStore.js";

const ERROR_CODE_TO_MESSAGE = {
  SOCKET_DISCONNECTED: "Realtime connection lost",
  SERVER_ERROR: "Unable to place call right now",
  USER_BUSY: "User is on another call",
  SELF_BUSY: "You are already in a call",
  NO_ANSWER: "No answer",
  CALL_REJECTED: "Call declined",
  REALTIME_UNAVAILABLE: "Realtime server unavailable",
  NETWORK_ERROR: "Connection issue. Please try again",
  AUTH_REQUIRED: "Realtime server unavailable",
  AUTH_INVALID: "Realtime server unavailable",
  AUTH_USER_NOT_FOUND: "Realtime server unavailable",
  AUTH_ERROR: "Realtime server unavailable",
  USER_OFFLINE: "Realtime server unavailable",
  INVALID_CALL_TYPE: "Unable to place call right now",
  INVALID_CALL_TARGET: "Unable to place call right now",
  CALL_NOT_FOUND: "Unable to place call right now",
  CALL_NOT_AVAILABLE: "Unable to place call right now",
  CALL_PARTICIPANT_MISMATCH: "Unable to place call right now",
  INVALID_CALL_PAYLOAD: "Unable to place call right now",
};

const recentErrors = new Map();
const DEDUPE_WINDOW_MS = 4000;

export const mapCallError = (inputCode) => {
  const code = String(inputCode || "SERVER_ERROR").trim().toUpperCase();
  return ERROR_CODE_TO_MESSAGE[code] || "Unable to place call right now";
};

export const showCallToast = ({ code, title = "Call", type = "info" }) => {
  const normalizedCode = String(code || "SERVER_ERROR").trim().toUpperCase();
  const message = mapCallError(normalizedCode);
  const key = `${title}:${normalizedCode}`;
  const now = Date.now();
  const lastShownAt = recentErrors.get(key) || 0;

  if (now - lastShownAt < DEDUPE_WINDOW_MS) {
    return;
  }

  recentErrors.set(key, now);
  toast({ title, message, type });
};