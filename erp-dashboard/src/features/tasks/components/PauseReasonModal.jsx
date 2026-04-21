import React, { useState, useEffect, useRef } from 'react';
import { PauseCircle, X } from 'lucide-react';

export default function PauseReasonModal({
  taskTitle,
  onConfirm,
  onCancel,
  prompt = 'Why are you pausing?',
  confirmLabel = 'Pause Task',
  placeholder = 'e.g. Lunch break, Client call, Meeting...',
}) {
  const [reason, setReason] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-md mx-4 overflow-hidden bg-white shadow-2xl dark:bg-slate-800 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <PauseCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{confirmLabel}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 transition-colors rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {prompt} <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              maxLength={200}
              className="w-full px-4 py-3 text-sm transition-all border rounded-xl border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            {!reason.trim() && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                A reason is required to pause.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <PauseCircle className="w-4 h-4" />
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
