import React from 'react';
import {
  Clock,
  AlertCircle,
  Zap,
  CheckCircle2,
  Play,
  Pause,
  Lock,
  Eye,
  RotateCcw,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  Timer
} from 'lucide-react';
import {
  formatDuration,
  getExecutionStatusStyle,
  getDueHealthStyle,
  calculateProgress,
  getProgressColor,
  formatRelativeTime,
  isOverdue,
  getDaysUntilDue
} from '../utils/taskExecutionUtils.js';

export default function PremiumTaskCard({
  task,
  onStart,
  onPause,
  onResume,
  onComplete,
  onBlock,
  onSendForReview,
  onReopen,
  onViewDetails,
  isLoading = false
}) {
  const executionStyle = getExecutionStatusStyle(task.executionStatus);
  const dueHealthStyle = getDueHealthStyle(task.dueHealth);
  const progress = calculateProgress(task.totalActiveMinutes, task.estimatedMinutes);
  const progressColor = getProgressColor(progress);
  const isOverdueTask = isOverdue(task.dueDate, task.executionStatus);
  const daysUntilDue = getDaysUntilDue(task.dueDate);

  const getActionButton = (action, icon, label, onClick, color) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isLoading}
      title={label}
      className={`p-1.5 rounded-lg transition-all ${
        color === 'green'
          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
          : color === 'yellow'
          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50'
          : color === 'red'
          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
          : color === 'purple'
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div
      onClick={() => onViewDetails && onViewDetails(task)}
      className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate mb-2">
            {task.title}
          </h3>

          {/* Status & Health Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Execution Status Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${
                executionStyle.textColor
              } ${executionStyle.bgColor} ${executionStyle.borderColor} ${executionStyle.darkBg} ${
                executionStyle.darkText
              }`}
            >
              <span className="text-sm">{executionStyle.icon}</span>
              {executionStyle.label}
            </span>

            {/* Due Health Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${
                dueHealthStyle.textColor
              } ${dueHealthStyle.bgColor} ${dueHealthStyle.borderColor} ${dueHealthStyle.darkBg} ${
                dueHealthStyle.darkText
              }`}
            >
              <span className="text-sm">{dueHealthStyle.icon}</span>
              {dueHealthStyle.label}
            </span>

            {/* Blocked Badge */}
            {task.executionStatus === 'blocked' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-700">
                <Lock size={12} />
                Blocked
              </span>
            )}

            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                task.priority === 'URGENT'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : task.priority === 'HIGH'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                  : task.priority === 'MEDIUM'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}
            >
              ⭐ {task.priority}
            </span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex-shrink-0 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mb-1 border-2 border-slate-300 dark:border-slate-600">
            <span className={`text-sm font-bold ${progress >= 75 ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'}`}>
              {progress}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
        </div>
      </div>

      {/* Time Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
        {/* Active Time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {formatDuration(task.totalActiveMinutes)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Active</p>
        </div>

        {/* Paused Time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Pause size={14} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {formatDuration(task.totalPausedMinutes)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Paused</p>
        </div>

        {/* Estimated */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer size={14} className="text-slate-600 dark:text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {formatDuration(task.estimatedMinutes)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Est.</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Time Progress</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${progressColor}`} style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Timeline Info */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        {/* Started At */}
        {task.startedAt && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Play size={12} className="flex-shrink-0" />
            <span className="truncate">{formatRelativeTime(task.startedAt)}</span>
          </div>
        )}

        {/* Last Activity */}
        {task.lastActivityAt && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <TrendingUp size={12} className="flex-shrink-0" />
            <span className="truncate">{formatRelativeTime(task.lastActivityAt)}</span>
          </div>
        )}

        {/* Due Date */}
        <div className={`flex items-center gap-2 ${isOverdueTask ? 'text-red-600' : 'text-slate-600'} dark:${isOverdueTask ? 'text-red-400' : 'text-slate-400'}`}>
          <Calendar size={12} className="flex-shrink-0" />
          <span className="truncate">
            {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
          </span>
        </div>

        {/* Completed At */}
        {task.completedAt && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 size={12} className="flex-shrink-0" />
            <span className="truncate">{formatRelativeTime(task.completedAt)}</span>
          </div>
        )}
      </div>

      {/* Assignee */}
      {task.assignedTo && task.assignedTo.length > 0 && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          <Users size={14} className="text-slate-600 dark:text-slate-400" />
          <div className="flex items-center gap-1 flex-wrap">
            {task.assignedTo.slice(0, 2).map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs"
              >
                {user.avatar && (
                  <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
                )}
                <span className="truncate">{user.name}</span>
              </div>
            ))}
            {task.assignedTo.length > 2 && (
              <span className="text-xs text-slate-600 dark:text-slate-400">+{task.assignedTo.length - 2}</span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        {/* Left: Meta Info */}
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          {task.sessions && task.sessions.length > 0 && (
            <span title={`${task.sessions.length} work session(s)`}>{task.sessions.length} sessions</span>
          )}
          {task.comments && task.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {task.comments.length}
            </span>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1">
          {task.executionStatus === 'not_started' && (
            <>
              {getActionButton('start', <Play size={16} />, 'Start', onStart, 'green')}
              {getActionButton('block', <Lock size={16} />, 'Block', onBlock, 'red')}
            </>
          )}

          {task.executionStatus === 'in_progress' && (
            <>
              {getActionButton('pause', <Pause size={16} />, 'Pause', onPause, 'yellow')}
              {getActionButton('complete', <CheckCircle2 size={16} />, 'Complete', onComplete, 'green')}
              {getActionButton('block', <Lock size={16} />, 'Block', onBlock, 'red')}
            </>
          )}

          {task.executionStatus === 'paused' && (
            <>
              {getActionButton('resume', <Play size={16} />, 'Resume', onResume, 'blue')}
              {getActionButton('complete', <CheckCircle2 size={16} />, 'Complete', onComplete, 'green')}
            </>
          )}

          {(task.executionStatus === 'completed' ||
            task.executionStatus === 'completed_late') && (
            <>{getActionButton('reopen', <RotateCcw size={16} />, 'Reopen', onReopen, 'orange')}</>
          )}

          {/* View Details */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails && onViewDetails(task);
            }}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-all"
            title="View details"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
