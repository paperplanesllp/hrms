import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Modal for pausing a task with remarks
 * Allows employee to explain why they're pausing
 * Shows when manager assigns higher priority task
 */
export default function PauseTaskModal({ task, isOpen, onClose, onPause }) {
  const [remarks, setRemarks] = useState('');
  const [pauseReason, setPauseReason] = useState('higher_priority');
  const [isLoading, setIsLoading] = useState(false);

  const handlePause = async () => {
    if (!remarks.trim()) {
      alert('Please add remarks explaining why you\'re pausing this task');
      return;
    }

    setIsLoading(true);
    try {
      await onPause(task._id, remarks, pauseReason);
      setRemarks('');
      setPauseReason('higher_priority');
      onClose();
    } catch (err) {
      console.error('Error pausing task:', err);
      alert('Failed to pause task');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">⏸️ Pause Task</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task?.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Your work time will be saved. Manager can adjust deadline for this paused task.
          </p>
        </div>

        {/* Pause Reason */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Why are you pausing?
          </label>
          <select
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          >
            <option value="higher_priority">📌 Higher priority task assigned</option>
            <option value="blocked">🚧 Task blocked/waiting</option>
            <option value="waiting">⏳ Waiting for clarification</option>
            <option value="other">❓ Other reason</option>
          </select>
        </div>

        {/* Remarks Textarea */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            📝 Remarks (for manager & HR)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Explain why you're pausing this task. Manager can use this to adjust timeline if needed..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 resize-none"
            rows="4"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {remarks.length}/200 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePause}
            disabled={isLoading || !remarks.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? '⏳ Pausing...' : '⏸️ Pause & Switch'}
          </button>
        </div>
      </div>
    </div>
  );
}
