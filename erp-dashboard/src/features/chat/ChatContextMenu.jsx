import React, { useEffect, useRef } from "react";
import {
  CornerUpLeft, Copy, Pencil, Star, Trash2, Trash, SmilePlus
} from "lucide-react";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${
        danger ? "text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

export default function ChatContextMenu({
  msg,
  position,
  currentUserId,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onStar,
  onReact,
  onDelete,
  onDeleteForEveryone,
}) {
  const menuRef = useRef(null);
  const isMine = msg?.sender?._id === currentUserId || msg?.sender === currentUserId;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const keyHandler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const style = {
    position: "fixed",
    top: position.y,
    left: position.x,
    zIndex: 1000,
  };

  const handleReact = (emoji) => { onReact?.(emoji); onClose(); };
  const handleAction = (fn) => () => { fn?.(); onClose(); };

  return (
    <div
      ref={menuRef}
      style={style}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden w-52 animate-scale-in"
    >
      {/* Quick reactions */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
        {QUICK_REACTIONS.map((e) => (
          <button
            key={e}
            onClick={() => handleReact(e)}
            className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {e}
          </button>
        ))}
        <button
          onClick={handleAction(null)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          title="More reactions"
        >
          <SmilePlus className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="py-1">
        <MenuItem icon={CornerUpLeft} label="Reply" onClick={handleAction(onReply)} />
        <MenuItem
          icon={Copy}
          label="Copy"
          onClick={handleAction(() => {
            if (msg?.content) navigator.clipboard.writeText(msg.content).catch(() => {});
            onCopy?.();
          })}
        />
        <MenuItem icon={Star} label={msg?.starredBy?.includes?.(currentUserId) ? "Unstar" : "Star"} onClick={handleAction(onStar)} />
        {isMine && (
          <MenuItem icon={Pencil} label="Edit" onClick={handleAction(onEdit)} />
        )}
        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
        <MenuItem
          icon={Trash2}
          label="Delete for me"
          onClick={handleAction(onDelete)}
          danger
        />
        {isMine && (
          <MenuItem
            icon={Trash}
            label="Delete for everyone"
            onClick={handleAction(onDeleteForEveryone)}
            danger
          />
        )}
      </div>
    </div>
  );
}
