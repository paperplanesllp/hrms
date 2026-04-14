import React, { useEffect, useRef, useCallback } from "react";
import { getSocket } from "../../lib/socket.js";
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
  const targetUserIdRef  = useRef(null);  // opposite party's userId

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
    ringTimeoutRef.current = null;
    targetUserIdRef.current = null;
  }, [webrtc, stopDurationTimer, stopRingtone]);

  // ── Socket event handlers (registered once, read store via getCallState) ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ── call:initiated — backend acked our outbound call; store the callId ──
    const onCallInitiated = ({ callId }) => {
      callActions.setCallId(callId);
    };

    // ── call:incoming — someone is calling us ────────────────────────────
    const onCallIncoming = (data) => {
      const { callStatus: cs } = getCallState();
      if (cs !== "idle") {
        socket.emit("call:reject", { callId: data.callId, callerId: data.callerId });
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
      callActions.setCallStatus("connecting");
      targetUserIdRef.current = receiverId;

      try {
        const stream = await webrtc.getMediaStream(getCallState().callType);
        webrtc.createPeerConnection((candidate) => {
          socket.emit("webrtc:ice-candidate", {
            targetUserId: receiverId,
            candidate,
            callId,
          });
        });
        webrtc.addTracks(stream);
        const offer = await webrtc.createOffer();
        socket.emit("webrtc:offer", { targetUserId: receiverId, offer, callId });
      } catch (err) {
        console.error("[CallProvider] createOffer error:", err);
        showCallToast({ title: "Call", code: "SERVER_ERROR", type: "error" });
        socket.emit("call:end", { callId, targetUserId: receiverId });
        cleanup();
        callActions.resetCall();
      }
    };

    // ── call:reject ──────────────────────────────────────────────────────
    const onCallRejected = () => {
      cleanup();
      callActions.resetCall();
      showCallToast({ title: "Call", code: "CALL_REJECTED", type: "info" });
    };

    // ── call:end ─────────────────────────────────────────────────────────
    const onCallEnded = ({ reason }) => {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      cleanup();
      callActions.resetCall();

      if (reason === "disconnected") {
        showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
      }
    };

    // ── call:missed ───────────────────────────────────────────────────────
    const onCallMissed = () => {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      cleanup();
      callActions.resetCall();
      showCallToast({ title: "Call", code: "NO_ANSWER", type: "info" });
    };

    // ── call:busy — target user is already in another call ───────────────
    const onCallBusy = ({ code }) => {
      cleanup();
      callActions.resetCall();
      showCallToast({ title: "Call", code: code || "USER_BUSY", type: "info" });
    };

    // ── webrtc:offer — received by the answering side ────────────────────
    const onWebRTCOffer = async ({ offer, callId, fromUserId }) => {
      try {
        const stream = await webrtc.getMediaStream(getCallState().callType);
        webrtc.createPeerConnection((candidate) => {
          socket.emit("webrtc:ice-candidate", {
            targetUserId: fromUserId,
            candidate,
            callId,
          });
        });
        webrtc.addTracks(stream);
        const answer = await webrtc.createAnswer(offer);
        socket.emit("webrtc:answer", { targetUserId: fromUserId, answer, callId });
        callActions.setCallStatus("in_call");
        startDurationTimer();
      } catch (err) {
        console.error("[CallProvider] createAnswer error:", err);
        showCallToast({ title: "Call", code: "SERVER_ERROR", type: "error" });
        socket.emit("call:end", { callId, targetUserId: fromUserId });
        cleanup();
        callActions.resetCall();
      }
    };

    // ── webrtc:answer — received by the calling side ─────────────────────
    const onWebRTCAnswer = async ({ answer }) => {
      await webrtc.setRemoteAnswer(answer);
      callActions.setCallStatus("in_call");
      startDurationTimer();
      
      // Emit to backend that connection is established
      const { callId } = getCallState();
      if (callId) {
        socket.emit("call:connected", { callId });
      }
    };

    // ── webrtc:ice-candidate ──────────────────────────────────────────────
    const onIceCandidate = async ({ candidate }) => {
      await webrtc.addIceCandidate(candidate);
    };

    // ── call:error ────────────────────────────────────────────────────────
    const onCallError = ({ code }) => {
      showCallToast({ title: "Call", code: code || "SERVER_ERROR", type: "error" });
      cleanup();
      callActions.resetCall();
    };

    const onSocketDisconnect = () => {
      const { callStatus: currentStatus } = getCallState();
      if (currentStatus !== "idle") {
        showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
        cleanup();
        callActions.resetCall();
      }
    };

    const onSocketConnectError = () => {
      const { callStatus: currentStatus } = getCallState();
      if (currentStatus === "calling" || currentStatus === "connecting") {
        showCallToast({ title: "Call", code: "REALTIME_UNAVAILABLE", type: "error" });
        cleanup();
        callActions.resetCall();
      }
    };

    socket.on("call:initiated",       onCallInitiated);
    socket.on("call:incoming",        onCallIncoming);
    socket.on("call:accepted",        onCallAccepted);
    socket.on("call:reject",          onCallRejected);
    socket.on("call:missed",          onCallMissed);
    socket.on("call:busy",            onCallBusy);
    socket.on("call:end",             onCallEnded);
    socket.on("webrtc:offer",         onWebRTCOffer);
    socket.on("webrtc:answer",        onWebRTCAnswer);
    socket.on("webrtc:ice-candidate", onIceCandidate);
    socket.on("call:error",           onCallError);
    socket.on("disconnect",           onSocketDisconnect);
    socket.on("connect_error",        onSocketConnectError);

    return () => {
      socket.off("call:initiated",       onCallInitiated);
      socket.off("call:incoming",        onCallIncoming);
      socket.off("call:accepted",        onCallAccepted);
      socket.off("call:reject",          onCallRejected);
      socket.off("call:missed",          onCallMissed);
      socket.off("call:busy",            onCallBusy);
      socket.off("call:end",             onCallEnded);
      socket.off("webrtc:offer",         onWebRTCOffer);
      socket.off("webrtc:answer",        onWebRTCAnswer);
      socket.off("webrtc:ice-candidate", onIceCandidate);
      socket.off("call:error",           onCallError);
      socket.off("disconnect",           onSocketDisconnect);
      socket.off("connect_error",        onSocketConnectError);
    };
    // Intentionally empty deps — handlers use getCallState() for fresh state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    socket.emit("call:accept", { callId, callerId });
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
    
    socket.emit("call:reject", { callId: incomingData.callId, callerId: incomingData.callerId });
    callActions.resetCall();
  };

  // ── End active call ──────────────────────────────────────────────────────
  const handleEndCall = () => {
    const socket = getSocket();
    const { callId } = getCallState();
    const targetId = targetUserIdRef.current;

    if (socket?.connected && callId && targetId) {
      socket.emit("call:end", { callId, targetUserId: targetId });
    }
    cleanup();
    callActions.resetCall();
  };

  // ── Cancel outbound call (still ringing on receiver side) ────────────────
  const handleCancelCall = () => {
    const socket = getSocket();
    const { callId } = getCallState();
    const targetId = targetUserIdRef.current;

    if (socket?.connected && callId && targetId) {
      socket.emit("call:cancel", { callId, targetUserId: targetId });
    }
    cleanup();
    callActions.resetCall();
  };

  // ── Decide which overlay to display ─────────────────────────────────────
  const showIncomingModal = isIncoming && ["incoming", "ringing"].includes(callStatus);
  const showCallScreen    = ["calling", "connecting", "in_call"].includes(callStatus);

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
