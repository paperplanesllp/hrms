import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { formatDateTimeIST } from '../utils/taskStatusUtils.js';

/**
 * Modal for HR/Manager to extend task deadline
 * Used when reviewing paused tasks
 * Shows current deadline and proposed extension
 */
export default function ExtendDeadlineModal({ 
  task, 
  pauseRecord,
  isOpen, 
  onClose, 
  onExtend 
}) {
  const [extensionType, setExtensionType] = useState('by-pause'); // 'by-pause' or 'custom'
  const [customMinutes, setCustomMinutes] = useState(0);
  const [hrRemarks, setHrRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !task || !pauseRecord) return null;

  // Calculate proposed deadline
  const currentDeadline = new Date(task.dueDateTime);
  let extensionMs = 0;

  if (extensionType === 'by-pause') {
    extensionMs = pauseRecord.pausedDurationMs || 0;
  } else {
    extensionMs = customMinutes * 60 * 1000;
  }

  const proposedDeadline = new Date(currentDeadline.getTime() + extensionMs);

  // Format display times
  const formatDeadline = (date) => {
    try {
      return formatDateTimeIST(date);
    } catch {
      return '—';
    }
  };

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const handleExtend = async () => {
    if (extensionType === 'custom' && customMinutes <= 0) {
      alert('Please enter a valid extension time (in minutes)');
      return;
    }

    setIsLoading(true);
    try {
      await onExtend({
        taskId: task._id,
        extensionMs,
        extensionType,
        customMinutes: extensionType === 'custom' ? customMinutes : undefined,
        hrRemarks,
        pauseRecordId: pauseRecord._id
      });
      
      // Reset form
      setExtensionType('by-pause');
      setCustomMinutes(0);
      setHrRemarks('');
      onClose();
    } catch (err) {
      console.error('Error extending deadline:', err);
      alert('Failed to extend deadline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Extend Deadline
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task?.title}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Extend the deadline for this task due to the pause period. Employee will be notified of the new deadline.
          </p>
        </div>

        {/* Deadline Comparison */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Current Deadline */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Current Deadline</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDeadline(currentDeadline)}
            </p>
          </div>

          {/* Proposed Deadline */}
          <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Proposed Deadline</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-300">
              {formatDeadline(proposedDeadline)}
            </p>
          </div>
        </div>

        {/* Extension Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Extension Duration
          </label>
          
          <div className="space-y-2">
            {/* By Pause Duration */}
            <label className="flex items-start p-3 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
              <input
                type="radio"
                name="extensionType"
                value="by-pause"
                checked={extensionType === 'by-pause'}
                onChange={(e) => setExtensionType(e.target.value)}
                className="mt-1 mr-3"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Extend by pause duration
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  +{formatDuration(pauseRecord.pausedDurationMs || 0)}
                </p>
              </div>
            </label>

            {/* Custom Extension */}
            <label className="flex items-start p-3 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
              <input
                type="radio"
                name="extensionType"
                value="custom"
                checked={extensionType === 'custom'}
                onChange={(e) => setExtensionType(e.target.value)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Custom extension
                </p>
                <input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Minutes"
                  min="0"
                  className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </label>
          </div>
        </div>

        {/* HR Remarks */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            📝 HR/Manager Remarks (optional)
          </label>
          <textarea
            value={hrRemarks}
            onChange={(e) => setHrRemarks(e.target.value)}
            placeholder="Reason for extension, notes for employee, etc."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 resize-none text-sm"
            rows="3"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hrRemarks.length}/500 characters
          </p>
        </div>

        {/* Pause Record Reference */}
        <div className="space-y-1 mb-4 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Pause #{pauseRecord.index}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Paused: {pauseRecord.pausedAtFormatted}
          </p>
          {pauseRecord.reasonLabel && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Reason: {pauseRecord.reasonLabel}
            </p>
          )}
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
            onClick={handleExtend}
            disabled={isLoading || (extensionType === 'custom' && customMinutes <= 0)}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition"
          >
            {isLoading ? 'Extending...' : 'Extend Deadline'}
          </button>
        </div>
      </div>
    </div>
  );
}
