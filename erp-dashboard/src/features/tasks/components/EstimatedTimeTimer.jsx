import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * Displays countdown timer based on estimated time
 * Shows HH:MM:SS format counting DOWN from estimated time
 * Animates and changes color when expired
 */
export default function EstimatedTimeTimer({ countdown, task }) {
  if (!countdown || !task) return null;
  
  // Don't show if no estimated time set
  if (countdown.estimatedSeconds === 0) return null;

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
  let borderColor = 'border-emerald-200 dark:border-emerald-700';
  let iconColor = 'text-emerald-600';
  let animate = '';

  if (countdown.isExpired) {
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    textColor = 'text-red-800 dark:text-red-200';
    borderColor = 'border-red-300 dark:border-red-600';
    iconColor = 'text-red-600';
    animate = 'animate-pulse';
  } else if (countdown.remainingSeconds <= 60) {
    // Less than 1 minute - critical
    bgColor = 'bg-orange-100 dark:bg-orange-900/30';
    textColor = 'text-orange-800 dark:text-orange-200';
    borderColor = 'border-orange-300 dark:border-orange-600';
    iconColor = 'text-orange-600';
    animate = 'animate-pulse';
  } else if (countdown.remainingSeconds <= 300) {
    // Less than 5 minutes - warning
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
    textColor = 'text-yellow-700 dark:text-yellow-300';
    borderColor = 'border-yellow-200 dark:border-yellow-700';
    iconColor = 'text-yellow-600';
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono font-bold border ring-1 ring-opacity-10 ${bgColor} ${textColor} border-${borderColor.split('-')[1]}-${borderColor.split('-')[2]} ${animate}`}
      title={`Estimated time: ${countdown.remainingDisplay || '--:--:--'}`}
      role="status"
      aria-live="polite"
    >
      {countdown.isExpired ? (
        <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
      ) : (
        <Clock className={`w-4 h-4 ${iconColor}`} />
      )}
      <span>{countdown.remainingDisplay}</span>
      {countdown.isExpired && <span className="ml-1 text-xs">TIME UP!</span>}
    </div>
  );
}
