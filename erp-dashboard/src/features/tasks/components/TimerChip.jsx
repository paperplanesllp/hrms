import React from 'react';
import { AlertTriangle, Timer, CheckCircle2 } from 'lucide-react';

const COUNTDOWN_STYLE = {
  normal:
    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700',
  warning:
    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-700',
  critical:
    'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-700 animate-pulse',
  blink:
    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-600 font-extrabold animate-pulse',
  'due-now':
    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-600 font-extrabold animate-pulse',
  overdue:
    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-600 font-bold',
  paused:
    'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-700',
  completed:
    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-700',
  none: 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500',
};

function getVisualState(countdown, isPaused = false) {
  if (countdown?.isCompleted) return 'completed';
  if (isPaused) return 'paused';
  if (!countdown?.shouldTrack) return 'none';
  if (countdown.isDueNow) return 'due-now';
  return countdown.urgency || 'normal';
}

export default function TimerChip({ countdown, isPaused = false, dueTooltip }) {
  const visualState = getVisualState(countdown, isPaused);
  const display = countdown?.isCompleted
    ? 'Completed'
    : countdown?.shouldTrack
    ? countdown.display
    : '-';

  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
        COUNTDOWN_STYLE[visualState] || COUNTDOWN_STYLE.normal
      }`}
      title={dueTooltip || ''}
      aria-live="polite"
    >
      {countdown?.isCompleted ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : countdown?.isOverdue ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Timer className="w-3 h-3" />
      )}
      {display}
    </div>
  );
}
