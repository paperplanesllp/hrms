import React, { useEffect } from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button.jsx";

export default function DeleteConversationModal({
  isOpen,
  onClose,
  onConfirm,
  chatName,
  isLoading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 duration-200 bg-black/70 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 shadow-[0_20px_70px_rgba(0,0,0,0.45)] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                Delete Conversation?
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                This action is permanent.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 transition rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">
              {chatName || "this conversation"}
            </span>
            ?
          </p>

          <div className="p-4 mt-4 border rounded-2xl border-red-500/20 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">Warning</p>
                <p className="mt-1 text-xs leading-5 text-red-200/90">
                  Once deleted, this conversation cannot be recovered.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-slate-800">
          <Button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 font-medium text-white border rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
          >
            Cancel
          </Button>

          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center justify-center flex-1 gap-2 py-3 font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
          >
            <Trash2 className="w-4 h-4" />
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}