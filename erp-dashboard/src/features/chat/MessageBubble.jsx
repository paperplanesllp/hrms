import React from "react";
import { Check, CheckCheck, Reply, MoreHorizontal } from "lucide-react";
import AudioPlayer from "./AudioPlayer.jsx";
import { formatTime, getInitials, isSameGroup, safeDecrypt } from "./chatUtils.js";
import { decryptMessage, isEncrypted } from "../../lib/encryption.js";

/* ─────────────── Status tick ─────────────── */
function MessageTick({ status }) {
  if (status === "read")
    return <CheckCheck className="w-3 h-3 text-sky-400 flex-shrink-0" />;
  if (status === "delivered")
    return <CheckCheck className="w-3 h-3 text-[#8696a0] flex-shrink-0" />;
  return <Check className="w-3 h-3 text-[#8696a0] flex-shrink-0" />;
}

/* ─────────────── Meta row (time + tick) ─────────────── */
function MetaRow({ timeStr, isSent, status, isPending }) {
  return (
    <div className="flex items-center justify-end gap-[3px] text-[#667781] dark:text-[#8696a0] mt-[3px]">
      <span className="text-[10px] leading-none">
        {isPending ? <span className="italic opacity-50">sending…</span> : timeStr}
      </span>
      {!isPending && isSent && <MessageTick status={status} />}
    </div>
  );
}

/* ─────────────── Reply preview ─────────────── */
function ReplyPreview({ replyTo, chatId, isSent }) {
  if (!replyTo) return null;
  const content = safeDecrypt(replyTo.content, chatId, decryptMessage, isEncrypted);
  return (
    <div
      className={`flex flex-col mb-[5px] px-2.5 py-1.5 rounded-lg border-l-[3px] overflow-hidden
        ${isSent
          ? "border-[#06cf9c]/70 bg-black/[0.07] dark:bg-white/10"
          : "border-[#25d366] dark:border-[#00a884] bg-[#f5f5f5] dark:bg-[#2a3942]"
        }`}
    >
      <span className="text-[11px] font-semibold text-[#25d366] dark:text-[#00a884] mb-[2px] truncate">
        {replyTo.sender?.name?.split(" ")[0] || "Reply"}
      </span>
      <span className="text-xs truncate opacity-75">
        {content || "Attachment"}
      </span>
    </div>
  );
}

