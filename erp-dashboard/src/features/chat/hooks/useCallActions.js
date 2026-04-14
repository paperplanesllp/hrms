import { getSocket, initializeSocket, isSocketConnected } from "../../../lib/socket.js";
import { callActions, getCallState } from "../store/callStore.js";

let pendingCallStart = false;

/**
 * Returns `initiateCall` — the function ChatHeader calls when the user
 * clicks the voice or video call button.
 *
 * Emits `call:initiate` to the backend and immediately transitions the
 * local UI to the "calling" state so the CallScreen renders.
 */
export function useCallActions() {
  const waitForSocketConnection = (socket, timeoutMs = 5000) =>
    new Promise((resolve) => {
      if (!socket) {
        resolve(false);
        return;
      }

      if (socket.connected) {
        resolve(true);
        return;
      }

      let settled = false;
      const cleanup = () => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
      };

      const onConnect = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(true);
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);

      socket.connect();

      setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(socket.connected === true);
      }, timeoutMs);
    });

  const initiateCall = async (targetUser, conversationId, callType) => {
    if (pendingCallStart) {
      return { ok: false, reason: "SELF_BUSY" };
    }

    pendingCallStart = true;
    try {
      let socket = getSocket();
      if (!socket) {
        socket = initializeSocket();
      }

      if (!socket) {
        return { ok: false, reason: "REALTIME_UNAVAILABLE" };
      }

      const isConnected = await waitForSocketConnection(socket);
      if (!isConnected) {
        return { ok: false, reason: "REALTIME_UNAVAILABLE" };
      }

      if (!isSocketConnected()) {
        return { ok: false, reason: "SOCKET_DISCONNECTED" };
      }

      const { callStatus } = getCallState();
      if (callStatus !== "idle") {
        return { ok: false, reason: "SELF_BUSY" };
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
    } finally {
      pendingCallStart = false;
    }
  };

  return { initiateCall };
}
