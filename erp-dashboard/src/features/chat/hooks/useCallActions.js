import { getSocket, isSocketConnected } from "../../../lib/socket.js";
import { getAuth } from "../../../lib/auth.js";
import { getSocketDebugInfo } from "../../../lib/socket.js";
import { callActions, getCallState } from "../store/callStore.js";

let pendingCallStart = false;

/**
 * Returns `initiateCall` — the function ChatHeader calls when the user
 * clicks the voice or video call button.
 *
 * Emits `call:initiate` to the backend and immediately transitions the
 * local UI to the "trying" state so the CallScreen renders while delivery is attempted.
 */
export function useCallActions() {
  const initiateCall = async (targetUser, conversationId, callType) => {
    if (pendingCallStart) {
      return { ok: false, reason: "SELF_BUSY" };
    }

    pendingCallStart = true;
    try {
      const socket = getSocket();
      if (!socket || !isSocketConnected()) {
        return { ok: false, reason: "SOCKET_DISCONNECTED" };
      }

      const { callStatus } = getCallState();
      if (callStatus !== "idle") {
        return { ok: false, reason: "SELF_BUSY" };
      }

      callActions.setCallType(callType);
      callActions.setRemoteUser(targetUser);
      callActions.setConversationId(conversationId);
      callActions.setCallStatus("trying");

      const payload = {
        receiverId: targetUser._id,
        callerId: getAuth()?.user?._id || getAuth()?.user?.id || null,
        startedAt: new Date().toISOString(),
        conversationId,
        callType,
        targetUserId: targetUser._id,
      };

      if (callType === "voice") {
        console.log("📞 Voice call emit start", {
          event: "voice-call:initiate",
          receiverId: payload.receiverId,
          callerId: payload.callerId,
          startedAt: payload.startedAt,
          ...getSocketDebugInfo(),
        });
        socket.emit("voice-call:initiate", payload);
      } else {
        socket.emit("call:initiate", payload);
      }

      callActions.setCallStatus("calling");

      return { ok: true };
    } finally {
      pendingCallStart = false;
    }
  };

  return { initiateCall };
}