/* ─────────────── Reactions row ─────────────── */
function ReactionsRow({ reactions, onReact }) {
  if (!reactions?.length) return null;
  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="flex flex-wrap gap-1 mt-[3px]">
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact?.(emoji)}
          className="text-xs bg-white dark:bg-[#2a3942] border border-[#e9edef] dark:border-[#3d4a51] rounded-full px-1.5 py-0.5 hover:scale-110 transition-transform shadow-sm"
        >
          {emoji}
          {count > 1 && <span className="text-[10px] opacity-60 ml-0.5">{count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─────────────── Sender avatar ─────────────── */
function SenderAvatar({ sender }) {
  if (sender?.profileImageUrl) {
    return (
      <img
        src={sender.profileImageUrl}
        alt={sender?.name || "User"}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 shadow-sm"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
      {getInitials(sender?.name || "?")}
    </div>
  );
}

/* ─────────────── Hover action buttons ─────────────── */
function BubbleActions({ msg, onReply, onContextMenu }) {
  return (
    <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity duration-150 self-end mb-0.5 flex-shrink-0">
      <button
        onClick={() => onReply?.(msg)}
        className="p-[5px] rounded-full bg-white dark:bg-[#233138] shadow-md text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors"
        title="Reply"
      >
        <Reply className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={(e) => onContextMenu?.(e, msg)}
        className="p-[5px] rounded-full bg-white dark:bg-[#233138] shadow-md text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors"
        title="More"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─────────────── Main MessageBubble ─────────────── */
export function MessageBubble({
  msg,
  isSent,
  isGroupChat,
  chatId,
  prevMsg,
  nextMsg,
  isHighlighted,
  onContextMenu,
  onReply,
  onReact,
}) {
  if (!msg) return null;

  const isFirstInGroup = !isSameGroup(prevMsg, msg);
  const isLastInGroup  = !isSameGroup(msg, nextMsg);
  const hasTail   = isLastInGroup;
  const showAvatar = !isSent && isLastInGroup;
  const showName   = !isSent && isGroupChat && isFirstInGroup;

  const content   = safeDecrypt(msg.content, chatId, decryptMessage, isEncrypted);
  const isDeleted = Boolean(msg.deletedForEveryone);
  const isAudio   = !isDeleted && Boolean(msg.fileUrl && msg.fileType?.startsWith("audio"));
  const isImage   = !isDeleted && Boolean(msg.fileUrl && msg.fileType?.startsWith("image"));
  const isPending = Boolean(msg._tempId);
  const timeStr   = isPending ? null : formatTime(msg.createdAt);

  /* WhatsApp-like colors */
  const bubbleColor = isSent
    ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef]"
    : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]";

  /* Tail corners — WhatsApp style */
  const radius = isSent
    ? hasTail ? "rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[5px]"
               : "rounded-[18px]"
    : hasTail ? "rounded-tr-[18px] rounded-tl-[18px] rounded-br-[18px] rounded-bl-[5px]"
               : "rounded-[18px]";

  const rowMb = isLastInGroup ? "mb-[3px]" : "mb-[1px]";

  return (
    <div
      className={`flex items-end gap-1 px-2 ${isSent ? "justify-end" : "justify-start"} ${rowMb}
        ${isHighlighted ? "bg-amber-100/20 dark:bg-amber-900/10 -mx-1 px-3 rounded-xl py-0.5" : ""}
        group`}
      data-message-id={msg._id}
    >
      {/* Avatar slot (incoming only) */}
      {!isSent && (
        <div className="w-7 flex-shrink-0 self-end">
          {showAvatar && <SenderAvatar sender={msg.sender} />}
        </div>
      )}

      {/* Column: optional name + bubble row + reactions */}
      <div
        className={`flex flex-col ${isSent ? "items-end" : "items-start"}`}
        style={{ maxWidth: "min(65%, 520px)" }}
      >
        {showName && (
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 ml-2.5 mb-[3px] truncate max-w-full">
            {msg.sender?.name}
          </span>
        )}

        {/* Bubble + hover actions on the same line */}
        <div className={`flex items-end gap-1.5 ${isSent ? "flex-row" : "flex-row-reverse"}`}>
          {/* Hover actions sit opposite to the bubble */}
          <BubbleActions msg={msg} onReply={onReply} onContextMenu={onContextMenu} />

          {/* The bubble itself */}
          <div
            className={`relative w-fit shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${bubbleColor} ${radius} cursor-pointer select-text`}
            onContextMenu={(e) => onContextMenu?.(e, msg)}
          >
            {/* Reply strip */}
            {msg.replyTo && (
              <div className="pt-[5px] px-[9px]">
                <ReplyPreview replyTo={msg.replyTo} chatId={chatId} isSent={isSent} />
              </div>
            )}

            {/* ── Deleted ── */}
            {isDeleted && (
              <div className="flex items-center gap-2 px-[10px] py-[7px]">
                <span className="italic text-sm opacity-50">This message was deleted</span>
                {timeStr && (
                  <span className="text-[10px] opacity-40 flex-shrink-0 ml-2">{timeStr}</span>
                )}
              </div>
            )}

            {/* ── Audio ── */}
            {isAudio && (
              <div className="px-2.5 py-2">
                <AudioPlayer src={msg.fileUrl} isSender={isSent} />
                <MetaRow timeStr={timeStr} isSent={isSent} status={msg.status} isPending={isPending} />
              </div>
            )}

            {/* ── Image ── */}
            {isImage && (
              <div className={`overflow-hidden ${msg.replyTo ? "" : radius}`}>
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName || "Image"}
                  className="max-w-[240px] w-auto block cursor-pointer"
                  onClick={() => window.open(msg.fileUrl, "_blank")}
                />
                <div className="px-[10px] pb-[6px] pt-1">
                  <MetaRow timeStr={timeStr} isSent={isSent} status={msg.status} isPending={isPending} />
                </div>
              </div>
            )}

            {/* ── Text (most common path) ── */}
            {!isDeleted && !isAudio && !isImage && (
              <div className="relative px-[9px] pt-[5px] pb-[4px]">
                {/* Text + invisible tail-spacer for timestamp */}
                <p className="text-[14.2px] leading-[1.44] whitespace-pre-wrap break-words">
                  {content}
                  {/*
                    Invisible inline spacer so the absolute timestamp
                    never overlaps the last word of the message.
                    Width = approx rendered width of "12:34 pm ✓✓"
                  */}
                  <span
                    className="inline-block align-bottom select-none pointer-events-none"
                    style={{ width: isSent ? "72px" : "48px", height: "0.85em" }}
                    aria-hidden
                  />
                </p>

                {/* Timestamp absolutely at bottom-right of text area */}
                <div className="absolute bottom-[5px] right-[8px] flex items-center gap-[3px] text-[#667781] dark:text-[#8696a0]">
                  {msg.isEdited && !isPending && (
                    <span className="text-[10px] italic opacity-60 mr-[2px]">edited</span>
                  )}
                  <span className="text-[10px] leading-none whitespace-nowrap">
                    {isPending
                      ? <span className="italic opacity-50">sending…</span>
                      : timeStr
                    }
                  </span>
                  {!isPending && isSent && <MessageTick status={msg.status} />}
                </div>
              </div>
            )}
          </div>
        </div>

        <ReactionsRow reactions={msg.reactions} onReact={(emoji) => onReact?.(msg._id, emoji)} />
      </div>
    </div>
  );
}

/* ─────────────── Date separator ─────────────── */
export function DateSeparator({ label }) {
  return (
    <div className="flex items-center justify-center my-3 px-4">
      <span className="px-3 py-[5px] text-[11.5px] font-medium text-[#54656f] dark:text-[#8696a0] bg-white/80 dark:bg-[#182229]/80 shadow-sm rounded-lg backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

/* ─────────────── System message ─────────────── */
export function SystemMessage({ content }) {
  return (
    <div className="flex justify-center my-2 px-4">
      <span className="text-[11.5px] text-[#54656f] dark:text-[#8696a0] bg-white/70 dark:bg-[#182229]/70 rounded-lg px-3 py-[5px] shadow-sm">
        {content}
      </span>
    </div>
  );
}

export default MessageBubble;
