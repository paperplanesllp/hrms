import { CallLog } from "../modules/calls/CallLog.model.js";
import { Chat } from "../modules/chat/Chat.model.js";
import { Message } from "../modules/chat/Message.model.js";
import { notifyNewMessage } from "./socket.js";

// In-memory registry of active calls: Map<userId, { callId, withUserId, callType }>
const activeCalls = new Map();
// In-memory timeout tracker: Map<callId, timeoutId>
const callTimeouts = new Map();

const RING_TIMEOUT_MS = process.env.CALL_RING_TIMEOUT_MS || 30_000; // 30 seconds

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
    try {
      // Reject if caller is already in a call
      if (activeCalls.has(socket.userId)) {
        socket.emit("call:error", { message: "You are already in an active call." });
        return;
      }

      // Validate call type
      if (!["voice", "video"].includes(callType)) {
        socket.emit("call:error", { message: "Invalid call type." });
        return;
      }

      // Reject early when receiver has no active socket connection.
      const targetRoom = io?.sockets?.adapter?.rooms?.get(`user_${targetUserId}`);
      const isTargetConnected = Boolean(targetRoom && targetRoom.size > 0);
      if (!isTargetConnected) {
        socket.emit("call:error", { message: "User is offline or not reachable." });
        return;
      }

      // Check if target is in another call
      if (activeCalls.has(targetUserId)) {
        socket.emit("call:busy", { message: "User is busy on another call." });
        
        // Also log this as a busy call
        const busyLog = await CallLog.create({
          caller: socket.userId,
          receiver: targetUserId,
          conversationId: conversationId || undefined,
          callType,
          status: "busy",
          callStatus: "unanswered",
          startedAt: new Date(),
          endedAt: new Date(),
          durationSeconds: 0,
          initiatedBy: socket.userId,
          endedBy: socket.userId,
          failureReason: "Target user busy on another call",
        });

        await persistCallTimelineMessage(busyLog, socket.userId, null);
        
        return;
      }

      // Create call log in DB
      const callLog = await CallLog.create({
        caller: socket.userId,
        receiver: targetUserId,
        conversationId: conversationId || undefined,
        callType,
        status: "initiated",
        callStatus: "unanswered",
        startedAt: new Date(),
        initiatedBy: socket.userId,
      });

      const callId = callLog._id.toString();

      activeCalls.set(socket.userId, {
        callId,
        withUserId: targetUserId,
        callType,
      });

      // Ack caller (includes callId for later reference)
      socket.emit("call:initiated", { callId });

      // Transition to ringing and notify receiver
      await CallLog.findByIdAndUpdate(callId, { status: "ringing" });
      
      io.to(`user_${targetUserId}`).emit("call:incoming", {
        callId,
        callerId: socket.userId,
        callerName: socket.userName,
        callerImage: socket.userImage || null,
        callType,
        conversationId: conversationId || null,
      });

      // Also send browser notification
      io.to(`user_${targetUserId}`).emit("notification:incoming-call", {
        callId,
        callerName: socket.userName,
        callType,
      });

      // Set timeout for unanswered call
      const timeoutId = setTimeout(async () => {
        try {
          const currentLog = await CallLog.findById(callId);
          // Only mark as no_answer if still ringing (call not answered or rejected)
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
        } catch (err) {
          console.error("[CallHandlers] Timeout update error:", err.message);
        }

        // Notify both parties about timeout
        io.to(`user_${socket.userId}`).emit("call:timeout", { callId });
        io.to(`user_${targetUserId}`).emit("call:timeout", { callId });
        io.to(`user_${targetUserId}`).emit("notification:missed-call", {
          callId,
          callerName: socket.userName,
          callType,
        });

        // Clean up
        activeCalls.delete(socket.userId);
        callTimeouts.delete(callId);
      }, RING_TIMEOUT_MS);

      callTimeouts.set(callId, timeoutId);
    } catch (err) {
      console.error("call:initiate error:", err.message);
      socket.emit("call:error", { message: "Failed to initiate call." });
    }
  });

  // ───────────────────────────────────────────────
  // CALL:ACCEPT — receiver accepts
  // ───────────────────────────────────────────────
  socket.on("call:accept", async ({ callId, callerId }) => {
    try {
      const callLog = await CallLog.findById(callId);
      if (!callLog || !["initiated", "ringing"].includes(callLog.status)) {
        socket.emit("call:error", { message: "Call is no longer available." });
        return;
      }

      // Clear timeout since call is being answered
      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      callLog.status = "accepted";
      callLog.answeredAt = new Date();
      callLog.callStatus = "unanswered";
      await callLog.save();

      activeCalls.set(socket.userId, {
        callId,
        withUserId: callerId,
        callType: callLog.callType,
      });

      // Notify caller that we accepted
      io.to(`user_${callerId}`).emit("call:accepted", {
        callId,
        receiverId: socket.userId,
        receiverName: socket.userName,
        receiverImage: socket.userImage || null,
      });
    } catch (err) {
      console.error("call:accept error:", err.message);
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
    }
  });

  // ───────────────────────────────────────────────
  // CALL:REJECT — receiver rejects
  // ───────────────────────────────────────────────
  socket.on("call:reject", async ({ callId, callerId }) => {
    try {
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

      // Clear timeout
      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      // Clear caller's active call entry
      if (activeCalls.get(callerId)?.callId === callId) {
        activeCalls.delete(callerId);
      }

      // Notify caller
      io.to(`user_${callerId}`).emit("call:rejected", {
        callId,
        receiverId: socket.userId,
        receiverName: socket.userName,
      });
    } catch (err) {
      console.error("call:reject error:", err.message);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:CANCEL — caller cancels before answer
  // ───────────────────────────────────────────────
  socket.on("call:cancel", async ({ callId, targetUserId }) => {
    try {
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

      // Clear timeout
      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      activeCalls.delete(socket.userId);

      // Notify receiver
      io.to(`user_${targetUserId}`).emit("call:cancelled", {
        callId,
        callerId: socket.userId,
      });
    } catch (err) {
      console.error("call:cancel error:", err.message);
    }
  });

  // ───────────────────────────────────────────────
  // CALL:END — either party ends the call
  // ───────────────────────────────────────────────
  socket.on("call:end", async ({ callId, targetUserId }) => {
    try {
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

      // Clear timeout
      const timeoutId = callTimeouts.get(callId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        callTimeouts.delete(callId);
      }

      activeCalls.delete(socket.userId);
      if (activeCalls.get(targetUserId)?.callId === callId) {
        activeCalls.delete(targetUserId);
      }

      // Notify other party
      io.to(`user_${targetUserId}`).emit("call:ended", {
        callId,
        endedBy: socket.userId,
      });
    } catch (err) {
      console.error("call:end error:", err.message);
    }
  });

  // ───────────────────────────────────────────────
  // WEBRTC SIGNALING — relay offer
  // ───────────────────────────────────────────────
  socket.on("webrtc:offer", ({ targetUserId, offer, callId }) => {
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
    const active = activeCalls.get(socket.userId);
    if (!active) return;

    const { callId, withUserId } = active;
    activeCalls.delete(socket.userId);

    // Clear associated timeout
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

    // Notify other party
    io.to(`user_${withUserId}`).emit("call:ended", {
      callId,
      endedBy: socket.userId,
      reason: "disconnected",
    });
  });
};
