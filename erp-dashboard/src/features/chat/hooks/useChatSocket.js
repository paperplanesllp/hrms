import { useEffect, useRef, useState } from "react";
import { getSocket } from "../../../lib/socket.js";

/**
 * Centralizes all socket event registration for the chat page.
 * Re-registers handlers when the socket instance changes.
 */
export function useChatSocket({
  onNewMessage,
  onTyping,
  onStopTyping,
  onMessageEdited,
  onMessageDeleted,
  onMessagesRead,
  onMessageDelivered,
  onGroupUpdate,
  onReaction,
  onReconnect,
}) {
  const [socket, setSocket] = useState(() => getSocket());

  const handlers = useRef({
    onNewMessage,
    onTyping,
    onStopTyping,
    onMessageEdited,
    onMessageDeleted,
    onMessagesRead,
    onMessageDelivered,
    onGroupUpdate,
    onReaction,
    onReconnect,
  });

  // Keep handlers ref current without re-subscribing
  useEffect(() => {
    handlers.current = {
      onNewMessage,
      onTyping,
      onStopTyping,
      onMessageEdited,
      onMessageDeleted,
      onMessagesRead,
      onMessageDelivered,
      onGroupUpdate,
      onReaction,
      onReconnect,
    };
  });

  useEffect(() => {
    const syncSocket = () => setSocket(getSocket());
    window.addEventListener("socket:connected", syncSocket);
    window.addEventListener("socket:reconnected", syncSocket);
    syncSocket();

    return () => {
      window.removeEventListener("socket:connected", syncSocket);
      window.removeEventListener("socket:reconnected", syncSocket);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const wrap = (key) => (...args) => handlers.current[key]?.(...args);

    const h = {
      new_message: wrap("onNewMessage"),
      user_typing: wrap("onTyping"),
      user_stop_typing: wrap("onStopTyping"),
      "message:edited": wrap("onMessageEdited"),
      "message:deleted": wrap("onMessageDeleted"),
      "messages:read": wrap("onMessagesRead"),
      "message:delivered": wrap("onMessageDelivered"),
      group_updated: wrap("onGroupUpdate"),
      group_member_added: wrap("onGroupUpdate"),
      group_member_removed: wrap("onGroupUpdate"),
      group_renamed: wrap("onGroupUpdate"),
      "message:reaction": wrap("onReaction"),
      connect: wrap("onReconnect"),
      reconnect: wrap("onReconnect"),
    };

    Object.entries(h).forEach(([event, fn]) => socket.on(event, fn));

    return () => {
      Object.entries(h).forEach(([event, fn]) => socket.off(event, fn));
    };
  }, [socket]);
}
