/**
 * Browser notification service for calls and missed calls.
 * Handles permission requests and shows OS-level notifications.
 */

let notificationPermissionRequested = false;

/**
 * Request notification permission if not already granted.
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("[Notifications] Browser does not support notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("[Notifications] User has denied notification permission.");
    return false;
  }

  if (notificationPermissionRequested) {
    return false; // Already asked once, don't ask again
  }

  notificationPermissionRequested = true;

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.error("[Notifications] Failed to request permission:", err.message);
    return false;
  }
}

/**
 * Show incoming call notification.
 */
export function showIncomingCallNotification({ callerName, callType, onClickCallback }) {
  if (Notification.permission !== "granted") {
    return;
  }

  const title = `Incoming ${callType === "video" ? "video" : "voice"} call`;
  const options = {
    body: `${callerName || "Unknown"} is calling...`,
    icon: "/call-icon.png",
    tag: "incoming-call",
    requireInteraction: true, // Keep notification visible until dismissed
  };

  try {
    const notification = new Notification(title, options);
    if (onClickCallback) {
      notification.onclick = () => {
        onClickCallback();
        notification.close();
        // Focus the window
        if (window.parent) {
          window.parent.focus();
        }
      };
    }
  } catch (err) {
    console.error("[Notifications] Failed to show incoming call notification:", err.message);
  }
}

/**
 * Show missed call notification.
 */
export function showMissedCallNotification({ callerName, callType, onClickCallback }) {
  if (Notification.permission !== "granted") {
    return;
  }

  const title = `Missed ${callType === "video" ? "video" : "voice"} call`;
  const options = {
    body: `From ${callerName || "Unknown"}`,
    icon: "/missed-call-icon.png",
    tag: "missed-call",
    requireInteraction: false, // Auto-dismiss after a while
  };

  try {
    const notification = new Notification(title, options);
    if (onClickCallback) {
      notification.onclick = () => {
        onClickCallback();
        notification.close();
        if (window.parent) {
          window.parent.focus();
        }
      };
    }
  } catch (err) {
    console.error("[Notifications] Failed to show missed call notification:", err.message);
  }
}

/**
 * Close all call-related notifications.
 */
export function closeCallNotifications() {
  if (!("Notification" in window)) return;

  // There's no direct API to close all notifications by tag,
  // so we just rely on auto-dismiss or user dismissal
  // In a more sophisticated app, we could track notification refs
}
