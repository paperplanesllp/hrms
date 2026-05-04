import { CallLog } from "../modules/calls/CallLog.model.js";
import { Chat } from "../modules/chat/Chat.model.js";
import { Message } from "../modules/chat/Message.model.js";
import { notifyNewMessage } from "./socket.js";
import {
  acceptCall,
  cleanupUserCallState,
  endCall,
  failCall,
  getCallState,
  getUserSocketSnapshot,
  hasUserSocket,
  isUserBusy,
  markCallDelivery,
  missCall,
  rejectCall,
  setCallExpiresAt,
  startRinging,
} from "./callManager.js";
import { sendVoiceCallPushNotification } from "./pushNotifications.js";

// In-memory timeout tracker: Map<callId, timeoutId>
const callTimeouts = new Map();
const pendingInitiations = new Set();

const RING_TIMEOUT_MS = process.env.CALL_RING_TIMEOUT_MS || 30_000; // 30 seconds

const CALL_ERROR = {
  SOCKET_DISCONNECTED: "SOCKET_DISCONNECTED",
  SERVER_ERROR: "SERVER_ERROR",
  USER_BUSY: "USER_BUSY",
  SELF_BUSY: "SELF_BUSY",
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
  COULD_NOT_REACH_USER: "COULD_NOT_REACH_USER",
};

const emitCallError = (socket, code) => {
  socket.emit("call:error", { code });
};

const emitCallLifecycleEvent = (io, userId, eventName, payload, callType) => {
  if (!userId) return;
  io.to(`user_${userId}`).emit(eventName, payload);
  if (callType === "voice") {
    const voiceAliasMap = {
      "call:accepted": "voice-call:accepted",
      "call:reject": "voice-call:rejected",
      "call:end": "voice-call:ended",
    };

    const aliasEvent = voiceAliasMap[eventName];
    if (aliasEvent) {
      io.to(`user_${userId}`).emit(aliasEvent, payload);
    }
  }
};

const emitSocketLifecycleEvent = (socket, eventName, payload, callType) => {
  socket.emit(eventName, payload);
  if (callType === "voice") {
    const voiceAliasMap = {
      "call:end": "voice-call:ended",
    };

    const aliasEvent = voiceAliasMap[eventName];
    if (aliasEvent) {
      socket.emit(aliasEvent, payload);
    }
  }
};

