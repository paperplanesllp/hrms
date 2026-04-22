import React, { useState } from 'react';
import { X, Pause } from 'lucide-react';

const PAUSE_REASONS = [
  { value: 'toilet_break',    label: '🚻 Toilet / short break' },
  { value: 'quick_call',      label: '📞 Quick phone call' },
  { value: 'meeting',         label: '📅 Attending a meeting' },
  { value: 'higher_priority', label: '📌 Switching to higher priority task' },
  { value: 'other',           label: '❓ Other short break' },
];

export default function PauseTaskModal({ task, isOpen, onClose, onPause }) {
  const [reason, setReason] = useState('toilet_break');
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const label = PAUSE_REASONS.find(r => r.value === reason)?.label || reason;
    const fullReason = details.trim() ? `${label}: ${details.trim()}` : label;
    setIsLoading(true);
    try {
      await onPause(task._id, fullReason);
      setDetails('');
      setReason('toilet_break');
      onClose();
    } catch (err) {
      console.error('Error pausing task:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Pause size={16} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pause Task</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{task?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {/* Warning: timer keeps running */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
          <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">⚠️ Timer keeps running during pause</p>
          <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
            Pause is for short personal breaks only (max ~15 min). For external blockers, use <span className="font-semibold">On Hold</span> instead — that freezes the timer.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Reason for pausing
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          >
            {PAUSE_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Additional details <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Any extra context..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 resize-none text-sm"
            rows="2"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium disabled:opacity-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50 transition text-sm flex items-center justify-center gap-2"
          >
            <Pause size={14} />
            {isLoading ? 'Pausing...' : 'Pause Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
