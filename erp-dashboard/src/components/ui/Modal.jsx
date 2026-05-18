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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/45 dark:bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`glass-modal relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full ${modalWidthClass} flex-col overflow-hidden rounded-3xl shadow-2xl animate-scaleIn transition-all duration-300 sm:max-h-[calc(100dvh-2rem)]`}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b theme-border p-4 sm:p-6">
          <h2 className="min-w-0 text-lg theme-modal-title sm:text-xl">{title}</h2>
          {closeButton && (
            <button
              onClick={onClose}
              className="glass-icon-btn text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all duration-200 active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 theme-body-text sm:p-6">{children}</div>
      </div>
    </div>
  );
}
