import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';

const HOLD_REASONS = [
  { value: 'waiting_client',    label: '👤 Waiting for client response' },
  { value: 'waiting_approval',  label: '✅ Waiting for approval' },
  { value: 'waiting_team',      label: '👥 Blocked by another team' },
  { value: 'waiting_resource',  label: '🔧 Waiting for resource/access' },
  { value: 'external_dependency', label: '🔗 External dependency' },
  { value: 'other',             label: '❓ Other external blocker' },
];

export default function OnHoldModal({ task, isOpen, onClose, onHold }) {
  const [reason, setReason] = useState('waiting_client');
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!details.trim()) {
      alert('Please describe the blocker');
      return;
    }
    const label = HOLD_REASONS.find(r => r.value === reason)?.label || reason;
    const fullReason = `${label}: ${details.trim()}`;
    setIsLoading(true);
    try {
      await onHold(task._id, fullReason);
      setDetails('');
      setReason('waiting_client');
      onClose();
    } catch (err) {
      console.error('Error putting task on hold:', err);
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
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Lock size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Put On Hold</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{task?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {/* Key difference callout */}
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 mb-4 space-y-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">🔒 On Hold vs ⏸️ Pause</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">On Hold:</span> Timer freezes. Due date auto-extends by hold duration. Manager notified. Use for external blockers.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">Pause:</span> Timer keeps running. Use for short personal breaks only.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Blocker Type
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          >
            {HOLD_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Describe the blocker <span className="text-red-500">*</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="e.g. Waiting for client to send the design files before proceeding..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 resize-none text-sm"
            rows="3"
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
            disabled={isLoading || !details.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center justify-center gap-2"
          >
            <Lock size={14} />
            {isLoading ? 'Holding...' : 'Put On Hold'}
          </button>
        </div>
      </div>
    </div>
  );
}
