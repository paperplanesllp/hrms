import React from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";

export default function ClearChatConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  chatName,
  isLoading = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-600 w-96 max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full dark:bg-red-900/30">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Clear Conversation ?</h3>
          </div>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-gray-400" />
          </Button>
        </div>

        {/* Message */}
        <div className="mb-6 space-y-3">
          <p className="text-sm text-slate-700 dark:text-gray-300">
            Are you sure you want to clear all messages  <span className="font-semibold text-slate-900 dark:text-white">{chatName}</span>?
          </p>
          <div className="p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-900/50">
            <p className="flex items-center gap-2 text-xs text-red-800 dark:text-red-300">
              <span className="font-bold">⚠️ Warning:</span> This action cannot be undone. All messages will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center justify-center flex-1 gap-2 py-3 font-medium text-white transition-all bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
          >
            <Trash2 className="w-4 h-4" />
            {isLoading ? "Clearing..." : "Clear Chat"}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="ghost"
            className="flex-1 py-3 font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-900 dark:text-white disabled:opacity-50"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
