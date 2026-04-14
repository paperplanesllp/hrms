import { CallLog } from "./CallLog.model.js";
import { getCallState } from "../../utils/callManager.js";
import {
  removePushSubscription,
  savePushSubscription,
} from "../../utils/pushNotifications.js";

const mapLegacyToCanonicalStatus = (status) => {
  const map = {
    no_answer: "missed",
    rejected: "declined",
    completed: "completed",
    cancelled: "cancelled",
    busy: "unanswered",
    failed: "unanswered",
    ringing: "unanswered",
    accepted: "unanswered",
    connected: "completed",
    initiated: "unanswered",
  };
  return map[status] || "missed";
};

const resolveDurationSeconds = (call) => {
  const explicit = Number(call.durationSeconds ?? call.duration ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);

  const answeredAt = call.answeredAt ? new Date(call.answeredAt) : null;
  const endedAt = call.endedAt ? new Date(call.endedAt) : null;
  if (answeredAt && endedAt && endedAt >= answeredAt) {
    return Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000);
  }
  return 0;
};

const toClientCall = (call) => {
  const plain = call.toObject ? call.toObject() : call;
  const callStatus = plain.callStatus || mapLegacyToCanonicalStatus(plain.status);
  const durationSeconds = resolveDurationSeconds(plain);

  return {
    ...plain,
    callStatus,
    durationSeconds,
    initiatedBy: plain.initiatedBy || plain.caller,
    startedAt: plain.startedAt || plain.createdAt,
  };
};

/**
 * Fetch call logs for a specific conversation.
 * Used to render call events in the chat timeline.
 */
export const getCallLogs = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID required" });
    }

    const callLogs = await CallLog.find({ conversationId })
      .populate("caller", "name _id profileImageUrl")
      .populate("receiver", "name _id profileImageUrl")
      .populate("endedBy", "name _id")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallLog.countDocuments({ conversationId });

    res.json({
      callLogs: callLogs.map(toClientCall),
      total,
      hasMore: skip + callLogs.length < total,
    });
  } catch (err) {
    console.error("[getCallLogs] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all call logs for the current user (received and made).
 */
export const getMissedCalls = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    // Missed calls: where user is receiver and status is no_answer
    const missedCalls = await CallLog.find({
      receiver: userId,
      status: "no_answer",
    })
      .populate("caller", "name _id profileImageUrl")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallLog.countDocuments({
      receiver: userId,
      status: "no_answer",
    });

    res.json({
      missedCalls: missedCalls.map(toClientCall),
      total,
      hasMore: skip + missedCalls.length < total,
    });
  } catch (err) {
    console.error("[getMissedCalls] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getCallSessionById = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = String(req.user.id);

    if (!callId) {
      return res.status(400).json({ error: "Call ID required" });
    }

    const active = getCallState(callId);
    if (active) {
      const isParticipant = [String(active.callerId), String(active.receiverId)].includes(userId);
      if (!isParticipant) {
        return res.status(403).json({ error: "Not allowed for this call" });
      }

      return res.json({
        active: true,
        call: active,
      });
    }

    const callLog = await CallLog.findById(callId)
      .populate("caller", "_id name profileImageUrl")
      .populate("receiver", "_id name profileImageUrl");

    if (!callLog) {
      return res.status(404).json({ error: "Call not found" });
    }

    const callerId = String(callLog.caller?._id || callLog.caller);
    const receiverId = String(callLog.receiver?._id || callLog.receiver);
    if (![callerId, receiverId].includes(userId)) {
      return res.status(403).json({ error: "Not allowed for this call" });
    }

    res.json({
      active: false,
      call: toClientCall(callLog),
    });
  } catch (err) {
    console.error("[getCallSessionById] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const registerPushSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body || {};

    const result = await savePushSubscription({
      userId,
      subscription,
      userAgent: req.headers["user-agent"] || "",
    });

    if (!result.ok) {
      return res.status(400).json({ ok: false, code: result.code });
    }

    res.json({ ok: true, endpoint: result.endpoint });
  } catch (err) {
    console.error("[registerPushSubscription] error:", err.message);
    res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
};

export const unregisterPushSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const endpoint = String(req.body?.endpoint || "");

    const result = await removePushSubscription({ userId, endpoint });
    if (!result.ok) {
      return res.status(400).json({ ok: false, code: result.code });
    }

    res.json({ ok: true, removed: result.removed });
  } catch (err) {
    console.error("[unregisterPushSubscription] error:", err.message);
    res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
};
