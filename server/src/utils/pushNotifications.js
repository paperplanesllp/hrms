import webpush from "web-push";
import { User } from "../modules/users/User.model.js";

let isConfigured = false;

const getVapidConfig = () => ({
  subject: process.env.WEB_PUSH_SUBJECT || "mailto:support@hrms.local",
  publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
  privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
});

const ensureWebPushConfigured = () => {
  if (isConfigured) return true;

  const { subject, publicKey, privateKey } = getVapidConfig();
  if (!subject || !publicKey || !privateKey) {
    console.warn("[Push] Web push is not configured", {
      hasSubject: Boolean(subject),
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
    });
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
  return true;
};

const normalizeSubscription = (subscription = {}) => {
  const endpoint = String(subscription.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    keys: { p256dh, auth },
  };
};

export const savePushSubscription = async ({ userId, subscription, userAgent = "" }) => {
  const normalized = normalizeSubscription(subscription);
  if (!normalized) {
    console.warn("[Push] Invalid push subscription payload", { userId: String(userId) });
    return { ok: false, code: "INVALID_PUSH_SUBSCRIPTION" };
  }

  const user = await User.findById(userId).select("pushSubscriptions");
  if (!user) {
    console.warn("[Push] User not found while saving subscription", { userId: String(userId) });
    return { ok: false, code: "USER_NOT_FOUND" };
  }

  const existing = Array.isArray(user.pushSubscriptions)
    ? user.pushSubscriptions.find((item) => item.endpoint === normalized.endpoint)
    : null;

  const now = new Date();

  if (existing) {
    existing.keys = normalized.keys;
    existing.userAgent = String(userAgent || "").slice(0, 256);
    existing.updatedAt = now;
    existing.lastUsedAt = now;
  } else {
    user.pushSubscriptions = user.pushSubscriptions || [];
    user.pushSubscriptions.push({
      endpoint: normalized.endpoint,
      keys: normalized.keys,
      userAgent: String(userAgent || "").slice(0, 256),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    });
  }

  await user.save();
  console.log("[Push] Saved push subscription", {
    userId: String(userId),
    endpoint: normalized.endpoint,
    mode: existing ? "updated" : "created",
    totalSubscriptions: user.pushSubscriptions.length,
  });
  return { ok: true, endpoint: normalized.endpoint };
};

export const removePushSubscription = async ({ userId, endpoint }) => {
  const normalizedEndpoint = String(endpoint || "").trim();
  if (!normalizedEndpoint) return { ok: false, code: "INVALID_ENDPOINT" };

  const user = await User.findById(userId).select("pushSubscriptions");
  if (!user) return { ok: false, code: "USER_NOT_FOUND" };

  const before = user.pushSubscriptions?.length || 0;
  user.pushSubscriptions = (user.pushSubscriptions || []).filter(
    (item) => item.endpoint !== normalizedEndpoint
  );

  if ((user.pushSubscriptions?.length || 0) !== before) {
    await user.save();
  }

  return { ok: true, removed: before - (user.pushSubscriptions?.length || 0) };
};

export const sendVoiceCallPushNotification = async ({ receiverId, payload }) => {
  console.log("[Push] sendVoiceCallPushNotification invoked", {
    receiverId: String(receiverId),
    callId: payload?.callId,
    callerId: payload?.callerId,
    callType: payload?.callType,
  });

  const configured = ensureWebPushConfigured();
  if (!configured) {
    return { attempted: false, sent: 0, reason: "PUSH_NOT_CONFIGURED", subscriptionCount: 0 };
  }

  const user = await User.findById(receiverId).select("pushSubscriptions");
  const subscriptions = user?.pushSubscriptions || [];

  console.log("[Push] Receiver subscription lookup", {
    receiverId: String(receiverId),
    foundUser: Boolean(user),
    subscriptionCount: subscriptions.length,
  });

  if (!subscriptions.length) {
    return { attempted: false, sent: 0, reason: "NO_PUSH_SUBSCRIPTION", subscriptionCount: 0 };
  }

  const body = JSON.stringify({
    type: "voice_call",
    timestamp: new Date().toISOString(),
    ...payload,
  });

  let sent = 0;
  const invalidEndpoints = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys?.p256dh,
              auth: subscription.keys?.auth,
            },
          },
          body,
          { TTL: 30 }
        );
        sent += 1;
        console.log("[Push] Push notification sent", {
          receiverId: String(receiverId),
          endpoint: subscription.endpoint,
          callId: payload?.callId,
        });
      } catch (error) {
        const statusCode = Number(error?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          invalidEndpoints.push(subscription.endpoint);
        }
        console.error("[Push] Failed to send push notification", {
          receiverId: String(receiverId),
          endpoint: subscription.endpoint,
          statusCode,
          message: error?.message,
        });
      }
    })
  );

  if (invalidEndpoints.length) {
    console.warn("[Push] Removing invalid push endpoints", {
      receiverId: String(receiverId),
      invalidEndpointCount: invalidEndpoints.length,
    });
    await User.updateOne(
      { _id: receiverId },
      { $pull: { pushSubscriptions: { endpoint: { $in: invalidEndpoints } } } }
    ).catch(() => null);
  }

  return {
    attempted: true,
    sent,
    reason: sent > 0 ? "PUSH_SENT" : "PUSH_FAILED",
    subscriptionCount: subscriptions.length,
  };
};
