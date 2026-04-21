import React, { useState } from 'react';
import { MoreVertical, Eye, CheckCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDistanceToNow } from 'date-fns';
import TimerChip from './TimerChip.jsx';
import { useCountdownTimer } from '../hooks/useTaskTimer.js';
import { calculateRemainingTime, formatToIST } from '../utils/taskDeadlineUtils.js';


export default function TaskCard({
  task,
  onViewDetails,
  onEdit,
  onDelete,
  onStatusChange,
  showActions = true,
  isCompact = false
}) {
  const [showMenu, setShowMenu] = useState(false);
  const countdown = useCountdownTimer(task || {});
  const remaining = calculateRemainingTime(task || {});
  const effectiveDueAt = remaining.effectiveDueAt || task?.dueAt || task?.dueDate;

  const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();

  const handleStatusToggle = (newStatus) => {
    onStatusChange?.(task._id, newStatus);
  };

  return (
    <div
      className={`relative group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 transition-all duration-300 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 overflow-hidden ${
        isCompact ? 'p-4' : 'p-5'
      }`}
    >
      {/* Status indicator bar */}
      <div
        className={`absolute top-0 left-0 h-1 w-full transition-all ${
          task.status === 'completed'
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : task.status === 'in-progress'
            ? 'bg-gradient-to-r from-blue-400 to-cyan-500'
            : isOverdue
            ? 'bg-gradient-to-r from-red-400 to-orange-500'
            : 'bg-gradient-to-r from-gray-300 to-gray-400'
        }`}
      />

      <div className="pt-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              onClick={() => onViewDetails?.(task)}
              className="text-base font-bold text-gray-900 truncate transition-colors cursor-pointer dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Menu button */}
          {showActions && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 z-10 mt-1 overflow-hidden duration-100 bg-white border-2 border-gray-200 rounded-lg shadow-lg top-full dark:bg-slate-700 dark:border-gray-600 animate-in fade-in-80">
                  <button
                    onClick={() => {
                      onViewDetails?.(task);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-gray-300"
                  >
                    <Eye size={16} /> View
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(task);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-gray-300 border-t border-gray-100 dark:border-gray-600"
                    >
                      <Edit2 size={16} /> Update
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(task._id);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full gap-2 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-300 border-t border-gray-100 dark:border-gray-600"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <PriorityBadge priority={task.priority} size="sm" />
          <StatusBadge status={task.status} size="sm" />
          {isOverdue && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-semibold">
              <AlertCircle size={12} /> Overdue
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isCompact && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{task.progress || 0}%</span>
            </div>
            <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full dark:bg-gray-700">
              <div
                className="h-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-500"
                style={{ width: `${task.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>
              <span className="font-semibold">Due:</span> {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
            </div>
            <TimerChip countdown={countdown} isPaused={task.isPaused} dueTooltip={`Due: ${formatToIST(effectiveDueAt)}`} />
          </div>

          {/* Quick action button */}
          {task.status !== 'completed' && showActions && (
            <button
              onClick={() => handleStatusToggle('completed')}
              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group/btn"
              title="Mark as completed"
            >
              <CheckCircle size={18} className="text-gray-400 transition-colors group-hover/btn:text-green-600 dark:group-hover/btn:text-green-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
