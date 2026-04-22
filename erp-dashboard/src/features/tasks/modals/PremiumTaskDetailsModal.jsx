import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  Lock,
  Eye,
  RotateCcw,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Info,
  Copy,
  Download,
  Share2
} from 'lucide-react';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import {
  formatDuration,
  getExecutionStatusStyle,
  getDueHealthStyle,
  formatRelativeTime,
  isOverdue,
  getDaysUntilDue
} from '../utils/taskExecutionUtils.js';
import { taskService } from '../taskService.js';

export default function PremiumTaskDetailsModal({
  task,
  isOpen,
  onClose,
  onExecutionAction,
  isLoading = false
}) {
  const [executionDetails, setExecutionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [pauseReason, setPauseReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    if (isOpen && task) {
      fetchExecutionDetails();
    }
  }, [isOpen, task?._id]);

  const fetchExecutionDetails = async () => {
    try {
      setLoadingDetails(true);
      setError(null);
      const details = await taskService.getExecutionDetails(task._id);
      setExecutionDetails(details);
      // Also fetch full timeline
      const tl = await taskService.getTaskTimeline(task._id);
      setTimelineData(tl?.timeline || []);
    } catch (err) {
      console.error('Error fetching execution details:', err);
      setError(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!isOpen || !task) return null;

  const executionStyle = getExecutionStatusStyle(task.executionStatus);
  const dueHealthStyle = getDueHealthStyle(task.dueHealth);
  const isOverdueTask = isOverdue(task.dueDate, task.executionStatus);
  const daysUntilDue = getDaysUntilDue(task.dueDate);

  const handleExecutionAction = async (action, payload = {}) => {
    try {
      await onExecutionAction(action, task._id, payload);
      // Refresh details after action
      await fetchExecutionDetails();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Execution Status</p>
              <div
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border ${
                  executionStyle.textColor
                } ${executionStyle.bgColor} ${executionStyle.borderColor} ${executionStyle.darkBg} ${
                  executionStyle.darkText
                }`}
              >
                <span className="text-lg">{executionStyle.icon}</span>
                {executionStyle.label}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Due Health</p>
              <div
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border ${
                  dueHealthStyle.textColor
                } ${dueHealthStyle.bgColor} ${dueHealthStyle.borderColor} ${dueHealthStyle.darkBg} ${
                  dueHealthStyle.darkText
                }`}
              >
                <span className="text-lg">{dueHealthStyle.icon}</span>
                {dueHealthStyle.label}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} />
              Execution Progress
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {/* Total Active */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Active Time</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {formatDuration(task.totalActiveMinutes)}
                </p>
              </div>

              {/* Total Paused */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Paused Time</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                  {formatDuration(task.totalPausedMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={20} />
              Timeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {task.startedAt && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Started At</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    {new Date(task.startedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    {formatRelativeTime(task.startedAt)}
                  </p>
                </div>
              )}

              <div className={`p-3 rounded-lg border ${
                isOverdueTask
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
                <p className={`text-xs mb-1 ${
                  isOverdueTask
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>
                  Due Date
                </p>
                <p className={`text-sm font-medium ${
                  isOverdueTask
                    ? 'text-red-900 dark:text-red-200'
                    : 'text-green-900 dark:text-green-200'
                }`}>
                  {new Date(task.dueDate).toLocaleString()}
                </p>
                <p className={`text-xs mt-1 ${
                  isOverdueTask
                    ? 'text-red-600 dark:text-red-300'
                    : 'text-green-600 dark:text-green-300'
                }`}>
                  {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days remaining`}
                </p>
              </div>

              {task.completedAt && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-400 mb-1">Completed At</p>
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">
                    {new Date(task.completedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                    {formatRelativeTime(task.completedAt)}
                  </p>
                </div>
              )}

              {task.lastActivityAt && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Last Activity</p>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                    {formatRelativeTime(task.lastActivityAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Assignees */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={20} />
                Assigned To
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {task.assignedTo.map((user) => (
                  <div
                    key={user._id}
                    className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3"
                  >
                    {user.avatar && <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />}
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {task.activityLog && task.activityLog.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} />
                Activity Timeline
              </h3>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <ActivityTimeline activityLog={task.activityLog} timeline={timelineData} />
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={20} />
                Description
              </h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Close
          </button>

          {/* Execution Actions */}
          {task.executionStatus === 'not_started' && (
            <>
              <button
                onClick={() => handleExecutionAction('start')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                <Play size={16} />
                Start Task
              </button>
              <button
                onClick={() => setShowBlockDialog(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
              >
                <Lock size={16} />
                Block
              </button>
            </>
          )}

          {task.executionStatus === 'in_progress' && (
            <>
              <button
                onClick={() => setShowPauseDialog(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors font-medium"
              >
                <Pause size={16} />
                Pause
              </button>
              <button
                onClick={() => handleExecutionAction('complete')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                <CheckCircle2 size={16} />
                Complete
              </button>
            </>
          )}

          {task.executionStatus === 'paused' && (
            <>
              <button
                onClick={() => handleExecutionAction('resume')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                <Play size={16} />
                Resume
              </button>
              <button
                onClick={() => handleExecutionAction('complete')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                <CheckCircle2 size={16} />
                Complete
              </button>
            </>
          )}

          {(task.executionStatus === 'completed' || task.executionStatus === 'completed_late') && (
            <button
              onClick={() => setShowReopenDialog(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium"
            >
              <RotateCcw size={16} />
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Pause Dialog */}
      {showPauseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pause Task</h3>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Why are you pausing?"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white resize-none"
              rows="3"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPauseDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleExecutionAction('pause', { reason: pauseReason });
                  setShowPauseDialog(false);
                  setPauseReason('');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 transition-colors font-medium"
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Dialog */}
      {showBlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Block Task</h3>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="What is blocking this task?"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white resize-none"
              rows="3"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowBlockDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleExecutionAction('block', { reason: blockReason });
                  setShowBlockDialog(false);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Dialog */}
      {showReopenDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Reopen Task</h3>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Why are you reopening this task?"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white resize-none"
              rows="3"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReopenDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleExecutionAction('reopen', { reason: reopenReason });
                  setShowReopenDialog(false);
                  setReopenReason('');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors font-medium"
              >
                Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
