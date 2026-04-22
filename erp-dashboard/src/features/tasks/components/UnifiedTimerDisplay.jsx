import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

/**
 * Unified Timer Display Component
 * Shows ONE primary timer based on task state, eliminating multiple running timers
 * 
 * Display modes:
 * - Pending (not started): "Est: HH:MM:SS"
 * - Running (before due): Countdown in seconds
 * - Running (after due): "OVERDUE +HH:MM:SS"
 * - Completed: Shows total time spent
 */
export default function UnifiedTimerDisplay({ countdown, task }) {
  if (!countdown || !task) return null;

  // Don't show timer for completed tasks
  if (task.status === 'completed' || countdown.isCompleted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-700">
        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
        <span className="text-sm">COMPLETED</span>
        {countdown.totalTimeSpent > 0 && (
          <span className="text-xs text-green-600 dark:text-green-400 ml-2">
            • {countdown.formatCountdown(countdown.totalTimeSpent)}
          </span>
        )}
      </div>
    );
  }

  // No estimate set
  if (countdown.estimatedSeconds === 0 || (task.estimatedMinutes === 0 && task.estimatedHours === 0)) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        <Clock size={14} />
        <span>No estimate set</span>
      </div>
    );
  }

  // Not started - show estimated time only
  if (task.status === 'pending' && !task.isRunning) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
        <Clock size={14} />
        <span>Est: {countdown.remainingDisplay}</span>
      </div>
    );
  }

  // Task is running - determine styling based on overdue status
  let bgColor = 'bg-emerald-50 dark:bg-emerald-900/20';
  let textColor = 'text-emerald-700 dark:text-emerald-300';
  let borderColor = 'ring-emerald-200 dark:ring-emerald-700';
  let iconColor = 'text-emerald-600';
  let animate = '';
  let displayText = countdown.remainingDisplay;
  let statusLabel = '';
  let showIcon = Clock;

  // Check if task is overdue (past due date)
  const isDueDate = new Date(task.dueDate);
  const isAfterDue = new Date() > isDueDate;

  if (isAfterDue) {
    // OVERDUE MODE - show how much time has exceeded
    bgColor = 'bg-red-100 dark:bg-red-900/40';
    textColor = 'text-red-800 dark:text-red-100';
    borderColor = 'ring-red-400 dark:ring-red-600';
    iconColor = 'text-red-600';
    animate = 'animate-pulse';
    showIcon = AlertTriangle;
    
    const overdueSeconds = countdown.overdueSeconds;
    displayText = countdown.formatCountdown(overdueSeconds);
    statusLabel = 'OVERDUE';
  } else if (countdown.remainingSeconds === 0) {
    // TIME UP!
    bgColor = 'bg-red-100 dark:bg-red-900/40';
    textColor = 'text-red-800 dark:text-red-100';
    borderColor = 'ring-red-400 dark:ring-red-600';
    iconColor = 'text-red-600';
    animate = 'animate-bounce';
    showIcon = AlertTriangle;
    statusLabel = 'TIME UP!';
  } else if (countdown.remainingSeconds <= 60) {
    // Less than 1 minute - CRITICAL
    bgColor = 'bg-red-100 dark:bg-red-900/35';
    textColor = 'text-red-800 dark:text-red-200';
    borderColor = 'ring-red-400 dark:ring-red-600';
    iconColor = 'text-red-600';
    animate = 'animate-pulse';
    showIcon = AlertCircle;
    statusLabel = '🚨 URGENT';
  } else if (countdown.remainingSeconds <= 300) {
    // Less than 5 minutes - WARNING
    bgColor = 'bg-orange-100 dark:bg-orange-900/30';
    textColor = 'text-orange-800 dark:text-orange-200';
    borderColor = 'ring-orange-400 dark:ring-orange-600';
    iconColor = 'text-orange-600';
    animate = 'animate-pulse';
    statusLabel = '⚠️ 5 MIN';
  } else if (countdown.remainingSeconds <= 600) {
    // Less than 10 minutes - CAUTION
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/25';
    textColor = 'text-yellow-700 dark:text-yellow-300';
    borderColor = 'ring-yellow-300 dark:ring-yellow-700';
    iconColor = 'text-yellow-600';
  }

  const Icon = showIcon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono font-bold border-2 ring-1 ${bgColor} ${textColor} ${borderColor} ${animate} transition-all`}
      title={isAfterDue ? `Overdue by ${displayText}` : `Time remaining: ${countdown.remainingDisplay}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
      <span className="text-sm">{isAfterDue ? '+' : ''}{displayText}</span>
      {statusLabel && <span className="text-xs font-extrabold ml-1">{statusLabel}</span>}
    </div>
  );
}
