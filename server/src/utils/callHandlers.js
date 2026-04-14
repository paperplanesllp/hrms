import { CallLog } from "../modules/calls/CallLog.model.js";
import { Chat } from "../modules/chat/Chat.model.js";
import { Message } from "../modules/chat/Message.model.js";
import { notifyNewMessage } from "./socket.js";
import {
  acceptCall,
  cleanupUserCallState,
  endCall,
  getCallState,
  isUserBusy,
  isUserOnline,
  missCall,
  rejectCall,
  startRinging,
} from "./callManager.js";

// In-memory timeout tracker: Map<callId, timeoutId>
const callTimeouts = new Map();
const pendingInitiations = new Set();

const RING_TIMEOUT_MS = process.env.CALL_RING_TIMEOUT_MS || 30_000; // 30 seconds

const CALL_ERROR = {
  SOCKET_DISCONNECTED: "SOCKET_DISCONNECTED",
  SERVER_ERROR: "SERVER_ERROR",
  USER_BUSY: "USER_BUSY",
  SELF_BUSY: "SELF_BUSY",
  USER_OFFLINE: "USER_OFFLINE",
  NO_ANSWER: "NO_ANSWER",
  CALL_REJECTED: "CALL_REJECTED",
  REALTIME_UNAVAILABLE: "REALTIME_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_CALL_TYPE: "INVALID_CALL_TYPE",
  INVALID_CALL_TARGET: "INVALID_CALL_TARGET",
  CALL_NOT_FOUND: "CALL_NOT_FOUND",
  CALL_NOT_AVAILABLE: "CALL_NOT_AVAILABLE",
  CALL_PARTICIPANT_MISMATCH: "CALL_PARTICIPANT_MISMATCH",
  INVALID_CALL_PAYLOAD: "INVALID_CALL_PAYLOAD",
};

const emitCallError = (socket, code) => {
  socket.emit("call:error", { code });
};

const getPeerUserId = (call, userId) =>
  String(call?.callerId) === String(userId) ? String(call?.receiverId) : String(call?.callerId);

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

const resolveDurationSeconds = (callLog) => {
  const explicit = Number(callLog?.durationSeconds ?? callLog?.duration ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);

  const answeredAt = callLog?.answeredAt ? new Date(callLog.answeredAt) : null;
  const endedAt = callLog?.endedAt ? new Date(callLog.endedAt) : null;
  if (answeredAt && endedAt && endedAt >= answeredAt) {
    return Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000);
  }
  return 0;
};

const persistCallTimelineMessage = async (callLog, senderUserId, excludeUserId = null) => {
  if (!callLog?.conversationId) return;

  const canonicalStatus = callLog.callStatus || mapLegacyToCanonicalStatus(callLog.status);
  const durationSeconds = resolveDurationSeconds(callLog);

  const message = await Message.create({
    chatId: callLog.conversationId,
    sender: senderUserId || callLog.caller,
    content: `${callLog.callType || "voice"} call ${canonicalStatus}`,
    messageType: "call",
    isSystemMessage: true,
    readBy: [senderUserId || callLog.caller],
    status: "sent",
    callData: {
      callType: callLog.callType,
      callStatus: canonicalStatus,
      startedAt: callLog.startedAt,
      answeredAt: callLog.answeredAt,
      endedAt: callLog.endedAt,
      durationSeconds,
      initiatedBy: callLog.initiatedBy || callLog.caller,
      endedBy: callLog.endedBy,
    },
  });

  await Chat.findByIdAndUpdate(callLog.conversationId, {
    lastMessage: message._id,
    updatedAt: new Date(),
  });

  const populated = await message.populate("sender", "name email profileImageUrl");
  const payload = populated.toObject();
  payload.type = "call";
  payload.messageType = "call";
  notifyNewMessage(callLog.conversationId.toString(), payload, excludeUserId);
};

