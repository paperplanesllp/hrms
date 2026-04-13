import React, { useEffect, useRef, useCallback } from "react";
import { getSocket } from "../../lib/socket.js";
import { useCallStore, callActions, getCallState } from "./store/callStore.js";
import { useWebRTC } from "./hooks/useWebRTC.js";
import { useRingtone } from "./hooks/useRingtone.js";
import { toast } from "../../store/toastStore.js";
import {
  requestNotificationPermission,
  showIncomingCallNotification,
  showMissedCallNotification,
} from "./utils/browserNotifications.js";
import IncomingCallModal from "./IncomingCallModal.jsx";
import CallScreen from "./CallScreen.jsx";

const RING_TIMEOUT_MS = 45_000; // auto-miss after 45 s

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
        // Already in a call → auto-reject with busy
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
        toast({ title: "Call failed", message: "Could not access camera/microphone.", type: "error" });
        socket.emit("call:end", { callId, targetUserId: receiverId });
        cleanup();
        callActions.resetCall();
      }
    };

    // ── call:rejected ────────────────────────────────────────────────────
    const onCallRejected = ({ receiverName }) => {
      cleanup();
      callActions.resetCall();
      toast({ title: "Call declined", message: `${receiverName || "User"} declined your call.`, type: "info" });
    };

    // ── call:cancelled — caller withdrew before we answered ──────────────
    const onCallCancelled = () => {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      cleanup();
      callActions.resetCall();
      toast({ title: "Call cancelled", message: "The caller ended the call.", type: "info" });
    };

    // ── call:timeout — call timed out on receiver side (no answer) ─────────
    const onCallTimeout = () => {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      cleanup();
      callActions.resetCall();
      // No toast needed — the call log will show this
    };

    // ── call:busy — target user is already in another call ───────────────
    const onCallBusy = () => {
      cleanup();
      callActions.resetCall();
      toast({ title: "User busy", message: "The user is already in another call.", type: "info" });
    };

    // ── call:ended — other party ended the call ───────────────────────────
    const onCallEnded = () => {
      cleanup();
      callActions.resetCall();
    };

    // ── call:missed_notify — our outbound call was not answered ──────────
    const onCallMissedNotify = () => {
      cleanup();
      callActions.resetCall();
      toast({ title: "No answer", message: "The call was not answered.", type: "info" });
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
        callActions.setCallStatus("connected");
        startDurationTimer();
      } catch (err) {
        console.error("[CallProvider] createAnswer error:", err);
        toast({ title: "Call failed", message: "Could not access camera/microphone.", type: "error" });
        socket.emit("call:end", { callId, targetUserId: fromUserId });
        cleanup();
        callActions.resetCall();
      }
    };

    // ── webrtc:answer — received by the calling side ─────────────────────
    const onWebRTCAnswer = async ({ answer }) => {
      await webrtc.setRemoteAnswer(answer);
      callActions.setCallStatus("connected");
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
    const onCallError = ({ message }) => {
      toast({ title: "Call error", message: message || "An error occurred.", type: "error" });
      cleanup();
      callActions.resetCall();
    };

    socket.on("call:initiated",       onCallInitiated);
    socket.on("call:incoming",        onCallIncoming);
    socket.on("call:accepted",        onCallAccepted);
    socket.on("call:rejected",        onCallRejected);
    socket.on("call:cancelled",       onCallCancelled);
    socket.on("call:timeout",         onCallTimeout);
    socket.on("call:busy",            onCallBusy);
    socket.on("call:ended",           onCallEnded);
    socket.on("call:missed_notify",   onCallMissedNotify);
    socket.on("webrtc:offer",         onWebRTCOffer);
    socket.on("webrtc:answer",        onWebRTCAnswer);
    socket.on("webrtc:ice-candidate", onIceCandidate);
    socket.on("call:error",           onCallError);

    return () => {
      socket.off("call:initiated",       onCallInitiated);
      socket.off("call:incoming",        onCallIncoming);
      socket.off("call:accepted",        onCallAccepted);
      socket.off("call:rejected",        onCallRejected);
      socket.off("call:cancelled",       onCallCancelled);
      socket.off("call:timeout",         onCallTimeout);
      socket.off("call:busy",            onCallBusy);
      socket.off("call:ended",           onCallEnded);
      socket.off("call:missed_notify",   onCallMissedNotify);
      socket.off("webrtc:offer",         onWebRTCOffer);
      socket.off("webrtc:answer",        onWebRTCAnswer);
      socket.off("webrtc:ice-candidate", onIceCandidate);
      socket.off("call:error",           onCallError);
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

    if (callId && targetId) {
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

    if (callId && targetId) {
      socket.emit("call:cancel", { callId, targetUserId: targetId });
    }
    cleanup();
    callActions.resetCall();
  };

  // ── Decide which overlay to display ─────────────────────────────────────
  const showIncomingModal = isIncoming && callStatus === "ringing";
  const showCallScreen    = ["calling", "connecting", "connected"].includes(callStatus);

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
