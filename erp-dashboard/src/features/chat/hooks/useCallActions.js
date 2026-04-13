import { getSocket } from "../../../lib/socket.js";
import { callActions, getCallState } from "../store/callStore.js";

/**
 * Returns `initiateCall` — the function ChatHeader calls when the user
 * clicks the voice or video call button.
 *
 * Emits `call:initiate` to the backend and immediately transitions the
 * local UI to the "calling" state so the CallScreen renders.
 */
export function useCallActions() {
  const initiateCall = (targetUser, conversationId, callType) => {
    const socket = getSocket();
    if (!socket?.connected) {
      return { ok: false, reason: "offline" };
    }

    const { callStatus } = getCallState();
    if (callStatus !== "idle") {
      return { ok: false, reason: "busy" };
    }

    callActions.setCallType(callType);
    callActions.setRemoteUser(targetUser);
    callActions.setConversationId(conversationId);
    callActions.setCallStatus("calling");

    socket.emit("call:initiate", {
      targetUserId: targetUser._id,
      callType,
      conversationId,
    });

    return { ok: true };
  };

  return { initiateCall };
}