/**
 * Register all WebRTC call signaling handlers onto a socket.
 * Called once per socket connection from initializeSocket().
 */
export const registerCallHandlers = (io, socket) => {
  // ───────────────────────────────────────────────
  // CALL:INITIATE — caller starts a call
  // ───────────────────────────────────────────────
  socket.on("call:initiate", async ({ targetUserId, callType, conversationId }) => {
    const callerId = String(socket.userId);
    const receiverId = String(targetUserId || "");

    if (pendingInitiations.has(callerId)) {
      emitCallError(socket, CALL_ERROR.SELF_BUSY);
      return;
    }

    pendingInitiations.add(callerId);

    try {
      if (!["voice", "video"].includes(callType)) {
        emitCallError(socket, CALL_ERROR.INVALID_CALL_TYPE);
        return;
      }

      if (!receiverId || receiverId === callerId) {
        emitCallError(socket, CALL_ERROR.INVALID_CALL_TARGET);
        return;
      }

      if (isUserBusy(callerId)) {
        emitCallError(socket, CALL_ERROR.SELF_BUSY);
        return;
      }

      if (!isUserOnline(receiverId)) {
        emitCallError(socket, CALL_ERROR.REALTIME_UNAVAILABLE);
        return;
      }

      if (isUserBusy(receiverId)) {
        socket.emit("call:busy", { code: CALL_ERROR.USER_BUSY });

        const busyLog = await CallLog.create({
          caller: callerId,
          receiver: receiverId,
          conversationId: conversationId || undefined,
          callType,
          status: "busy",
          callStatus: "unanswered",
          startedAt: new Date(),
          endedAt: new Date(),
          durationSeconds: 0,
          initiatedBy: callerId,
          endedBy: callerId,
          failureReason: "Target user busy on another call",
        });

        await persistCallTimelineMessage(busyLog, callerId, null);
        return;
      }

      const callLog = await CallLog.create({
        caller: callerId,
        receiver: receiverId,
        conversationId: conversationId || undefined,
        callType,
        status: "initiated",
        callStatus: "unanswered",
        startedAt: new Date(),
        initiatedBy: callerId,
      });

      const callId = callLog._id.toString();
      const startResult = startRinging({
        callId,
        callerId,
        receiverId,
        callType,
        conversationId,
      });

      if (!startResult.ok) {
        await CallLog.findByIdAndUpdate(callId, {
          status: "failed",
          callStatus: "unanswered",
          endedAt: new Date(),
          endedBy: callerId,
          failureReason: startResult.code,
          duration: 0,
          durationSeconds: 0,
        });
        emitCallError(socket, startResult.code || CALL_ERROR.SERVER_ERROR);
        return;
      }

      socket.emit("call:initiated", {
        callId,
        status: "ringing",
      });

      await CallLog.findByIdAndUpdate(callId, { status: "ringing" });

      io.to(`user_${receiverId}`).emit("call:incoming", {
        callId,
        callerId,
        callerName: socket.userName,
        callerImage: socket.userImage || null,
        callType,
        conversationId: conversationId || null,
        status: "incoming",
      });

      io.to(`user_${receiverId}`).emit("notification:incoming-call", {
        callId,
        callerName: socket.userName,
        callType,
      });

      const timeoutId = setTimeout(async () => {
        try {
          const currentLog = await CallLog.findById(callId);
          if (currentLog && currentLog.status === "ringing") {
            currentLog.status = "no_answer";
            currentLog.callStatus = "missed";
            currentLog.endedAt = new Date();
            currentLog.duration = 0;
            currentLog.durationSeconds = 0;
            currentLog.endedBy = currentLog.initiatedBy || currentLog.caller;
            await currentLog.save();
            await persistCallTimelineMessage(currentLog, currentLog.caller, null);
          }

          missCall(callId);
        } catch (err) {
          console.error("[CallHandlers] Timeout update error:", err.message);
        }

        io.to(`user_${callerId}`).emit("call:missed", { callId, code: CALL_ERROR.NO_ANSWER });
        io.to(`user_${receiverId}`).emit("call:missed", { callId, code: CALL_ERROR.NO_ANSWER });
        io.to(`user_${receiverId}`).emit("notification:missed-call", {
          callId,
          callerName: socket.userName,
          callType,
        });

        callTimeouts.delete(callId);
      }, RING_TIMEOUT_MS);

      callTimeouts.set(callId, timeoutId);
    } catch (err) {
      console.error("call:initiate error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    } finally {
      pendingInitiations.delete(callerId);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:ACCEPT — receiver accepts
  // ───────────────────────────────────────────────
  socket.on("call:accept", async ({ callId, callerId }) => {
    try {
      const managerResult = acceptCall(callId, socket.userId);
      if (!managerResult.ok) {
        emitCallError(socket, managerResult.code || CALL_ERROR.CALL_NOT_AVAILABLE);
        return;
      }

      const call = managerResult.call;
      if (String(call.receiverId) !== String(socket.userId)) {
        emitCallError(socket, CALL_ERROR.CALL_PARTICIPANT_MISMATCH);
        return;
      }

      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      const callLog = await CallLog.findById(callId);
      if (!callLog) {
        rejectCall(callId);
        emitCallError(socket, CALL_ERROR.CALL_NOT_FOUND);
        return;
      }

      callLog.status = "accepted";
      callLog.answeredAt = new Date();
      callLog.callStatus = "unanswered";
      await callLog.save();

      io.to(`user_${call.callerId}`).emit("call:accepted", {
        callId,
        receiverId: socket.userId,
        receiverName: socket.userName,
        receiverImage: socket.userImage || null,
        status: "connecting",
      });
    } catch (err) {
      console.error("call:accept error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:CONNECTED — WebRTC connection established
  // ───────────────────────────────────────────────
  socket.on("call:connected", async ({ callId }) => {
    try {
      const callLog = await CallLog.findById(callId);
      if (callLog && callLog.status === "accepted") {
        callLog.status = "connected";
        callLog.callStatus = "unanswered";
        await callLog.save();
      }
    } catch (err) {
      console.error("call:connected error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:REJECT — receiver rejects
  // ───────────────────────────────────────────────
  socket.on("call:reject", async ({ callId, callerId }) => {
    try {
      const managerResult = rejectCall(callId);
      if (!managerResult.ok) {
        emitCallError(socket, managerResult.code || CALL_ERROR.CALL_NOT_AVAILABLE);
        return;
      }

      const callLog = await CallLog.findById(callId);
      if (callLog && !["completed", "cancelled", "rejected", "no_answer"].includes(callLog.status)) {
        callLog.status = "rejected";
        callLog.callStatus = "declined";
        callLog.endedAt = new Date();
        callLog.endedBy = socket.userId;
        callLog.duration = 0;
        callLog.durationSeconds = 0;
        await callLog.save();
        await persistCallTimelineMessage(callLog, socket.userId, null);
      }

      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      const peerId = managerResult.call?.callerId || callerId;
      io.to(`user_${peerId}`).emit("call:reject", {
        callId,
        receiverId: socket.userId,
        receiverName: socket.userName,
        code: CALL_ERROR.CALL_REJECTED,
      });
    } catch (err) {
      console.error("call:reject error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:CANCEL — caller cancels before answer
  // ───────────────────────────────────────────────
  socket.on("call:cancel", async ({ callId, targetUserId }) => {
    try {
      endCall(callId);

      const callLog = await CallLog.findById(callId);
      if (callLog && !["completed", "rejected", "no_answer", "cancelled"].includes(callLog.status)) {
        callLog.status = "cancelled";
        callLog.callStatus = "cancelled";
        callLog.endedAt = new Date();
        callLog.endedBy = socket.userId;
        callLog.duration = 0;
        callLog.durationSeconds = 0;
        await callLog.save();
        await persistCallTimelineMessage(callLog, socket.userId, null);
      }

      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      io.to(`user_${targetUserId}`).emit("call:end", {
        callId,
        callerId: socket.userId,
        endedBy: socket.userId,
        reason: "cancelled",
      });
    } catch (err) {
      console.error("call:cancel error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:END — either party ends the call
  // ───────────────────────────────────────────────
  socket.on("call:end", async ({ callId, targetUserId }) => {
    try {
      const managerResult = endCall(callId);
      const call = managerResult.ok ? managerResult.call : getCallState(callId);

      const callLog = await CallLog.findById(callId);
      if (callLog && !["completed", "failed", "rejected", "no_answer", "cancelled"].includes(callLog.status)) {
        callLog.status = "completed";
        callLog.callStatus = "completed";
        callLog.endedAt = new Date();
        callLog.endedBy = socket.userId;
        const durationSeconds = resolveDurationSeconds(callLog);
        callLog.duration = durationSeconds;
        callLog.durationSeconds = durationSeconds;
        await callLog.save();
        await persistCallTimelineMessage(callLog, socket.userId, null);
      }

      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      const peerId = targetUserId || getPeerUserId(call, socket.userId);
      io.to(`user_${peerId}`).emit("call:end", {
        callId,
        endedBy: socket.userId,
      });

      socket.emit("call:end", {
        callId,
        endedBy: socket.userId,
      });
    } catch (err) {
      console.error("call:end error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay offer
  // ───────────────────────────────────────────────
  socket.on("webrtc:offer", ({ targetUserId, offer, callId }) => {
    if (!targetUserId || !offer || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    io.to(`user_${targetUserId}`).emit("webrtc:offer", {
      offer,
      callId,
      fromUserId: socket.userId,
    });
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay answer
  // ───────────────────────────────────────────────
  socket.on("webrtc:answer", ({ targetUserId, answer, callId }) => {
    if (!targetUserId || !answer || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    io.to(`user_${targetUserId}`).emit("webrtc:answer", {
      answer,
      callId,
      fromUserId: socket.userId,
    });
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay ICE candidate
  // ───────────────────────────────────────────────
  socket.on("webrtc:ice-candidate", ({ targetUserId, candidate, callId }) => {
    if (!targetUserId || !candidate || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    io.to(`user_${targetUserId}`).emit("webrtc:ice-candidate", {
      candidate,
      callId,
      fromUserId: socket.userId,
    });
  });

  // ───────────────────────────────────────────────
  // DISCONNECT — clean up stale call state
  // ───────────────────────────────────────────────
  socket.on("disconnect", async () => {
    const cleanupResult = cleanupUserCallState(socket.userId);
    if (!cleanupResult?.call) return;

    const callId = cleanupResult.call.callId;
    const withUserId = cleanupResult.peerUserId;

    const timeoutId = callTimeouts.get(callId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      callTimeouts.delete(callId);
    }

    try {
      const callLog = await CallLog.findById(callId);
      if (
        callLog &&
        !["completed", "rejected", "no_answer", "cancelled", "failed"].includes(callLog.status)
      ) {
        callLog.status = "failed";
        callLog.callStatus = "unanswered";
        callLog.endedAt = new Date();
        callLog.endedBy = socket.userId;
        callLog.failureReason = "User disconnected";
        const durationSeconds = resolveDurationSeconds(callLog);
        callLog.duration = durationSeconds;
        callLog.durationSeconds = durationSeconds;
        await callLog.save();
        await persistCallTimelineMessage(callLog, socket.userId, null);
      }
    } catch (err) {
      console.error("call disconnect cleanup error:", err.message);
    }

    io.to(`user_${withUserId}`).emit("call:end", {
      callId,
      endedBy: socket.userId,
      reason: "disconnected",
    });
  });
};
