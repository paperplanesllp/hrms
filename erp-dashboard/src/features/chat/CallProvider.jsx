import React, { useEffect, useRef, useCallback } from "react";
import { getSocket, initializeSocket, getSocketDebugInfo } from "../../lib/socket.js";
import { getAuth } from "../../lib/auth.js";
import { useCallStore, callActions, getCallState } from "./store/callStore.js";
import { useWebRTC } from "./hooks/useWebRTC.js";
import { useRingtone } from "./hooks/useRingtone.js";
import {
  requestNotificationPermission,
  showIncomingCallNotification,
} from "./utils/browserNotifications.js";
import IncomingCallModal from "./IncomingCallModal.jsx";
import CallScreen from "./CallScreen.jsx";
import { showCallToast } from "./utils/callErrorMap.js";
import api from "../../lib/api.js";

/**
 * CallProvider wraps the chat page and manages the entire call lifecycle:
 *  - Listens to socket call/WebRTC events
 *  - Drives RTCPeerConnection signaling
 *  - Renders IncomingCallModal and CallScreen as overlays
 */
export default function CallProvider({ children }) {
  const webrtc = useWebRTC();
  const { startRingtone, stopRingtone } = useRingtone();

  // Subscribed store slices (trigger re-renders)
  const callStatus     = useCallStore((s) => s.callStatus);
  const callType       = useCallStore((s) => s.callType);
  const remoteUser     = useCallStore((s) => s.remoteUser);
  const isIncoming     = useCallStore((s) => s.isIncomingCall);
  const incomingData   = useCallStore((s) => s.incomingCallData);

  // Refs that hold mutable values without re-rendering
  const durationRef      = useRef(null);  // interval id
  const ringTimeoutRef   = useRef(null);  // auto-miss timeout id
  const iceRestartRef    = useRef(null);  // pending ICE restart debounce
  const targetUserIdRef  = useRef(null);  // opposite party's userId
  const processedSignalsRef = useRef(new Set());

  useEffect(() => {
    const restoreIncomingCallFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const incomingCallId = params.get("incomingCallId");
      if (!incomingCallId) return;

      try {
        const response = await api.get(`/calls/${incomingCallId}/session`);
        const session = response?.data?.call;
        if (!session) return;

        const receiverId = String(session.receiverId?._id || session.receiverId || "");
        const auth = getAuth();
        const localUser = String(auth?.user?._id || auth?.user?.id || "");

        const isPendingStatus = ["initiating", "ringing", "accepted"].includes(String(session.status || "").toLowerCase());
        if (response?.data?.active && isPendingStatus && receiverId && localUser && receiverId === localUser) {
          const caller = session.caller || {};
          const payload = {
            callId: incomingCallId,
            callerId: String(caller._id || session.callerId || ""),
            callerName: caller.name || "Unknown",
            callerImage: caller.profileImageUrl || null,
            callType: session.callType || "voice",
            conversationId: session.conversationId || null,
            status: "incoming",
          };

          console.log("📲 Restored incoming call from URL", payload);
          callActions.showIncomingCall(payload);
          startRingtone();
        }
      } catch (err) {
        console.warn("[CallProvider] Failed to restore incoming call", err?.message);
      } finally {
        params.delete("incomingCallId");
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash || ""}`;
        window.history.replaceState({}, "", next);
      }
    };

    restoreIncomingCallFromUrl();
  }, [startRingtone]);

  // ── Duration timer ───────────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    clearInterval(durationRef.current);
    callActions.setCallDuration(0);
    durationRef.current = setInterval(() => {
      callActions.setCallDuration(getCallState().callDuration + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    clearInterval(durationRef.current);
    durationRef.current = null;
  }, []);

  // ── Full cleanup ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopRingtone();
    webrtc.closePeerConnection();
    stopDurationTimer();
    clearTimeout(ringTimeoutRef.current);
    clearTimeout(iceRestartRef.current);
    ringTimeoutRef.current = null;
    iceRestartRef.current = null;
    targetUserIdRef.current = null;
    processedSignalsRef.current.clear();
  }, [webrtc, stopDurationTimer, stopRingtone]);

  const rememberSignal = useCallback((type, payload = {}) => {
    const rawCandidate = payload.candidate?.candidate || "";
    const key = [
      type,
      payload.callId || getCallState().callId || "",
      payload.fromUserId || "",
      payload.answer?.sdp || payload.offer?.sdp || rawCandidate,
    ].join("|");

    if (processedSignalsRef.current.has(key)) return false;
    processedSignalsRef.current.add(key);
    return true;
  }, []);

  const scheduleIceRestart = useCallback((socket) => {
    clearTimeout(iceRestartRef.current);
    iceRestartRef.current = setTimeout(async () => {
      const { callStatus: currentStatus } = getCallState();
      if (!["in_call", "connected"].includes(currentStatus)) return;

      try {
        const restart = await webrtc.restartIce();
        if (!restart?.offer || !restart.targetUserId || !restart.callId) return;

        socket.emit("call-offer", {
          targetUserId: restart.targetUserId,
          offer: restart.offer,
          callId: restart.callId,
          iceRestart: true,
        });
      } catch (err) {
        console.warn("[CallProvider] ICE restart failed:", err?.message);
      }
    }, 1200);
  }, [webrtc]);

  const emitRejectEvent = useCallback((socket, payload, eventCallType) => {
    const eventName = eventCallType === "voice" ? "voice-call:rejected" : "call:reject";
    socket.emit(eventName, payload);
  }, []);

  const emitAcceptEvent = useCallback((socket, payload, eventCallType) => {
    const eventName = eventCallType === "voice" ? "voice-call:accepted" : "call:accept";
    socket.emit(eventName, payload);
  }, []);

  const emitEndEvent = useCallback((socket, payload, eventCallType) => {
    const eventName = eventCallType === "voice" ? "voice-call:ended" : "call:end";
    socket.emit(eventName, payload);
  }, []);

  // ── Socket event handlers (registered once, read store via getCallState) ──
  useEffect(() => {
    const socket = getSocket() || initializeSocket();
    if (!socket) return;

    // ── call:initiated — backend acked our outbound call; store the callId ──
    const onCallInitiated = ({ callId, status }) => {
      console.log("📞 Outgoing call acknowledged", {
        event: "call:initiated",
        callId,
        status,
        ...getSocketDebugInfo(),
      });
      callActions.setCallId(callId);
      if (status === "session_created" || status === "initiating") {
        callActions.setCallStatus("trying");
      }
    };

    const onVoiceCallRinging = ({ callId, status, message, delivery }) => {
      console.log("🔔 Voice call ringing update", {
        event: "voice-call:ringing",
        callId,
        status,
        delivery,
        message,
        ...getSocketDebugInfo(),
      });
      if (String(status).toLowerCase() === "ringing") {
        callActions.setCallStatus("ringing");
      } else {
        callActions.setCallStatus("trying");
      }
    };

    // ── call:incoming — someone is calling us ────────────────────────────
    const onCallIncoming = (data) => {
      console.log("📲 Incoming call event received", {
        event: data?.eventName || "call:incoming",
        callId: data.callId,
        callerId: data.callerId,
        callType: data.callType,
        ...getSocketDebugInfo(),
      });
      console.log("[CallProvider] Receiver listener active for voice-call:incoming", {
        callId: data.callId,
        event: "voice-call:incoming",
      });
      const { callStatus: cs } = getCallState();
      if (cs !== "idle") {
        emitRejectEvent(socket, { callId: data.callId, callerId: data.callerId }, data.callType);
        return;
      }
      targetUserIdRef.current = data.callerId;
      callActions.showIncomingCall(data);
      
      // Start ringtone
      startRingtone();
      
      // Request notification permission and show notification
      requestNotificationPermission().then((granted) => {
        if (granted) {
          showIncomingCallNotification({
            callerName: data.callerName,
            callType: data.callType,
            onClickCallback: () => {
              // Focus the window when notification is clicked
              window.focus();
            },
          });
        }
      });
    };

    // ── call:accepted — the person we called accepted ────────────────────
    const onCallAccepted = async ({ callId, receiverId }) => {
      console.log("✅ Call accepted event received", {
        event: "call:accepted",
        callId,
        receiverId,
        callType: getCallState().callType,
        ...getSocketDebugInfo(),
      });
      callActions.setCallStatus("connecting");
      targetUserIdRef.current = receiverId;

      try {
        const stream = await webrtc.getMediaStream(getCallState().callType);
        webrtc.createPeerConnection((candidate) => {
          socket.emit("ice-candidate", {
            targetUserId: receiverId,
            candidate,
            callId,
          });
        }, {
          remoteUserId: receiverId,
          callId,
          onConnectionChange: ({ connectionState, iceConnectionState }) => {
            if (connectionState === "connected" || iceConnectionState === "connected" || iceConnectionState === "completed") {
              callActions.setCallStatus("connected");
            }
            if (connectionState === "failed" || iceConnectionState === "failed" || iceConnectionState === "disconnected") {
              scheduleIceRestart(socket);
            }
          },
        });
        webrtc.addTracks(stream);
        const offer = await webrtc.createOffer();
        socket.emit("webrtc:offer", { targetUserId: receiverId, offer, callId });
      } catch (err) {
        console.error("[CallProvider] createOffer error:", err);
        showCallToast({ title: "Call", code: "SERVER_ERROR", type: "error" });
        emitEndEvent(socket, { callId, targetUserId: receiverId }, getCallState().callType);
        cleanup();
        callActions.resetCall();
      }
    };

    // ── call:reject ──────────────────────────────────────────────────────
    const onCallRejected = () => {
      console.log("❌ Call rejected event received", {
        event: "call:reject",
        callType: getCallState().callType,
        ...getSocketDebugInfo(),
      });
      cleanup();
      callActions.setCallStatus("rejected");
      setTimeout(() => callActions.resetCall(), 600);
      showCallToast({ title: "Call", code: "CALL_REJECTED", type: "info" });
    };

    // ── call:end ─────────────────────────────────────────────────────────
    const onCallEnded = ({ reason }) => {
      console.log("📴 Call ended event received", {
        event: "call:end",
        reason,
        callType: getCallState().callType,
        ...getSocketDebugInfo(),
      });
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      cleanup();
      callActions.setCallStatus("ended");
      setTimeout(() => callActions.resetCall(), 350);

      if (reason === "disconnected") {
        showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
      }
    };

    // ── call:missed ───────────────────────────────────────────────────────
    const onCallMissed = () => {
      console.log("⌛ Call missed event received", {
        event: "call:missed",
        callType: getCallState().callType,
        ...getSocketDebugInfo(),
      });
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      cleanup();
      callActions.setCallStatus("no_answer");
      setTimeout(() => callActions.resetCall(), 600);
      showCallToast({ title: "Call", code: "NO_ANSWER", type: "info" });
    };

    const onVoiceCallTimeout = ({ code }) => {
      console.log("⌛ Voice call timeout event received", {
        event: "voice-call:timeout",
        code,
        ...getSocketDebugInfo(),
      });
      onCallMissed();
    };

    const onVoiceCallFailed = ({ code, message }) => {
      console.log("⚠️ Voice call failed event received", {
        event: "voice-call:failed",
        code,
        message,
        ...getSocketDebugInfo(),
      });
      cleanup();
      callActions.setCallStatus("failed");
      showCallToast({ title: "Call", code: code || "COULD_NOT_REACH_USER", type: "info" });
      setTimeout(() => callActions.resetCall(), 700);
    };

    // ── call:busy — target user is already in another call ───────────────
    const onCallBusy = ({ code }) => {
      console.log("🚫 Call busy event received", {
        event: "call:busy",
        code,
        callType: getCallState().callType,
        ...getSocketDebugInfo(),
      });
      cleanup();
      callActions.resetCall();
      showCallToast({ title: "Call", code: code || "USER_BUSY", type: "info" });
    };

    // ── webrtc:offer — received by the answering side ────────────────────
    const onWebRTCOffer = async ({ offer, callId, fromUserId }) => {
      if (!rememberSignal("offer", { offer, callId, fromUserId })) return;
      try {
        const stream = await webrtc.getMediaStream(getCallState().callType);
        webrtc.createPeerConnection((candidate) => {
          socket.emit("ice-candidate", {
            targetUserId: fromUserId,
            candidate,
            callId,
          });
        }, {
          remoteUserId: fromUserId,
          callId,
          onConnectionChange: ({ connectionState, iceConnectionState }) => {
            if (connectionState === "connected" || iceConnectionState === "connected" || iceConnectionState === "completed") {
              callActions.setCallStatus("connected");
            }
            if (connectionState === "failed" || iceConnectionState === "failed" || iceConnectionState === "disconnected") {
              scheduleIceRestart(socket);
            }
          },
        });
        webrtc.addTracks(stream);
        const answer = await webrtc.createAnswer(offer);
        socket.emit("answer", { targetUserId: fromUserId, answer, callId });
        callActions.setCallStatus("connecting");
        startDurationTimer();
      } catch (err) {
        console.error("[CallProvider] createAnswer error:", err);
        showCallToast({ title: "Call", code: "SERVER_ERROR", type: "error" });
        emitEndEvent(socket, { callId, targetUserId: fromUserId }, getCallState().callType);
        cleanup();
        callActions.resetCall();
      }
    };

    // ── webrtc:answer — received by the calling side ─────────────────────
    const onWebRTCAnswer = async ({ answer, callId, fromUserId }) => {
      if (!rememberSignal("answer", { answer, callId, fromUserId })) return;
      await webrtc.setRemoteAnswer(answer);
      callActions.setCallStatus("connecting");
      startDurationTimer();
      
      // Emit to backend that connection is established
      const activeCallId = callId || getCallState().callId;
      if (activeCallId) {
        socket.emit("call:connected", { callId: activeCallId });
      }
    };

    // ── webrtc:ice-candidate ──────────────────────────────────────────────
    const onIceCandidate = async ({ candidate, callId, fromUserId }) => {
      if (!rememberSignal("ice", { candidate, callId, fromUserId })) return;
      await webrtc.addIceCandidate(candidate);
    };

    // ── call:error ────────────────────────────────────────────────────────
    const onCallError = ({ code }) => {
      console.log("⚠️ Call error event received", {
        event: "call:error",
        code,
        callType: getCallState().callType,
        ...getSocketDebugInfo(),
      });
      showCallToast({ title: "Call", code: code || "SERVER_ERROR", type: "error" });
      cleanup();
      callActions.resetCall();
    };

    const onSocketDisconnect = () => {
      console.log("🔌 CallProvider observed socket disconnect", getSocketDebugInfo());
      const { callStatus: currentStatus } = getCallState();
      if (currentStatus !== "idle") {
        showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
        cleanup();
        callActions.resetCall();
      }
    };

    const onSocketConnectError = () => {
      console.log("❌ CallProvider observed socket connect error", getSocketDebugInfo());
      const { callStatus: currentStatus } = getCallState();
      if (currentStatus === "calling" || currentStatus === "connecting") {
        showCallToast({ title: "Call", code: "REALTIME_UNAVAILABLE", type: "error" });
        cleanup();
        callActions.resetCall();
      }
    };

    socket.on("call:initiated",       onCallInitiated);
    socket.on("call:incoming",        onCallIncoming);
    socket.on("voice-call:incoming",  onCallIncoming);
    socket.on("incoming-call",        onCallIncoming);
    socket.on("call:accepted",        onCallAccepted);
    socket.on("call:reject",          onCallRejected);
    socket.on("voice-call:ringing",   onVoiceCallRinging);
    socket.on("voice-call:timeout",   onVoiceCallTimeout);
    socket.on("voice-call:failed",    onVoiceCallFailed);
    socket.on("call:missed",          onCallMissed);
    socket.on("call:busy",            onCallBusy);
    socket.on("call:end",             onCallEnded);
    socket.on("webrtc:offer",         onWebRTCOffer);
    socket.on("call-offer",           onWebRTCOffer);
    socket.on("webrtc:answer",        onWebRTCAnswer);
    socket.on("answer",               onWebRTCAnswer);
    socket.on("webrtc:ice-candidate", onIceCandidate);
    socket.on("ice-candidate",        onIceCandidate);
    socket.on("call:error",           onCallError);
    socket.on("disconnect",           onSocketDisconnect);
    socket.on("connect_error",        onSocketConnectError);

    return () => {
      socket.off("call:initiated",       onCallInitiated);
      socket.off("call:incoming",        onCallIncoming);
      socket.off("voice-call:incoming",  onCallIncoming);
      socket.off("incoming-call",        onCallIncoming);
      socket.off("call:accepted",        onCallAccepted);
      socket.off("call:reject",          onCallRejected);
      socket.off("voice-call:ringing",   onVoiceCallRinging);
      socket.off("voice-call:timeout",   onVoiceCallTimeout);
      socket.off("voice-call:failed",    onVoiceCallFailed);
      socket.off("call:missed",          onCallMissed);
      socket.off("call:busy",            onCallBusy);
      socket.off("call:end",             onCallEnded);
      socket.off("webrtc:offer",         onWebRTCOffer);
      socket.off("call-offer",           onWebRTCOffer);
      socket.off("webrtc:answer",        onWebRTCAnswer);
      socket.off("answer",               onWebRTCAnswer);
      socket.off("webrtc:ice-candidate", onIceCandidate);
      socket.off("ice-candidate",        onIceCandidate);
      socket.off("call:error",           onCallError);
      socket.off("disconnect",           onSocketDisconnect);
      socket.off("connect_error",        onSocketConnectError);
    };
    // Intentionally empty deps — handlers use getCallState() for fresh state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, emitAcceptEvent, emitEndEvent, emitRejectEvent, rememberSignal, scheduleIceRestart, startDurationTimer, startRingtone, stopRingtone, webrtc]);

  // ── Listen for mute/camera toggle events dispatched by CallScreen ────────
  useEffect(() => {
    const handleToggleMute   = () => webrtc.toggleMute();
    const handleToggleCamera = () => webrtc.toggleCamera();

    window.addEventListener("call:toggle-mute",   handleToggleMute);
    window.addEventListener("call:toggle-camera", handleToggleCamera);
    return () => {
      window.removeEventListener("call:toggle-mute",   handleToggleMute);
      window.removeEventListener("call:toggle-camera", handleToggleCamera);
    };
  }, [webrtc]);

  // ── Accept incoming call ─────────────────────────────────────────────────
  const handleAcceptCall = () => {
    if (!incomingData) return;
    const socket = getSocket();
    if (!socket?.connected) {
      showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
      return;
    }
    clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
    
    stopRingtone();

    const { callId, callerId, callerName, callerImage, callType: ct, conversationId } = incomingData;
    callActions.setCallId(callId);
    callActions.setCallType(ct);
    callActions.setRemoteUser({ _id: callerId, name: callerName, profileImageUrl: callerImage });
    callActions.setConversationId(conversationId);
    callActions.setCallStatus("connecting");
    targetUserIdRef.current = callerId;

    emitAcceptEvent(socket, { callId, callerId }, ct);
  };

  // ── Reject incoming call ─────────────────────────────────────────────────
  const handleRejectCall = () => {
    if (!incomingData) return;
    const socket = getSocket();
    if (!socket?.connected) {
      showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
      return;
    }
    clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
    
    stopRingtone();
    
    console.log("❌ Emitting reject event", {
      event: incomingData.callType === "voice" ? "voice-call:rejected" : "call:reject",
      callId: incomingData.callId,
      callerId: incomingData.callerId,
      ...getSocketDebugInfo(),
    });
    emitRejectEvent(socket, { callId: incomingData.callId, callerId: incomingData.callerId }, incomingData.callType);
    callActions.resetCall();
  };

  // ── End active call ──────────────────────────────────────────────────────
  const handleEndCall = () => {
    const socket = getSocket();
    const { callId } = getCallState();
    const targetId = targetUserIdRef.current;
    const { callType: activeCallType } = getCallState();

    if (socket?.connected && callId && targetId) {
      console.log("📴 Emitting end event", {
        event: activeCallType === "voice" ? "voice-call:ended" : "call:end",
        callId,
        targetUserId: targetId,
        ...getSocketDebugInfo(),
      });
      socket.emit("end-call", { callId, targetUserId: targetId });
    }
    cleanup();
    callActions.setCallStatus("ended");
    setTimeout(() => callActions.resetCall(), 350);
  };

  // ── Cancel outbound call (still ringing on receiver side) ────────────────
  const handleCancelCall = () => {
    const socket = getSocket();
    const { callId } = getCallState();
    const targetId = targetUserIdRef.current;
    const { callType: activeCallType } = getCallState();

    if (socket?.connected && callId && targetId) {
      const eventName = activeCallType === "voice" ? "voice-call:ended" : "call:cancel";
      console.log("📴 Emitting cancel/end event", {
        event: eventName,
        callId,
        targetUserId: targetId,
        ...getSocketDebugInfo(),
      });
      socket.emit(eventName, { callId, targetUserId: targetId });
    }
    cleanup();
    callActions.resetCall();
  };

  // ── Decide which overlay to display ─────────────────────────────────────
  const showIncomingModal = isIncoming && ["incoming", "ringing"].includes(callStatus);
  const showCallScreen    = ["trying", "calling", "ringing", "connecting", "connected", "in_call", "ended", "failed", "rejected", "no_answer"].includes(callStatus);

  return (
    <>
      {children}

      {showIncomingModal && (
        <IncomingCallModal
          data={incomingData}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {showCallScreen && (
        <CallScreen
          remoteUser={remoteUser}
          callType={callType}
          callStatus={callStatus}
          onEnd={callStatus === "calling" ? handleCancelCall : handleEndCall}
        />
      )}
    </>
  );
}
