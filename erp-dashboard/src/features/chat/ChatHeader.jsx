import React, { useState, useRef, useEffect } from "react";
import {
  Phone, Video, Search, MoreVertical, ArrowLeft, Users,
  Info, Pin, VolumeX, Archive, Trash2, Trash, CheckCheck, X,
} from "lucide-react";
import { useUserPresence } from "../../hooks/usePresence.js";
import { getInitials } from "./chatUtils.js";
import { useCallActions } from "./hooks/useCallActions.js";
import { useCallStore } from "./store/callStore.js";
import { isSocketConnected } from "../../lib/socket.js";
import { showCallToast } from "./utils/callErrorMap.js";

function PresenceStatus({ userId, isGroup, participantCount }) {
  const presence = useUserPresence(userId);

  if (isGroup) {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {participantCount} members
      </span>
    );
  }

  const isOnline = presence.isOnline === true;
  const statusColor = isOnline ? "bg-emerald-500" : "bg-slate-400";

  return (
    <div className="flex items-center gap-1.5" title={presence.tooltip || presence.label}>
      <span
        className={`relative inline-flex h-2 w-2 rounded-full transition-all duration-300 ${statusColor} ${
          isOnline ? "shadow-[0_0_0_3px_rgba(16,185,129,0.16)]" : "shadow-none"
        }`}
      >
        <span
          className={`absolute -inset-1 rounded-full bg-emerald-400/35 transition-opacity duration-300 ${
            isOnline ? "opacity-100 animate-pulse" : "opacity-0"
          }`}
        />
      </span>
      <span
        className={`overflow-hidden text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
          isOnline ? "max-w-8 opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        Live
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {presence.label}
      </span>
    </div>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />;
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left
        ${danger
          ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

export default function ChatHeader({
  chat,
  userId,
  typingUser,
  onBack,
  onInfo,
  onSearchToggle,
  chatSearchOpen = false,
  showBack = false,
  // Menu action callbacks
  onClearChat,
  onMuteToggle,
  onPinToggle,
  onArchiveToggle,
  onDeleteConv,
  onMarkUnread,
  onViewInfo,
}) {
  if (!chat) return null;

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const other = !chat.isGroupChat
    ? chat.participants?.find((p) => p._id !== userId)
    : null;
  const displayName = chat.isGroupChat ? chat.name : other?.name || "Unknown";
  const otherPresence = useUserPresence(other?._id);

  const { initiateCall } = useCallActions();
  const callStatus = useCallStore((s) => s.callStatus);
  const callBusy = callStatus !== "idle";
  const realtimeReady = isSocketConnected();
  const callDisabled = callBusy || chat.isGroupChat;
  const isMuted = Boolean(chat.isMuted);
  const isPinned = Boolean(chat.isPinned);
  const isArchived = Boolean(chat.isArchived);

  // Close menu on outside click / Escape
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    const keyHandler = (e) => { if (e.key === "Escape") setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [showMenu]);

  const handleVoiceCall = async () => {
    if (callDisabled || !other) return;
    if (!realtimeReady) {
      showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
      return;
    }
    const result = await initiateCall(other, chat._id, "voice");
    if (!result?.ok) {
      showCallToast({ title: "Call", code: result?.reason || "SERVER_ERROR", type: "info" });
    }
  };

  const handleVideoCall = async () => {
    if (callDisabled || !other) return;
    if (!realtimeReady) {
      showCallToast({ title: "Call", code: "SOCKET_DISCONNECTED", type: "info" });
      return;
    }
    const result = await initiateCall(other, chat._id, "video");
    if (!result?.ok) {
      showCallToast({ title: "Call", code: result?.reason || "SERVER_ERROR", type: "info" });
    }
  };

  // Close menu then run action
  const closeMenu = (fn) => () => {
    setShowMenu(false);
    fn?.();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm relative z-10">
      {showBack && (
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Avatar — clicking shows info */}
      <button
        onClick={chat.isGroupChat ? onInfo : onViewInfo}
        className="relative flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        aria-label="View info"
        title={chat.isGroupChat ? "Group info" : "Contact info"}
      >
        {chat.isGroupChat ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        ) : other?.profileImageUrl ? (
          <img
            src={other.profileImageUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-semibold shadow-sm">
            {getInitials(displayName)}
          </div>
        )}
      </button>

      {/* Name & Status */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">
          {displayName}
        </h3>
        {typingUser ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
              {chat.isGroupChat
                ? `${typingUser.userName} is typing...`
                : "typing..."}
            </span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        ) : (
          <PresenceStatus
            userId={other?._id}
            isGroup={chat.isGroupChat}
            participantCount={chat.participants?.length}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleVoiceCall}
          disabled={callDisabled}
          title={
            chat.isGroupChat
              ? "Group voice calls not supported"
              : callBusy
              ? "Already in a call"
              : !realtimeReady
              ? "Realtime server unavailable"
              : "Voice call"
          }
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Voice call"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          onClick={handleVideoCall}
          disabled={callDisabled}
          title={
            chat.isGroupChat
              ? "Group video calls not supported"
              : callBusy
              ? "Already in a call"
              : !realtimeReady
              ? "Realtime server unavailable"
              : "Video call"
          }
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Video call"
        >
          <Video className="w-4 h-4" />
        </button>

        {/* Search toggle — active state when chat search is open */}
        <button
          onClick={onSearchToggle}
          title={chatSearchOpen ? "Close search" : "Search messages"}
          className={`p-2 rounded-xl transition-colors ${
            chatSearchOpen
              ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          aria-label="Search messages"
          aria-pressed={chatSearchOpen}
        >
          {chatSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            title="More options"
            className={`p-2 rounded-xl transition-colors ${
              showMenu
                ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            aria-label="More options"
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[60] overflow-hidden py-1"
            >
              <MenuItem
                icon={Info}
                label="View info"
                onClick={closeMenu(chat.isGroupChat ? onInfo : onViewInfo)}
              />
              <MenuItem
                icon={Search}
                label="Search messages"
                onClick={closeMenu(onSearchToggle)}
              />
              <MenuDivider />
              <MenuItem
                icon={Pin}
                label={isPinned ? "Unpin conversation" : "Pin conversation"}
                onClick={closeMenu(onPinToggle)}
              />
              <MenuItem
                icon={VolumeX}
                label={isMuted ? "Unmute notifications" : "Mute notifications"}
                onClick={closeMenu(onMuteToggle)}
              />
              <MenuItem
                icon={Archive}
                label={isArchived ? "Unarchive conversation" : "Archive conversation"}
                onClick={closeMenu(onArchiveToggle)}
              />
              <MenuItem
                icon={CheckCheck}
                label="Mark as unread"
                onClick={closeMenu(onMarkUnread)}
              />
              <MenuDivider />
              <MenuItem
                icon={Trash2}
                label="Clear chat"
                danger
                onClick={closeMenu(onClearChat)}
              />
              <MenuItem
                icon={Trash}
                label="Delete conversation"
                danger
                onClick={closeMenu(onDeleteConv)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
