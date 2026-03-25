import React, { useState } from "react";
import { X } from "lucide-react";
import Button from "./Button.jsx";

export default function RejectionModal({ isOpen, onClose, onConfirm, employeeName }) {
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl animate-scaleIn">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reject Leave Request</h3>
            <button
              onClick={onClose}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Please provide a reason for rejecting {employeeName}'s leave request.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Peak season, staff shortage, insufficient notice..."
            rows="4"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:border-brand-accent dark:focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:focus:ring-brand-accent/15 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all resize-none"
            required
          />
          
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 text-white bg-red-600 hover:bg-red-700"
              disabled={!reason.trim()}
            >
              Reject Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}