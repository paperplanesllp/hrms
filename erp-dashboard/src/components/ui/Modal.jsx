import React from "react";
import { X } from "lucide-react";

export default function Modal({ open, isOpen, title, children, onClose, size = "md", closeButton = true, className = "" }) {
  const isModalOpen = open !== undefined ? open : isOpen;
  if (!isModalOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
  }[size];

  // Use className if provided, otherwise use size-based maxWidth
  const modalWidthClass = className || maxWidthClass;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full ${modalWidthClass} rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl dark:shadow-2xl animate-scaleIn transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          {closeButton && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-200 active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 text-slate-900 dark:text-slate-100 max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}