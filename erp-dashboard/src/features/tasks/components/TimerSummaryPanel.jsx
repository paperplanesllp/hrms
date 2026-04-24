import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Zap, Pause } from 'lucide-react';
import { calculateRemainingTime, formatToIST, getTaskDueDisplay } from '../utils/taskDeadlineUtils.js';

/**
 * Timer Summary Panel
 * Shows detailed time breakdown:
 * - Time Spent (Active + Paused)
 * - Due Time (Deadline)
 * - Required Time (Estimated)
 * - Final Time (on completion)
 */
export default function TimerSummaryPanel({ task, countdown }) {
  if (!task || !countdown) return null;

  // Format seconds to readable time
  const formatSeconds = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const activeSeconds = task.totalActiveTimeInSeconds || 0;
  const pausedSeconds = task.totalPausedTimeInSeconds || 0;
  const totalTimeSpent = activeSeconds + pausedSeconds;
  const estimatedSeconds = countdown.estimatedSeconds || 0;
  const remaining = calculateRemainingTime(task);
  const isOverdue = remaining.isOverdue;
  const overdueSeconds = countdown.overdueSeconds || 0;

  // Calculate metrics
  const performancePercent = estimatedSeconds > 0 
    ? Math.round((totalTimeSpent / estimatedSeconds) * 100) 
    : 0;
  
  const isEarlyCompletion = task.status === 'completed' && !isOverdue;
  const isLateCompletion = task.status === 'completed' && isOverdue;

  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Active Time */}
      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
        <div className="flex-shrink-0">
          <Zap size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Active</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {formatSeconds(activeSeconds)}
          </p>
        </div>
      </div>

      {/* Paused Time */}
      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
        <div className="flex-shrink-0">
          <Pause size={18} className="text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Paused</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {formatSeconds(pausedSeconds)}
          </p>
        </div>
      </div>

      {/* Time Spent (Total) */}
      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
        <div className="flex-shrink-0">
          <Clock size={18} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Spent</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {formatSeconds(totalTimeSpent)}
          </p>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
        <div className="flex-shrink-0">
          <Clock size={18} className="text-slate-600 dark:text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Est. Time</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {formatSeconds(estimatedSeconds)}
          </p>
        </div>
      </div>

      {/* Due Date */}
      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 col-span-2">
        <div className="flex-shrink-0">
          <AlertCircle size={18} className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isOverdue ? 'Overdue Since' : 'Due Date'}
          </p>
          <p className={`text-sm font-bold truncate ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
            {remaining.effectiveDueAt ? formatToIST(remaining.effectiveDueAt) : getTaskDueDisplay(task)}
          </p>
          {isOverdue && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Overdue by: {formatSeconds(overdueSeconds)}
            </p>
          )}
        </div>
      </div>

      {/* Performance Metric (% of estimated time used) */}
      <div className="col-span-2 mt-2 p-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Performance</p>
          <p className={`text-sm font-bold ${
            performancePercent <= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {performancePercent}% of estimate
          </p>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              performancePercent <= 75 ? 'bg-green-500' :
              performancePercent <= 100 ? 'bg-blue-500' :
              performancePercent <= 125 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(performancePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Completion Status */}
      {task.status === 'completed' && (
        <div className={`col-span-2 p-3 rounded-lg border flex items-start gap-3 ${
          isEarlyCompletion
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
            : isLateCompletion
            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
        }`}>
          <CheckCircle2 size={18} className={
            isEarlyCompletion ? 'text-green-600 dark:text-green-400 flex-shrink-0' :
            isLateCompletion ? 'text-red-600 dark:text-red-400 flex-shrink-0' :
            'text-blue-600 dark:text-blue-400 flex-shrink-0'
          } />
          <div>
            <p className={`text-sm font-semibold ${
              isEarlyCompletion ? 'text-green-800 dark:text-green-200' :
              isLateCompletion ? 'text-red-800 dark:text-red-200' :
              'text-blue-800 dark:text-blue-200'
            }`}>
              {isEarlyCompletion ? '✅ Completed Early' : isLateCompletion ? '⏰ Completed Late' : 'Task Completed'}
            </p>
            {task.completionRemarks && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {task.completionRemarks}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
