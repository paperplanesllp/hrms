import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { formatPauseHistory, getPauseReasonLabel, extendDeadline } from '../utils/taskPauseUtils.js';
import ExtendDeadlineModal from './ExtendDeadlineModal.jsx';

/**
 * Displays pause history for HR/Manager review
 * Shows all times task was paused with remarks and reasons
 */
export default function PauseHistoryPanel({ task, isExpanded, onToggle, onTaskUpdated }) {
  const pauseHistory = formatPauseHistory(task?.pauseHistory || []);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedPauseRecord, setSelectedPauseRecord] = useState(null);
  const [isExtending, setIsExtending] = useState(false);
  
  if (!pauseHistory || pauseHistory.length === 0) {
    return null; // Don't show if no pause history
  }

  const handleExtendDeadline = (record) => {
    setSelectedPauseRecord({ ...record, index: pauseHistory.indexOf(record) + 1 });
    setExtendModalOpen(true);
  };

  const handleExtendSubmit = async (extensionData) => {
    setIsExtending(true);
    try {
      const updatedTask = await extendDeadline(
        extensionData.taskId,
        extensionData.extensionMs,
        extensionData.extensionType,
        extensionData.customMinutes,
        extensionData.hrRemarks,
        extensionData.pauseRecordId
      );
      
      // Notify parent that task was updated
      if (onTaskUpdated) {
        onTaskUpdated(updatedTask);
      }
      
      setExtendModalOpen(false);
    } catch (err) {
      console.error('Error extending deadline:', err);
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition text-sm font-semibold text-slate-700 dark:text-slate-300"
      >
        <span>
          ⏸️ Pause History ({pauseHistory.length})
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {pauseHistory.map((record, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
            >
              {/* Timeline Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-orange-700 dark:text-orange-300">
                    Pause #{idx + 1}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
                    {record.pausedAtFormatted}
                  </div>
                </div>
                {record.resumedAtFormatted !== 'Still paused' && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Resumed</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                      {record.resumedAtFormatted}
                    </div>
                  </div>
                )}
              </div>

              {/* Pause Duration */}
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                ⏱️ Paused for: <span className="font-semibold">{record.pausedDurationFormatted}</span>
              </div>

              {/* Reason */}
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                📌 Reason: <span className="font-semibold">{record.reasonLabel}</span>
              </div>

              {/* Remarks */}
              {record.remarks && (
                <div className="bg-white dark:bg-slate-800 p-2 rounded border border-orange-100 dark:border-orange-900">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    💬 Employee Remarks:
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    "{record.remarks}"
                  </p>
                </div>
              )}

              {/* Manager Actions & Hints */}
              <div className="mt-2 space-y-2">
                {record.reasonLabel === 'Higher priority task assigned' && (
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                      💡 Tip: Consider extending deadline since task was paused for higher priority work.
                    </p>
                  </div>
                )}

                {/* Extend Deadline Button */}
                <button
                  onClick={() => handleExtendDeadline(record)}
                  disabled={isExtending}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold transition disabled:opacity-50"
                >
                  <Clock className="w-3 h-3" />
                  Extend Deadline Based on Pause
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extend Deadline Modal */}
      <ExtendDeadlineModal
        task={task}
        pauseRecord={selectedPauseRecord}
        isOpen={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        onExtend={handleExtendSubmit}
      />
    </div>
  );
}
