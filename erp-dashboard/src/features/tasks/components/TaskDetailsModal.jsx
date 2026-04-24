import React from 'react';
import { X, Clock, User, Calendar, AlertCircle, FileText, MessageSquare, CheckCircle } from 'lucide-react';
import ModalBase from '../../../components/ui/Modal.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatSecondsHuman, calcActiveSeconds } from '../utils/taskTimerUtils.js';
import { calculateRemainingTime, formatToIST } from '../utils/taskDeadlineUtils.js';

// Format time to IST 12-hour format
const formatToIST12Hour = (dateString) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '00:00 AM';
    }
    
    const timeStr = date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    
    if (!timeStr || timeStr.includes('NaN')) {
      return '00:00 AM';
    }
    
    const parts = timeStr.split(':');
    if (parts.length < 3) {
      return '00:00 AM';
    }
    
    const hours = parts[0].replace(/^0/, '') || '12';
    const minutes = parts[1];
    const secondsAndAmpm = parts[2];
    
    return `${hours}:${minutes}:${secondsAndAmpm}`;
  } catch (err) {
    console.warn('Error formatting time:', err);
    return '00:00 AM';
  }
};

// Format date to IST format
const formatToISTDate = (dateString) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '—';
    }
    
    const dateStr = date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    
    return dateStr;
  } catch (err) {
    console.warn('Error formatting date:', err);
    return '—';
  }
};

export default function TaskDetailsModal({ task, isOpen, onClose }) {
  if (!task) return null;

  // Calculate time metrics
  const activeSeconds = calcActiveSeconds(task);
  const remaining = calculateRemainingTime(task);
  const estimatedSeconds = (remaining.estimatedMinutes || 0) * 60;
  const isTimeExceeded = estimatedSeconds > 0 && activeSeconds > estimatedSeconds;
  const percentageUsed = estimatedSeconds > 0 ? Math.round((activeSeconds / estimatedSeconds) * 100) : 0;

  // Determine status color
  const getStatusColor = (status) => {
    const statusMap = {
      'completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
      'in-progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      'pending': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'overdue': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      'paused': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    };
    return statusMap[status] || 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  // Get assigned to names
  const assignedToNames = task.assignedTo && Array.isArray(task.assignedTo)
    ? task.assignedTo.map(a => a.name || a.userName || 'Unknown').join(', ')
    : 'Unassigned';

  // Get assigned by name
  const assignedByName = task.assignedBy
    ? (typeof task.assignedBy === 'string' ? task.assignedBy : (task.assignedBy.name || task.assignedBy.userName || 'Unknown'))
    : 'System';

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      size="lg"
    >
      <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-4">
        
        {/* Header Section - Task Title & Status */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex-1">
              {task.title}
            </h2>
            <div className="flex gap-2 flex-shrink-0">
              <PriorityBadge priority={task.priority} size="sm" />
              <StatusBadge status={task.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Task Description */}
        {task.description && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Description</h3>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {task.description}
              </p>
            </div>
          </div>
        )}

        {/* Assignment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assigned By */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Assigned By</h3>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
              <p className="text-purple-900 dark:text-purple-200 font-medium">
                {assignedByName}
              </p>
              {task.createdAt && (
                <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                  🕐 {formatToISTDate(task.createdAt)} at {formatToIST12Hour(task.createdAt)}
                </p>
              )}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Assigned To</h3>
            </div>
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700">
              <p className="text-indigo-900 dark:text-indigo-200 font-medium">
                {assignedToNames}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Start Time</h3>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
              <p className="text-green-900 dark:text-green-200 font-medium">
                {task.startedAt ? formatToIST12Hour(task.startedAt) : '—'}
              </p>
              {task.startedAt && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  📅 {formatToISTDate(task.startedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Due Date & Time</h3>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
              <p className="text-orange-900 dark:text-orange-200 font-medium">
                {task.dueAt ? formatToIST(task.dueAt) : 'No due date'}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                {remaining.remainingLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Time Tracking Information */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Time Tracking</h3>
          </div>
          
          <div className="space-y-3">
            {/* Estimated Time */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Estimated Time</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {remaining.estimatedLabel || formatSecondsHuman(estimatedSeconds)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Starts from actual started time
              </p>
            </div>

            {/* Worked Time */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Time Worked</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {remaining.activeWorkedLabel || formatSecondsHuman(activeSeconds)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Duration based on task activity
              </p>
            </div>

            {/* Progress Bar */}
            {estimatedSeconds > 0 && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Time Usage</span>
                  <span className={`font-bold ${isTimeExceeded ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {percentageUsed}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                  <div
                    className={`h-full ${isTimeExceeded ? 'bg-red-600' : percentageUsed >= 80 ? 'bg-orange-600' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                  />
                </div>
                {isTimeExceeded && (
                  <p className="text-xs text-red-700 dark:text-red-400 mt-2 font-semibold">
                    ⚠️ Exceeded by {formatSecondsHuman(activeSeconds - estimatedSeconds)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Remarks/Notes */}
        {(task.remarks || task.completionRemark || task.notes || task.completionNotes) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Remarks</h3>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700">
              <p className="text-teal-900 dark:text-teal-200 text-sm leading-relaxed">
                {task.completionRemark || task.completionNotes || task.remarks || task.notes}
              </p>
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Priority</span>
              <p className="text-slate-900 dark:text-white font-semibold capitalize mt-1">
                {task.priority || 'Normal'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Progress</span>
              <p className="text-slate-900 dark:text-white font-semibold mt-1">
                {task.progress || 0}%
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Estimated</span>
              <p className="text-slate-900 dark:text-white font-semibold mt-1">
                {remaining.estimatedLabel}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <p className="text-slate-900 dark:text-white font-semibold capitalize mt-1">
                {task.status}
              </p>
            </div>
          </div>
        </div>

      </div>
    </ModalBase>
  );
}
