import React from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * Displays countdown timer based on estimated time
 * Shows HH:MM:SS format counting DOWN from estimated time
 * Animates and changes color when expired
 * Shows "No estimate set" if no estimate is defined
 */
export default function EstimatedTimeTimer({ countdown, task }) {
  if (!countdown || !task) return null;
  
  // Show "No estimate set" if no estimated time is set
  if (countdown.estimatedSeconds === 0 || (task.estimatedMinutes === 0 && task.estimatedHours === 0)) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        <Clock className="w-4 h-4" />
        <span>No estimate set</span>
      </div>
    );
  }

  // If task not started, show just the estimated time
  if (task.status === 'pending' && !task.isRunning) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
        <Clock className="w-4 h-4" />
        <span>Est: {countdown.remainingDisplay}</span>
      </div>
    );
  }

  // Determine styling based on remaining time
  let bgColor = 'bg-emerald-50 dark:bg-emerald-900/20';
  let textColor = 'text-emerald-700 dark:text-emerald-300';
  let borderColor = 'ring-emerald-200 dark:ring-emerald-700';
  let iconColor = 'text-emerald-600';
  let animate = '';
  let statusText = '';

  if (countdown.isExpired) {
    // TIME UP!
    bgColor = 'bg-red-100 dark:bg-red-900/40';
    textColor = 'text-red-800 dark:text-red-100';
    borderColor = 'ring-red-400 dark:ring-red-600';
    iconColor = 'text-red-600';
    animate = 'animate-bounce';
    statusText = 'TIME UP!';
  } else if (countdown.remainingSeconds <= 60) {
    // Less than 1 minute - CRITICAL
    bgColor = 'bg-red-100 dark:bg-red-900/35';
    textColor = 'text-red-800 dark:text-red-200';
    borderColor = 'ring-red-400 dark:ring-red-600';
    iconColor = 'text-red-600';
    animate = 'animate-pulse';
    statusText = '🚨 URGENT';
  } else if (countdown.remainingSeconds <= 300) {
    // Less than 5 minutes - WARNING
    bgColor = 'bg-orange-100 dark:bg-orange-900/30';
    textColor = 'text-orange-800 dark:text-orange-200';
    borderColor = 'ring-orange-400 dark:ring-orange-600';
    iconColor = 'text-orange-600';
    animate = 'animate-pulse';
    statusText = '⚠️ 5 MIN LEFT';
  } else if (countdown.remainingSeconds <= 600) {
    // Less than 10 minutes - CAUTION
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/25';
    textColor = 'text-yellow-700 dark:text-yellow-300';
    borderColor = 'ring-yellow-300 dark:ring-yellow-700';
    iconColor = 'text-yellow-600';
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono font-bold border-2 ring-1 ${bgColor} ${textColor} ${borderColor} ${animate} transition-all`}
      title={`Estimated time remaining: ${countdown.remainingDisplay}`}
      role="status"
      aria-live="polite"
    >
      {countdown.isExpired ? (
        <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
      ) : countdown.remainingSeconds <= 300 ? (
        <AlertCircle className={`w-5 h-5 ${iconColor}`} />
      ) : (
        <Clock className={`w-4 h-4 ${iconColor}`} />
      )}
      <span className="text-sm">{countdown.remainingDisplay}</span>
      {statusText && <span className="text-xs font-extrabold ml-1">{statusText}</span>}
    </div>
  );
}
