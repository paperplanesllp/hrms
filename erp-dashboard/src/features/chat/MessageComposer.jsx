import React, { useRef, useEffect } from "react";
import {
  Send, Smile, Paperclip, Mic, MicOff, X, CornerUpLeft, FileText,
} from "lucide-react";
import { toast } from "../../store/toastStore.js";

const EMOJIS = [
  "😀","😂","😍","🥰","😎","🤔","😅","🤣",
  "👍","👏","🙏","❤️","🔥","✨","🎉","💯",
  "👌","✅","🙌","💪","🤝","😊","🥳","😭",
  "😤","🤦","🤷","💡","⭐","🎯","🚀","💬",
];

export default function MessageComposer({
  value,
  onChange,
  onSend,
  onStartRecording,
  onStopRecording,
  isRecording,
  replyTo,
  onCancelReply,
  chatId,
  pendingFile,
  onFileSelect,
  onClearFile,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = React.useState(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  // Focus textarea when reply changes
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() || pendingFile) onSend();
    }
  };

  const addEmoji = (emoji) => {
    // Insert emoji at cursor position
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = value.slice(0, start) + emoji + value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      onChange(value + emoji);
    }
    setShowEmoji(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      toast({ title: "File too large (max 10 MB)", type: "error" });
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
      toast({ title: "Only image and audio files are supported", type: "error" });
      return;
    }
    onFileSelect?.(file);
  };

  useEffect(() => {
    if (!pendingFile || !pendingFile.type?.startsWith("image/")) {
      setFilePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(pendingFile);
    setFilePreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingFile]);

  return (
    <div className="bg-[#f0f2f5] dark:bg-[#1f2c33] border-t border-[#e9edef] dark:border-[#2a3942] px-3 py-2.5">

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-white dark:bg-[#2a3942] border-l-[3px] border-[#25d366] dark:border-[#00a884] rounded-lg">
          <CornerUpLeft className="w-4 h-4 flex-shrink-0 text-[#25d366] dark:text-[#00a884]" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#25d366] dark:text-[#00a884]">
              {replyTo.sender?.name}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
              {replyTo.content || "Attachment"}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            aria-label="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-white dark:bg-[#2a3942] rounded-xl border border-[#e9edef] dark:border-[#3d4a51]">
          {filePreviewUrl ? (
            <img
              src={filePreviewUrl}
              alt="preview"
              className="h-14 w-14 object-cover rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {pendingFile.name}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {(pendingFile.size / 1024).toFixed(1)} KB
              {filePreviewUrl ? " · Image" : " · Audio"}
            </p>
          </div>
          <button
            onClick={onClearFile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Remove attachment"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="mb-2 p-3 bg-white dark:bg-[#2a3942] border border-[#e9edef] dark:border-[#3d4a51] rounded-2xl shadow-lg grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#374248]"
              aria-label={e}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">

        {/* Emoji button */}
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
            showEmoji
              ? "text-[#00a884] bg-[#00a884]/10"
              : "text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#d1d7db] hover:bg-[#e9edef]/60 dark:hover:bg-[#374248]"
          }`}
          aria-label="Emoji"
          title="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#d1d7db] hover:bg-[#e9edef]/60 dark:hover:bg-[#374248] transition-colors flex-shrink-0"
          aria-label="Attach image or audio"
          title="Attach image or audio"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full resize-none px-4 py-2.5 rounded-2xl bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] border-0 focus:ring-2 focus:ring-[#00a884]/40 outline-none text-sm leading-relaxed transition-all max-h-[120px] overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
        </div>

        {/* Send button (shown when text or file pending) / Voice button */}
        {value.trim() || pendingFile ? (
          <button
            onClick={onSend}
            className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#017561] text-white shadow-sm hover:shadow-md transition-all flex-shrink-0 active:scale-95"
            aria-label="Send"
            title="Send message"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <button
            onMouseDown={onStartRecording}
            onMouseUp={onStopRecording}
            onTouchStart={onStartRecording}
            onTouchEnd={onStopRecording}
            className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-[#00a884] hover:bg-[#017561] text-white"
            }`}
            aria-label={isRecording ? "Stop recording" : "Voice note"}
            title={isRecording ? "Stop recording" : "Hold to record voice note"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-[10px] text-[#8696a0] text-center mt-1 select-none">
        Enter to send &middot; Shift+Enter for new line
      </p>
    </div>
  );
}

