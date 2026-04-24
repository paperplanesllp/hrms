import React, { useState } from 'react';
import { Eye, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import {
  getPriorityStyles,
  getStatusStyles,
  getPriorityLabel,
  getStatusLabel,
  getDueDateDisplay,
  isTaskOverdue,
  getDaysUntilDue
} from './taskUtils.js';

export default function TaskTable({
  tasks = [],
  onEdit,
  onDelete,
  onView,
  onStatusChange,
  onSort,
  sortField = 'dueDate',
  sortDirection = 'asc'
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleSort = (field) => {
    if (onSort) {
      const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(field, newDirection);
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ChevronUp size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            {/* Priority Column */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('priority')}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Priority
                {renderSortIcon('priority')}
              </button>
            </th>

            {/* Title Column */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('title')}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Task
                {renderSortIcon('title')}
              </button>
            </th>

            {/* Assigned To Column */}
            <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">
              Assigned To
            </th>

            {/* Status Column */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('status')}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Status
                {renderSortIcon('status')}
              </button>
            </th>

            {/* Due Date Column */}
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('dueDate')}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Due Date
                {renderSortIcon('dueDate')}
              </button>
            </th>

            {/* Progress Column */}
            <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">
              Progress
            </th>

            {/* Department Column */}
            <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">
              Department
            </th>

            {/* Actions Column */}
            <th className="px-4 py-3 text-sm font-semibold text-center text-slate-700 dark:text-slate-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const priorityStyles = getPriorityStyles(task.priority);
            const statusStyles = getStatusStyles(task.status);
            const isOverdue = isTaskOverdue(task);

            return (
              <tr
                key={task._id}
                onMouseEnter={() => setHoveredRow(task._id)}
                onMouseLeave={() => setHoveredRow(null)}
                className="transition-colors border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                {/* Priority Badge */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${priorityStyles.dot}`}></span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${priorityStyles.badge}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                </td>

                {/* Task Title */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <p className="font-medium truncate text-slate-900 dark:text-white">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs truncate text-slate-500 dark:text-slate-400">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>

                {/* Assigned To */}
                <td className="px-4 py-3">
                  {task.assignedTo?.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {(Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]).map((person, idx) => {
                        const name = person?.name || '?';
                        const email = person?.email || '';
                        const initials = name.charAt(0).toUpperCase();
                        return (
                          <div key={person?._id || idx} className="flex items-center gap-1 group relative">
                            {person?.avatar ? (
                              <img src={person.avatar} alt={name} className="w-6 h-6 rounded-full cursor-help" title={`${name}\n${email}`} />
                            ) : (
                              <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full bg-blue-500 dark:bg-blue-600 cursor-help" title={`${name}\n${email}`}>
                                {initials}
                              </div>
                            )}
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600">
                        <span className="text-xs font-bold text-slate-400">-</span>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Unassigned</span>
                    </div>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
                    {getStatusLabel(task.status)}
                  </span>
                </td>

                {/* Due Date */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-medium ${
                      isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {getDueDateDisplay(task)}
                    </span>
                    {isOverdue && (
                      <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                        ⚠️ {Math.abs(getDaysUntilDue(task))} days overdue
                      </span>
                    )}
                  </div>
                </td>

                {/* Progress */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full transition-all ${
                          task.progress === 100 ? 'bg-green-500' : 
                          task.progress >= 75 ? 'bg-blue-500' :
                          task.progress >= 50 ? 'bg-amber-500' :
                          task.progress >= 25 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-xs font-bold text-right text-slate-700 dark:text-slate-300">
                      {task.progress || 0}%
                    </span>
                  </div>
                </td>

                {/* Department */}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {task.department?.name || '-'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {hoveredRow === task._id ? (
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView && onView(task)}
                        className="text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="View details"
                      >
                        <Eye size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400">•••</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
