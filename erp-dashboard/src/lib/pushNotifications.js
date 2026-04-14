import api from "./api.js";

const SW_PATH = "/sw.js";

const isBrowserPushSupported = () => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const registerServiceWorker = async () => {
  if (!isBrowserPushSupported()) return null;

  const registration = await navigator.serviceWorker.register(SW_PATH);
  console.log("[PushClient] Service worker registered", {
    scope: registration.scope,
    scriptURL: SW_PATH,
  });
  return registration;
};

export const ensurePushSubscription = async ({ promptForPermission = false } = {}) => {
  if (!isBrowserPushSupported()) {
    console.warn("[PushClient] Browser push is not supported in this environment");
    return { ok: false, reason: "PUSH_NOT_SUPPORTED" };
  }

  const vapidPublicKey = String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || "").trim();
  if (!vapidPublicKey) {
    console.warn("[PushClient] Missing VITE_WEB_PUSH_PUBLIC_KEY");
    return { ok: false, reason: "VAPID_KEY_MISSING" };
  }

  if (Notification.permission === "denied") {
    console.warn("[PushClient] Notification permission denied");
    return { ok: false, reason: "NOTIFICATION_DENIED" };
  }

  if (Notification.permission !== "granted") {
    if (!promptForPermission) {
      console.log("[PushClient] Notification permission is required but prompt disabled");
      return { ok: false, reason: "NOTIFICATION_PERMISSION_REQUIRED" };
    }

    const permission = await Notification.requestPermission();
    console.log("[PushClient] Notification permission result", { permission });
    if (permission !== "granted") {
      return { ok: false, reason: "NOTIFICATION_PERMISSION_REQUIRED" };
    }
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, reason: "SERVICE_WORKER_REGISTRATION_FAILED" };
  }

  let subscription = await registration.pushManager.getSubscription();
  console.log("[PushClient] Existing push subscription lookup", {
    exists: Boolean(subscription),
  });

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    console.log("[PushClient] New push subscription created");
  }

  await api.post("/calls/push-subscriptions", {
    subscription: subscription.toJSON(),
  });

  console.log("[PushClient] Push subscription synced to backend", {
    endpoint: subscription.endpoint,
  });

  return { ok: true, subscription: subscription.toJSON() };
};
