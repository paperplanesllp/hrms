import React from 'react';
import {
  Clock, PauseCircle, CheckCircle2, TrendingUp, Calendar, ListChecks, BarChart3,
} from 'lucide-react';
import {
  formatSecondsHuman,
  formatSeconds,
  calcActiveSeconds,
  calcPausedSeconds,
  calcProductivityRatio,
  getLifecycleDuration,
} from '../utils/taskTimerUtils.js';

function Row({ icon, label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold text-slate-900 dark:text-white ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function TaskAnalysisPanel({ task }) {
  const activeSeconds = calcActiveSeconds(task);
  const pausedSeconds = calcPausedSeconds(task);
  const ratio = calcProductivityRatio(activeSeconds, pausedSeconds);

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        Time Analysis Report
      </div>

      {/* Timestamps */}
      <div>
        <Row icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={fmt(task.createdAt)} />
        <Row icon={<Clock className="w-3.5 h-3.5 text-blue-500" />} label="Started" value={fmt(task.startedAt)} />
        {task.completedAt && (
          <Row
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            label="Completed"
            value={fmt(task.completedAt)}
          />
        )}
        <Row
          icon={<ListChecks className="w-3.5 h-3.5 text-purple-500" />}
          label="Lifecycle Duration"
          value={getLifecycleDuration(task)}
          valueClass="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Active vs Paused tiles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/40">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Active Time</span>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono leading-none">
            {formatSecondsHuman(activeSeconds)}
          </p>
          <p className="text-xs text-blue-400 font-mono mt-0.5">{formatSeconds(activeSeconds)}</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800/40">
          <div className="flex items-center gap-1.5 mb-1">
            <PauseCircle className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Paused Time</span>
          </div>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300 font-mono leading-none">
            {formatSecondsHuman(pausedSeconds)}
          </p>
          <p className="text-xs text-orange-400 font-mono mt-0.5">{formatSeconds(pausedSeconds)}</p>
        </div>
      </div>

      {/* Productivity bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Productivity Ratio
          </div>
          <span
            className={`text-sm font-bold ${
              ratio >= 70
                ? 'text-emerald-600 dark:text-emerald-400'
                : ratio >= 40
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-500'
            }`}
          >
            {ratio}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              ratio >= 70 ? 'bg-emerald-500' : ratio >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${ratio}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {ratio >= 70
            ? '🟢 Excellent focus'
            : ratio >= 40
            ? '🟡 Moderate focus'
            : ratio > 0
            ? '🔴 High pause ratio'
            : 'No data yet — start working to see stats'}
        </p>
      </div>

      {/* Pause history */}
      {task.pauseEntries?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Pause History · {task.pauseEntries.length}{' '}
            {task.pauseEntries.length === 1 ? 'pause' : 'pauses'}
          </h4>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {task.pauseEntries.map((entry, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                    {entry.reason}
                  </span>
                  {entry.pausedDurationInSeconds > 0 && (
                    <span className="shrink-0 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-lg">
                      {formatSecondsHuman(entry.pausedDurationInSeconds)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>⏸ {fmt(entry.pausedAt)}</span>
                  {entry.resumedAt && <span>▶ {fmt(entry.resumedAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
