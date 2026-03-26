import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  Eye,
  Tag
} from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  getPriorityStyles,
  getStatusStyles,
  getPriorityLabel,
  getStatusLabel,
  getDueDateDisplay,
  isTaskOverdue
} from './taskUtils.js';

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onViewDetails,
  isEmployee = false
}) {  
  const priorityStyles = getPriorityStyles(task.priority);
  const statusStyles = getStatusStyles(task.status);
  const isOverdue = isTaskOverdue(task.dueDate, task.status);
  
  const handleStatusToggle = async (e) => {
    e.stopPropagation();
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (onStatusChange) {
      await onStatusChange(task._id, nextStatus);
    }
  };

  return (
    <Card
      className={`p-5 border-l-4 cursor-pointer transition-all hover:shadow-lg ${
        isOverdue 
          ? 'border-l-red-500 shadow-red-500/5 hover:shadow-red-500/10' 
          : `border-l-${priorityStyles.dot.split('-')[1]}-500`
      } ${priorityStyles.glow}`}
      onClick={() => onViewDetails && onViewDetails(task)}
    >
      <div className="space-y-4">
        {/* Header: Title & Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Priority Dot Indicator */}
              <div className={`w-3 h-3 rounded-full ${priorityStyles.dot} flex-shrink-0`}></div>
              
              {/* Task Title */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {task.title}
              </h3>
            </div>
            
            {/* Priority & Status Badges */}
            <div className="flex flex-wrap gap-2">
              {/* Priority Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${priorityStyles.badge}`}>
                <span className={`w-2 h-2 rounded-full ${priorityStyles.dot}`}></span>
                {getPriorityLabel(task.priority)}
              </span>
              
              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles.badge}`}>
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
                {getStatusLabel(task.status)}
              </span>
              
              {/* Overdue Badge */}
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-700">
                  <AlertCircle size={12} />
                  Overdue
                </span>
              )}
            </div>
          </div>

          {/* Completion Checkbox */}
          {!isEmployee && (
            <button
              onClick={handleStatusToggle}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                task.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
            >
              <CheckCircle2 size={20} />
            </button>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300"
              >
                <Tag size={12} />
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
                +{task.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {task.progress !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Progress</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{task.progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  task.progress === 100 ? 'bg-green-500' : 
                  task.progress >= 75 ? 'bg-blue-500' :
                  task.progress >= 50 ? 'bg-amber-500' :
                  task.progress >= 25 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Footer: Metadata */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {/* Due Date */}
            <div className="flex items-center gap-1">
              <Clock size={14} className={isOverdue ? 'text-red-500' : 'text-slate-500'} />
              <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                {getDueDateDisplay(task.dueDate, task.status)}
              </span>
            </div>

            {/* Assigned To */}
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                {task.assignedTo.avatar ? (
                  <img
                    src={task.assignedTo.avatar}
                    alt={task.assignedTo.name}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
                )}
                <span className="truncate">{task.assignedTo.name}</span>
              </div>
            )}

            {/* Comments Count */}
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare size={14} />
                {task.comments.length}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEmployee && (
            <div className="flex items-center gap-2">
              {/* View Icon */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails && onViewDetails(task);
                }}
                className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                title="View task details"
              >
                <Eye size={16} />
              </Button>

              {/* Edit/Delete removed per request */}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
