import React, { useState, useMemo } from "react";
import {
  Search, Plus, Users, Pin, VolumeX, Archive,
  CheckCheck, MessageCircle, X, UserPlus
} from "lucide-react";
import { useUserPresence } from "../../hooks/usePresence.js";
import { formatChatTime, getInitials, safeDecrypt } from "./chatUtils.js";
import { getCallPreviewText } from "./callUtils.js";
import { decryptMessage, isEncrypted } from "../../lib/encryption.js";

function PresenceDot({ userId, className = "" }) {
  const presence = useUserPresence(userId);
  const colorClass =
    presence.status === "offline" || presence.status === "unknown"
      ? "bg-slate-400"
      : "bg-emerald-500";
  return (
    <span
      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${colorClass} ${
        presence.isOnline ? "ring-1 ring-emerald-300" : ""
      } ${className}`}
    />
  );
}

function ChatAvatar({ chat, userId, size = "md" }) {
  const other = !chat.isGroupChat
    ? chat.participants?.find((p) => p._id !== userId)
    : null;
  const sz = size === "md" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";

  return (
    <div className="relative flex-shrink-0">
      {chat.isGroupChat ? (
        <div
          className={`${sz} rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm`}
        >
          <Users className="w-5 h-5" />
        </div>
      ) : other?.profileImageUrl ? (
        <img
          src={other.profileImageUrl}
          alt={other.name}
          className={`${sz} rounded-full object-cover shadow-sm`}
        />
      ) : (
        <div
          className={`${sz} rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-semibold shadow-sm`}
        >
          {getInitials(other?.name || "?")}
        </div>
      )}
      {!chat.isGroupChat && other && (
        <PresenceDot userId={other._id} />
      )}
    </div>
  );
}

function ChatListItem({ chat, isActive, userId, onClick }) {
  const other = !chat.isGroupChat
    ? chat.participants?.find((p) => p._id !== userId)
    : null;
  const displayName = chat.isGroupChat
    ? chat.name
    : other?.name || "Unknown";

  const isCallPreview = (chat.lastMessage?.type || chat.lastMessage?.messageType) === "call";
  const rawContent = chat.lastMessage?.content || "";
  const lastMsgText = isCallPreview
    ? getCallPreviewText({ ...(chat.lastMessage?.callData || {}), ...chat.lastMessage })
    : rawContent
    ? safeDecrypt(rawContent, chat._id, decryptMessage, isEncrypted)
    : "No messages yet";

  const lastMsgTime = chat.lastMessage?.createdAt
    ? formatChatTime(chat.lastMessage.createdAt)
    : "";

  const senderPrefix =
    isCallPreview
      ? ""
      :
    chat.lastMessage?.sender?.name === displayName
      ? ""
      : chat.lastMessage?.sender?.name
      ? `${chat.lastMessage.sender.name.split(" ")[0]}: `
      : "";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all duration-150 relative group
        ${
          isActive
            ? "bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-2 border-transparent"
        }`}
    >
      <ChatAvatar chat={chat} userId={userId} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span
            className={`text-sm font-semibold truncate ${
              isActive
                ? "text-amber-700 dark:text-amber-400"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {displayName}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {chat.isPinned && (
              <Pin className="w-3 h-3 text-amber-500 rotate-45" />
            )}
            {chat.isMuted && (
              <VolumeX className="w-3 h-3 text-slate-400" />
            )}
            {lastMsgTime && (
              <span
                className={`text-[10px] ${
                  chat.unreadCount > 0
                    ? "text-amber-600 dark:text-amber-400 font-medium"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {lastMsgTime}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
            {senderPrefix}
            {lastMsgText}
          </p>
          {chat.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SkeletonChatItem() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 animate-pulse rounded w-3/4" />
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded w-1/2" />
      </div>
    </div>
  );
}

export default function ConversationList({
  chats,
  loading,
  activeChat,
  userId,
  onSelectChat,
  onNewChat,
  onNewGroup,
}) {
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter((c) => {
      const other = c.participants?.find((p) => p._id !== userId);
      const name = c.isGroupChat ? c.name : other?.name || "";
      const lastMsg = (c.lastMessage?.type || c.lastMessage?.messageType) === "call"
        ? getCallPreviewText({ ...(c.lastMessage?.callData || {}), ...c.lastMessage }).toLowerCase()
        : (c.lastMessage?.content || "").toLowerCase();
      return name.toLowerCase().includes(q) || lastMsg.includes(q);
    });
  }, [chats, search, userId]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Messages
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewGroup}
              title="New group"
              className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onNewChat}
              title="New conversation"
              className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 border-0 focus:ring-2 focus:ring-amber-400/50 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonChatItem key={i} />)
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
            {!search && (
              <p className="text-xs text-slate-400">
                Start a new conversation
              </p>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              isActive={activeChat?._id === chat._id}
              userId={userId}
              onClick={() => onSelectChat(chat)}
            />
          ))
        )}
      </div>
    </div>
  );
}
