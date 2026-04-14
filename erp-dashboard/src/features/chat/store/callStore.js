// Custom reactive store for call state (matches the project's store pattern)
import { useEffect, useState } from "react";

const INITIAL_STATE = {
  // Call status lifecycle:
  // idle → trying/calling/ringing/incoming → connecting → in_call → rejected/no_answer/failed
  callStatus: "idle",
  callId: null,
  callType: null,           // 'voice' | 'video'
  remoteUser: null,         // { _id, name, profileImageUrl }
  conversationId: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,          // seconds elapsed since connected
  // Incoming call specific
  isIncomingCall: false,
  incomingCallData: null,   // { callId, callerId, callerName, callerImage, callType, conversationId }
};

let state = { ...INITIAL_STATE };
const listeners = new Set();

function setState(patch) {
  state = {
    ...state,
    ...(typeof patch === "function" ? patch(state) : patch),
  };
  listeners.forEach((l) => l());
}

export function useCallStore(selector = (s) => s) {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return selector(state);
}

// ── Direct state access (for use in callbacks/handlers) ──────────────────────
export const getCallState = () => state;

// ── Actions ──────────────────────────────────────────────────────────────────
export const callActions = {
  setCallStatus: (callStatus) => setState({ callStatus }),
  setCallId: (callId) => setState({ callId }),
  setCallType: (callType) => setState({ callType }),
  setRemoteUser: (remoteUser) => setState({ remoteUser }),
  setConversationId: (conversationId) => setState({ conversationId }),
  setLocalStream: (localStream) => setState({ localStream }),
  setRemoteStream: (remoteStream) => setState({ remoteStream }),
  setIsMuted: (isMuted) => setState({ isMuted }),
  setIsCameraOff: (isCameraOff) => setState({ isCameraOff }),
  setCallDuration: (callDuration) => setState({ callDuration }),

  showIncomingCall: (data) =>
    setState({
      isIncomingCall: true,
      incomingCallData: data,
      callStatus: "incoming",
    }),

  resetCall: () => {
    // Stop local media tracks before clearing
    if (state.localStream) {
      state.localStream.getTracks().forEach((t) => t.stop());
    }
    setState({ ...INITIAL_STATE });
  },
};
