import React, { useState } from 'react';
import {
  Play, Pause, RotateCcw, CheckCircle2, Eye, BarChart3,
  ChevronDown, ChevronUp, Calendar, AlertTriangle, Users, UserCheck,
} from 'lucide-react';
import { useTaskCountdown } from '../hooks/useTaskTimer.js';
import TimerChip from './TimerChip.jsx';
import TaskAnalysisPanel from './TaskAnalysisPanel.jsx';
import { calcPausedSeconds, formatSecondsHuman, getTimerState } from '../utils/taskTimerUtils.js';
import { useAuthStore } from '../../../store/authStore.js';
import { calculateRemainingTime, formatToIST } from '../utils/taskDeadlineUtils.js';

// ─── Style maps ────────────────────────────────────────────────────────────────

const PRIORITY_BADGE = {
  LOW:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_BADGE = {
  pending:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'in-progress':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  extension_requested: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  paused:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'due-soon':  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  extended:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  rejected:    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'on-hold':   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  new:         'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  cancelled:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABEL = {
  pending:     'Pending',
  'in-progress':'In Progress',
  extension_requested: 'Extension Requested',
  paused:      'Paused',
  'due-soon':  'Due Soon',
  overdue:     'Overdue',
  extended:    'Extended',
  rejected:    'Rejected',
  'on-hold':   'Paused',
  completed:   'Completed',
  new:         'New',
  cancelled:   'Cancelled',
};

const LEFT_BORDER = {
  running:   'border-l-[3px] border-l-blue-500',
  paused:    'border-l-[3px] border-l-orange-400',
  completed: 'border-l-[3px] border-l-emerald-500',
  pending:   'border-l-[3px] border-l-slate-300 dark:border-l-slate-600',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TaskTimerCard({
  task,
  onStart,
  onPause,
  onResume,
  onComplete,
  onView,
  onRequestMoreTime,
  loadingAction,
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const countdown = useTaskCountdown(task);
  const timerState = getTimerState(task);
  const pausedSeconds = calcPausedSeconds(task);
  const isLoading = loadingAction === task._id;
  const isCompleted = task.status === 'completed';
  const currentUser = useAuthStore(s => s.user);

  const lastPauseReason =
    task.pauseEntries?.length > 0
      ? task.pauseEntries[task.pauseEntries.length - 1]?.reason
      : null;

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const remaining = calculateRemainingTime(task);
  const effectiveDueAt = remaining.effectiveDueAt || task.dueAt || task.dueDate;
  const isOverdue = remaining.isOverdue || task.status === 'overdue';
  const dueSoon = !isOverdue && remaining.remainingMinutes !== null && remaining.remainingMinutes <= 30;

  const formatRemaining = () => {
    if (!countdown.shouldTrack) return countdown.state || 'Not started';
    return countdown.display;
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
        LEFT_BORDER[timerState] || LEFT_BORDER.pending
      }`}
    >
      <div className="p-5">
        {/* ── Top row: badges + live timer ── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.MEDIUM
              }`}
            >
              {task.priority}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                STATUS_BADGE[task.status] || STATUS_BADGE.pending
              }`}
            >
              {STATUS_LABEL[task.status] || task.status}
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
            {!isOverdue && dueSoon && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Due Soon
              </span>
            )}
            {task.taskExtended && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                Extended
              </span>
            )}
          </div>

          {/* Live digital timer */}
          <TimerChip countdown={countdown} isPaused={task.isPaused} dueTooltip={`Due: ${formatToIST(effectiveDueAt)}`} />
        </div>

        {/* ── Title ── */}
        <h3
          className={`text-[15px] font-bold leading-snug mb-1 ${
            isCompleted
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-900 dark:text-white'
          }`}
        >
          {task.title}
        </h3>

        {/* ── Description ── */}
        {task.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* ── Assignees ── */}
        {task.assignedTo?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {task.assignedTo.map((person) => {
              const personId = person?._id || person;
              const isYou =
                currentUser &&
                (personId?.toString() === currentUser.id ||
                  personId?.toString() === currentUser._id);
              const name = person?.name || '—';
              return (
                <span
                  key={personId}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isYou
                      ? 'bg-brand-accent/15 text-brand-accent dark:bg-brand-accent/25'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isYou ? <span className="font-bold">{name}</span> : name}
                  {isYou && (
                    <span className="text-[10px] font-bold opacity-70">(you)</span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Assigned By ── */}
        {task.assignedBy?.name && (
          <div className="flex items-center gap-1.5 mb-3">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Assigned by{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {task.assignedBy.name}
              </span>
            </span>
          </div>
        )}

        {/* ── Meta row ── */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Due: {formatToIST(effectiveDueAt)}
          </span>
          {task.estimatedMinutes > 0 && (
            <span>Estimated: {formatSecondsHuman(task.estimatedMinutes * 60)}</span>
          )}
          <span>Remaining: {formatRemaining()}</span>
          {task.pauseEntries?.length > 0 && (
            <span className="flex items-center gap-1 text-orange-400 dark:text-orange-500">
              <Pause className="w-3 h-3" />
              {task.pauseEntries.length}{' '}
              {task.pauseEntries.length === 1 ? 'pause' : 'pauses'}
              {timerState === 'paused' && lastPauseReason && ` · "${lastPauseReason}"`}
            </span>
          )}
          {pausedSeconds > 0 && (
            <span className="flex items-center gap-1 text-orange-400 dark:text-orange-500">
              Paused: {formatSecondsHuman(pausedSeconds)}
            </span>
          )}
          {task.startedAt && (
            <span className="flex items-center gap-1 text-blue-400">
              Started: {fmtDate(task.startedAt)}
            </span>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap items-center gap-2">
          {isOverdue && !['rejected', 'completed', 'extension_requested'].includes(task.status) && (
            <>
              <button
                onClick={() => onRequestMoreTime?.(task)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-all"
              >
                Request Extension
              </button>
            </>
          )}

          {task.status === 'extension_requested' && (
            <span className="px-3 py-2 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              Extension request pending manager approval
            </span>
          )}

          {/* START — never been started */}
          {timerState === 'pending' && (
            <button
              onClick={() => onStart(task._id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              <Play className="w-3.5 h-3.5" />
              {isLoading ? 'Starting…' : 'Start'}
            </button>
          )}

          {/* PAUSE — currently running */}
          {timerState === 'running' && (
            <button
              onClick={() => onPause(task)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              <Pause className="w-3.5 h-3.5" />
              {isLoading ? 'Pausing…' : 'Pause'}
            </button>
          )}

          {/* RESUME — currently paused */}
          {timerState === 'paused' && (
            <button
              onClick={() => onResume(task._id)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isLoading ? 'Resuming…' : 'Resume'}
            </button>
          )}

          {/* COMPLETE — running or paused */}
          {(timerState === 'running' || timerState === 'paused') && (
            <button
              onClick={() => onComplete(task)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isLoading ? 'Completing…' : 'Complete'}
            </button>
          )}

          {/* VIEW — always available */}
          {onView && (
            <button
              onClick={() => onView(task)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm transition-colors"
              title="View details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          {/* ANALYSIS — once task has been started or is completed */}
          {(task.startedAt || isCompleted) && (
            <button
              onClick={() => setShowAnalysis((p) => !p)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors ml-auto"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analysis
              {showAnalysis ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Inline analysis panel */}
        {showAnalysis && <TaskAnalysisPanel task={task} />}
      </div>
    </div>
  );
}
