self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Incoming call", body: "You have an incoming call." };
  }

  const title = payload.callType === "video" ? "Incoming video call" : "Incoming voice call";
  const callerName = payload.callerName || "Unknown";
  const callId = payload.callId || "";

  const notificationOptions = {
    body: `${callerName} is calling...`,
    icon: "/call-icon.png",
    tag: `incoming-call-${callId}`,
    requireInteraction: true,
    data: {
      type: payload.type || "voice_call",
      callId,
      callerId: payload.callerId || null,
      callerName,
      callType: payload.callType || "voice",
      conversationId: payload.conversationId || null,
      timestamp: payload.timestamp || new Date().toISOString(),
      url: `/chat?incomingCallId=${encodeURIComponent(callId)}`,
    },
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/chat";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});