const emitIncomingCallEvents = (io, receiverId, payload) => {
  io.to(`user_${receiverId}`).emit("call:incoming", payload);
  io.to(`user_${receiverId}`).emit("voice-call:incoming", payload);
  io.to(`user_${receiverId}`).emit("incoming-call", payload);
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
  const handleCallInitiate = async ({
    targetUserId,
    receiverId,
    callType,
    conversationId,
    startedAt,
  }) => {
    const callerId = String(socket.userId);
    const resolvedReceiverId = String(targetUserId || receiverId || "");

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

      if (!resolvedReceiverId || resolvedReceiverId === callerId) {
        emitCallError(socket, CALL_ERROR.INVALID_CALL_TARGET);
        return;
      }

      if (isUserBusy(callerId)) {
        emitCallError(socket, CALL_ERROR.SELF_BUSY);
        return;
      }

      if (isUserBusy(resolvedReceiverId)) {
        socket.emit("call:busy", { code: CALL_ERROR.USER_BUSY });

        const busyLog = await CallLog.create({
          caller: callerId,
          receiver: resolvedReceiverId,
          conversationId: conversationId || undefined,
          callType,
          status: "busy",
          callStatus: "unanswered",
          startedAt: startedAt ? new Date(startedAt) : new Date(),
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
        receiver: resolvedReceiverId,
        conversationId: conversationId || undefined,
        callType,
        status: "initiated",
        callStatus: "unanswered",
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        initiatedBy: callerId,
      });

      const callId = callLog._id.toString();
      console.log("[VoiceCall] Call session created", {
        callId,
        callerId,
        receiverId: resolvedReceiverId,
        callType,
        conversationId: conversationId || null,
        startedAt: callLog.startedAt,
      });

      const startResult = startRinging({
        callId,
        callerId,
        receiverId: resolvedReceiverId,
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
        status: "session_created",
        delivery: "trying",
      });

      socket.emit("voice-call:ringing", {
        callId,
        receiverId: resolvedReceiverId,
        status: "initiating",
        message: "Trying to reach user...",
      });

      console.log("[VoiceCall] Emitting incoming call", {
        event: callType === "voice" ? "voice-call:initiate" : "call:initiate",
        callerId,
        receiverId: resolvedReceiverId,
        callId,
        callType,
      });

      const expiresAt = new Date(Date.now() + Number(RING_TIMEOUT_MS));
      setCallExpiresAt(callId, expiresAt);

      const incomingPayload = {
        callId,
        callerId,
        callerName: socket.userName,
        callerImage: socket.userImage || null,
        callType,
        conversationId: conversationId || null,
        startedAt: startResult.call?.startedAt || new Date(),
        expiresAt,
        status: "incoming",
      };

      const roomName = `user_${resolvedReceiverId}`;
      const receiverRoomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
      const receiverMapHasSocket = hasUserSocket(resolvedReceiverId);
      const receiverSocketSnapshot = getUserSocketSnapshot(resolvedReceiverId);
      const receiverHasSocket = receiverMapHasSocket || receiverRoomSize > 0;

      console.log("[VoiceCall] Receiver socket lookup", {
        callId,
        receiverId: resolvedReceiverId,
        normalizedReceiverId: String(resolvedReceiverId),
        roomName,
        receiverRoomSize,
        receiverMapHasSocket,
        receiverSocketSnapshot,
        receiverHasSocket,
      });

      let pushResult = { attempted: false, sent: 0, reason: "NOT_ATTEMPTED", subscriptionCount: 0 };

      if (receiverHasSocket) {
        console.log("[VoiceCall] Attempting socket delivery", {
          callId,
          receiverId: resolvedReceiverId,
          roomName,
          receiverRoomSize,
        });

        emitIncomingCallEvents(io, resolvedReceiverId, incomingPayload);
        markCallDelivery({ callId, mode: "realtime-delivered" });
        await CallLog.findByIdAndUpdate(callId, {
          status: "ringing",
          failureReason: null,
        });

        console.log("[VoiceCall] Socket delivery emitted", {
          callId,
          receiverId: resolvedReceiverId,
          eventNames: ["call:incoming", "voice-call:incoming"],
          status: "realtime-delivered",
        });

        io.to(`user_${callerId}`).emit("voice-call:ringing", {
          callId,
          receiverId: resolvedReceiverId,
          status: "ringing",
          delivery: "realtime-delivered",
          message: "Ringing...",
        });
      } else {
        console.log("[VoiceCall] No active receiver socket, attempting push fallback", {
          callId,
          receiverId: resolvedReceiverId,
        });

        pushResult = await sendVoiceCallPushNotification({
          receiverId: resolvedReceiverId,
          payload: {
            type: "voice_call",
            callId,
            callerId,
            callerName: socket.userName,
            callType,
            conversationId: conversationId || null,
          },
        });

        console.log("[VoiceCall] Push fallback result", {
          callId,
          receiverId: resolvedReceiverId,
          pushAttempted: pushResult.attempted,
          pushSent: pushResult.sent,
          pushReason: pushResult.reason,
          pushSubscriptionCount: pushResult.subscriptionCount,
        });

        if (pushResult.sent > 0) {
          markCallDelivery({ callId, mode: "push-sent" });
          await CallLog.findByIdAndUpdate(callId, {
            status: "ringing",
            failureReason: null,
          });
          io.to(`user_${callerId}`).emit("voice-call:ringing", {
            callId,
            receiverId: resolvedReceiverId,
            status: "ringing",
            delivery: "push-attempted",
            message: "Trying to reach user...",
          });
        } else {
          markCallDelivery({
            callId,
            mode: "failed",
            failureReason: pushResult.reason || "NO_DELIVERY_CHANNEL",
          });
          failCall(callId, pushResult.reason || "NO_DELIVERY_CHANNEL");

          await CallLog.findByIdAndUpdate(callId, {
            status: "failed",
            callStatus: "unanswered",
            endedAt: new Date(),
            endedBy: callerId,
            failureReason: pushResult.reason || "NO_DELIVERY_CHANNEL",
            duration: 0,
            durationSeconds: 0,
          });

          io.to(`user_${callerId}`).emit("voice-call:failed", {
            callId,
            receiverId: resolvedReceiverId,
            code: CALL_ERROR.COULD_NOT_REACH_USER,
            message: "Couldn't reach user",
          });

          console.warn("[VoiceCall] Emitted COULD_NOT_REACH_USER", {
            callId,
            callerId,
            receiverId: resolvedReceiverId,
            reason: pushResult.reason || "NO_DELIVERY_CHANNEL",
            receiverHasSocket,
            pushAttempted: pushResult.attempted,
            pushSent: pushResult.sent,
          });
        }
      }

      console.log("[VoiceCall] Delivery decision", {
        callId,
        callerId,
        receiverId: resolvedReceiverId,
        receiverHasSocket,
        pushAttempted: pushResult.attempted,
        pushSent: pushResult.sent,
        pushReason: pushResult.reason,
        finalReason:
          receiverHasSocket || pushResult.sent > 0
            ? "DELIVERY_IN_PROGRESS"
            : pushResult.reason || "NO_DELIVERY_CHANNEL",
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
        io.to(`user_${resolvedReceiverId}`).emit("call:missed", { callId, code: CALL_ERROR.NO_ANSWER });
        io.to(`user_${callerId}`).emit("voice-call:timeout", { callId, code: CALL_ERROR.NO_ANSWER });
        io.to(`user_${resolvedReceiverId}`).emit("voice-call:timeout", { callId, code: CALL_ERROR.NO_ANSWER });
        io.to(`user_${resolvedReceiverId}`).emit("notification:missed-call", {
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
  };

  // ───────────────────────────────────────────────
  // CALL:INITIATE — caller starts a call
  // ───────────────────────────────────────────────
  socket.on("call:initiate", handleCallInitiate);
  socket.on("call-user", handleCallInitiate);

  // ───────────────────────────────────────────────
  // VOICE-CALL:INITIATE — voice call alias for the same signaling flow
  // ───────────────────────────────────────────────
  socket.on("voice-call:initiate", (payload = {}) =>
    handleCallInitiate({
      ...payload,
      callType: "voice",
      targetUserId: payload.targetUserId || payload.receiverId,
    })
  );

  const handleCallAccept = async ({ callId, callerId }) => {
    try {
      console.log("[VoiceCall] Accept received", {
        event: "voice-call:accepted",
        callId,
        callerId,
        receiverId: socket.userId,
      });
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

      emitCallLifecycleEvent(io, call.callerId, "call:accepted", {
        callId,
        receiverId: socket.userId,
        receiverName: socket.userName,
        receiverImage: socket.userImage || null,
        status: "connecting",
      }, call.callType);
    } catch (err) {
      console.error("call:accept error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  };

  // ───────────────────────────────────────────────
  // CALL:ACCEPT — receiver accepts
  // ───────────────────────────────────────────────
  socket.on("call:accept", handleCallAccept);
  socket.on("voice-call:accepted", handleCallAccept);

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

  const handleCallReject = async ({ callId, callerId }) => {
    try {
      console.log("[VoiceCall] Reject received", {
        event: "voice-call:rejected",
        callId,
        callerId,
        receiverId: socket.userId,
      });
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
      emitCallLifecycleEvent(io, peerId, "call:reject", {
        callId,
        receiverId: socket.userId,
        receiverName: socket.userName,
        code: CALL_ERROR.CALL_REJECTED,
      }, managerResult.call?.callType);
    } catch (err) {
      console.error("call:reject error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  };

  // ───────────────────────────────────────────────
  // CALL:REJECT — receiver rejects
  // ───────────────────────────────────────────────
  socket.on("call:reject", handleCallReject);
  socket.on("voice-call:rejected", handleCallReject);

  const handleCallCancel = async ({ callId, targetUserId }) => {
    try {
      console.log("[VoiceCall] Cancel received", {
        event: "call:cancel",
        callId,
        targetUserId,
        callerId: socket.userId,
      });
      const managerResult = endCall(callId);
      const call = managerResult.ok ? managerResult.call : getCallState(callId);

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

      emitCallLifecycleEvent(io, targetUserId, "call:end", {
        callId,
        callerId: socket.userId,
        endedBy: socket.userId,
        reason: "cancelled",
      }, callLog?.callType || call?.callType);
    } catch (err) {
      console.error("call:cancel error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  };

  // ───────────────────────────────────────────────
  // CALL:CANCEL — caller cancels before answer
  // ───────────────────────────────────────────────
  socket.on("call:cancel", handleCallCancel);

  const handleCallEnd = async ({ callId, targetUserId }) => {
    try {
      console.log("[VoiceCall] End received", {
        event: "voice-call:ended",
        callId,
        targetUserId,
        callerId: socket.userId,
      });
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
      emitCallLifecycleEvent(io, peerId, "call:end", {
        callId,
        endedBy: socket.userId,
      }, callLog?.callType || call?.callType);

      emitSocketLifecycleEvent(socket, "call:end", {
        callId,
        endedBy: socket.userId,
      }, callLog?.callType || call?.callType);
    } catch (err) {
      console.error("call:end error:", err.message);
      emitCallError(socket, CALL_ERROR.SERVER_ERROR);
    }
  };

  // ───────────────────────────────────────────────
  // CALL:END — either party ends the call
  // ───────────────────────────────────────────────
  socket.on("call:end", handleCallEnd);
  socket.on("end-call", handleCallEnd);

  socket.on("voice-call:ended", async ({ callId, targetUserId }) => {
    const activeCall = getCallState(callId);
    if (activeCall?.status === "ringing") {
      await handleCallCancel({ callId, targetUserId });
      return;
    }

    await handleCallEnd({ callId, targetUserId });
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay offer
  // ───────────────────────────────────────────────
  socket.on("webrtc:offer", ({ targetUserId, offer, callId }) => {
    if (!targetUserId || !offer || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    const payload = {
      offer,
      callId,
      fromUserId: socket.userId,
    };
    io.to(`user_${targetUserId}`).emit("webrtc:offer", payload);
    io.to(`user_${targetUserId}`).emit("call-offer", payload);
  });

  socket.on("call-offer", ({ targetUserId, offer, callId }) => {
    if (!targetUserId || !offer || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    const payload = {
      offer,
      callId,
      fromUserId: socket.userId,
    };
    io.to(`user_${targetUserId}`).emit("webrtc:offer", payload);
    io.to(`user_${targetUserId}`).emit("call-offer", payload);
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay answer
  // ───────────────────────────────────────────────
  socket.on("webrtc:answer", ({ targetUserId, answer, callId }) => {
    if (!targetUserId || !answer || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    const payload = {
      answer,
      callId,
      fromUserId: socket.userId,
    };
    io.to(`user_${targetUserId}`).emit("webrtc:answer", payload);
    io.to(`user_${targetUserId}`).emit("answer", payload);
  });

  socket.on("answer", ({ targetUserId, answer, callId }) => {
    if (!targetUserId || !answer || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    const payload = {
      answer,
      callId,
      fromUserId: socket.userId,
    };
    io.to(`user_${targetUserId}`).emit("webrtc:answer", payload);
    io.to(`user_${targetUserId}`).emit("answer", payload);
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay ICE candidate
  // ───────────────────────────────────────────────
  socket.on("webrtc:ice-candidate", ({ targetUserId, candidate, callId }) => {
    if (!targetUserId || !candidate || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    const payload = {
      candidate,
      callId,
      fromUserId: socket.userId,
    };
    io.to(`user_${targetUserId}`).emit("webrtc:ice-candidate", payload);
    io.to(`user_${targetUserId}`).emit("ice-candidate", payload);
  });

  socket.on("ice-candidate", ({ targetUserId, candidate, callId }) => {
    if (!targetUserId || !candidate || !callId) {
      emitCallError(socket, CALL_ERROR.INVALID_CALL_PAYLOAD);
      return;
    }
    const payload = {
      candidate,
      callId,
      fromUserId: socket.userId,
    };
    io.to(`user_${targetUserId}`).emit("webrtc:ice-candidate", payload);
    io.to(`user_${targetUserId}`).emit("ice-candidate", payload);
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

    emitCallLifecycleEvent(io, withUserId, "call:end", {
      callId,
      endedBy: socket.userId,
      reason: "disconnected",
    }, cleanupResult.call?.callType);
  });
};
