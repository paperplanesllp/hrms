import React, { useRef, useEffect, useCallback, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import MessageBubble, { DateSeparator, SystemMessage } from "./MessageBubble";
import CallLogMessage from "./CallLogMessage.jsx";
import { groupMessagesByDate, safeDecrypt } from "./chatUtils";
import { decryptMessage, isEncrypted } from "../../lib/encryption";

export default function MessageArea({
  messages,
  currentUserId,
  activeChat,
  hasMore,
  loadingMore,
  onLoadMore,
  onReply,
  onReact,
  onDelete,
  onEdit,
  onStar,
  initialUnreadCount = 0,
  searchMatchId = null,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  // Scroll to the highlighted search match
  useEffect(() => {
    if (!searchMatchId || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-message-id="${searchMatchId}"]`
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchMatchId]);

  // Scroll to bottom on new messages if near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [activeChat?._id]);

  // Preserve scroll when loading more (old) messages
  useEffect(() => {
    if (!loadingMore) {
      const container = containerRef.current;
      if (!container) return;
      const diff = container.scrollHeight - prevScrollHeightRef.current;
      if (diff > 0) container.scrollTop += diff;
    }
  }, [loadingMore]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distFromBottom = scrollHeight - clientHeight - scrollTop;
    isNearBottomRef.current = distFromBottom < 80;
    setShowScrollBtn(distFromBottom > 250);

    // Load more when scrolled near top
    if (scrollTop < 80 && hasMore && !loadingMore) {
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore?.();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const grouped = groupMessagesByDate(messages);

  // Find where unread divider should appear
  const unreadStartIndex =
    initialUnreadCount > 0 ? messages.length - initialUnreadCount : -1;

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <span className="text-3xl">💬</span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Select a conversation to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Scrollable message list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-0 pt-3 pb-2 chat-scrollbar chat-wallpaper"
      >
        {/* Load more spinner */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        )}

        {/* Load more trigger when no spinner */}
        {hasMore && !loadingMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => {
                if (containerRef.current)
                  prevScrollHeightRef.current = containerRef.current.scrollHeight;
                onLoadMore?.();
              }}
              className="text-xs text-amber-500 hover:text-amber-600 font-medium"
            >
              Load older messages
            </button>
          </div>
        )}

        {grouped.map(({ label, messages: group }, gi) => {
          let unreadShown = false;

          return (
            <React.Fragment key={label}>
              <DateSeparator label={label} />
              {group.map((msg, mi) => {
                // Calculate global index
                const globalIdx = messages.indexOf(msg);
                let showUnreadHere = false;
                if (
                  !unreadShown &&
                  unreadStartIndex >= 0 &&
                  globalIdx === unreadStartIndex
                ) {
                  showUnreadHere = true;
                  unreadShown = true;
                }

                return (
                  <React.Fragment key={msg._id || msg._tempId || `${gi}-${mi}`}>
                    {showUnreadHere && (
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800" />
                        <span className="text-[11px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                          {initialUnreadCount} unread message
                          {initialUnreadCount > 1 ? "s" : ""}
                        </span>
                        <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800" />
                      </div>
                    )}
                    {((msg.type || msg.messageType) === "call") ? (
                      <CallLogMessage callLog={{ ...(msg.callData || {}), ...msg }} currentUserId={currentUserId} />
                    ) : msg.isSystemMessage ? (
                      <SystemMessage content={msg.content} />
                    ) : (
                      <MessageBubble
                        isSent={(msg?.sender?._id || msg?.sender) === currentUserId}
                        isGroupChat={Boolean(activeChat?.isGroupChat)}
                        chatId={activeChat?._id}
                        msg={{
                          ...msg,
                          content: safeDecrypt(
                            msg.content,
                            activeChat._id,
                            decryptMessage,
                            isEncrypted
                          ),
                        }}
                        prevMsg={mi > 0 ? group[mi - 1] : null}
                        nextMsg={group[mi + 1] || null}
                        isHighlighted={Boolean(searchMatchId && msg._id === searchMatchId)}
                        onReply={() => onReply?.(msg)}
                        onReact={(emoji) => onReact?.(msg, emoji)}
                        onDelete={(everyone) => onDelete?.(msg, everyone)}
                        onEdit={() => onEdit?.(msg)}
                        onStar={() => onStar?.(msg)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Empty state */}
        {messages.length === 0 && !loadingMore && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No messages yet. Say hello!
            </p>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-10"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
