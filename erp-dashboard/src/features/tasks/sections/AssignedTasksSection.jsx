import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, Clock, AlertCircle, FileText, Loader, RefreshCw,
  ChevronDown, ChevronUp, User, Eye, Trash2, Play, Pause, PauseCircle,
  Timer, Activity, BarChart3, MessageSquare, Calendar, Edit2,
} from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import { useAuthStore } from '../../../store/authStore.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import ModalBase from '../../../components/ui/Modal.jsx';
import TaskDetailsModal from '../TaskDetailsModal.jsx';
import TaskEditModal from '../modals/TaskEditModal.jsx';
import { useTaskRefresh } from '../context/TaskRefreshContext.jsx';
import { useTaskCountdown } from '../hooks/useTaskTimer.js';
import TimerChip from '../components/TimerChip.jsx';
import { calcActiveSeconds, calcPausedSeconds, formatSecondsHuman } from '../utils/taskTimerUtils.js';
import { formatToIST } from '../utils/taskDeadlineUtils.js';

export default function AssignedTasksSection() {
  const user = useAuthStore(s => s.user);
  const { refreshKey, triggerRefresh } = useTaskRefresh();
  const fetchInFlight = useRef(false);
  const [filter, setFilter] = useState('all');
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [extensionRejectModal, setExtensionRejectModal] = useState(null);
  const [extensionRejectionReason, setExtensionRejectionReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState({});

  // Helper function to sort tasks: running first, then newest
  const sortTasks = useCallback((tasks) => {
    return [...(tasks || [])].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  const fetchAssignedTasks = useCallback(async (showLoadingSpinner = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      console.log('🔄 [AssignedTasks] Starting fetch with filter:', filter);
      if (showLoadingSpinner) setLoading(true);
      
      const tasks = await taskService.getMyAssignedTasks({
        status: filter !== 'all' ? filter : undefined
      });
      
      console.log('✅ [AssignedTasks] Fetch successful');
      console.log('📋 [AssignedTasks] Retrieved assigned tasks count:', tasks?.length || 0);
      console.log('📊 [AssignedTasks] Tasks data:', tasks);
      
      if (!tasks || tasks.length === 0) {
        console.warn('⚠️ [AssignedTasks] No tasks returned from API');
      }
      
      // Sort: newest first (running tasks still bubble to top)
      const sorted = sortTasks(tasks);
      
      setAssignedTasks(sorted);
    } catch (error) {
      console.error('❌ [AssignedTasks] ERROR FETCHING TASKS');
      console.error('Error:', error);
      
      toast({ 
        title: 'Error loading assigned tasks', 
        message: error?.response?.data?.message || 'Failed to fetch assigned tasks',
        type: 'error' 
      });
    } finally {
      setLoading(false);
      fetchInFlight.current = false;
      console.log('✔️ [AssignedTasks] Fetch completed (loading set to false)');
    }
  }, [filter]);

  // Initial load + filter changes (show spinner)
  const prevFilter = useRef(filter);
  useEffect(() => {
    const filterChanged = prevFilter.current !== filter;
    prevFilter.current = filter;
    console.log('🎯 [AssignedTasks] useEffect triggered, filterChanged:', filterChanged);
    fetchAssignedTasks(filterChanged || assignedTasks.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, fetchAssignedTasks]);

  // Background re-fetch on global refresh
  useEffect(() => {
    if (refreshKey === 0) return;
    fetchAssignedTasks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Setup real-time socket listeners for task updates
  useEffect(() => {
    console.log('🔌 [AssignedTasks] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [AssignedTasks] Socket not available');
      return;
    }

    // Handle new task created – refresh list
    const handleTaskCreated = (data) => {
      console.log('📡 [AssignedTasks] task:created event received:', data);
      triggerRefresh();
    };

    // Handle task updated – patch in place
    const handleTaskUpdated = (data) => {
      console.log('📡 [AssignedTasks] task:updated event received:', data);
      if (!data?.task) return;
      setAssignedTasks(prev => {
        const exists = prev.some(t => t._id === data.task._id);
        const next = exists
          ? prev.map(t => t._id === data.task._id ? data.task : t)
          : [...prev, data.task];
        return sortTasks(next);
      });
      setSelectedTask(prev => prev?._id === data.task._id ? data.task : prev);
    };

    // Handle task status changed – patch in place
    const handleTaskStatusChanged = (data) => {
      console.log('📡 [AssignedTasks] task:status-changed event received:', data);
      if (!data?.task) return;
      setAssignedTasks(prev => sortTasks(prev.map(t => t._id === data.task._id ? data.task : t)));
      setSelectedTask(prev => prev?._id === data.task._id ? data.task : prev);
    };

    // Handle task deleted
    const handleTaskDeleted = (data) => {
      console.log('📡 [AssignedTasks] task:deleted event received:', data);
      setAssignedTasks(prev => prev.filter(t => t._id !== data.taskId));
      setSelectedTask(prev => prev?._id === data.taskId ? null : prev);
    };

    // Register socket listeners
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:status-changed', handleTaskStatusChanged);
    socket.on('task:deleted', handleTaskDeleted);

    // Cleanup: Remove listeners when component unmounts
    return () => {
      console.log('🔌 [AssignedTasks] Cleaning up socket listeners');
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:status-changed', handleTaskStatusChanged);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [sortTasks, triggerRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAssignedTasks(false);
    setRefreshing(false);
    toast({ title: 'Tasks refreshed', type: 'success' });
  };

  const filteredTasks = filter === 'all' 
    ? assignedTasks 
    : assignedTasks.filter(t => t.status === filter.toLowerCase());

  // Action handlers
  const handleDeleteTask = async (taskId) => {
    setDeleting(prev => ({ ...prev, [taskId]: true }));
    try {
      await taskService.deleteTask(taskId);
      setAssignedTasks(prev => prev.filter(t => t._id !== taskId));
      toast({ title: 'Task deleted successfully', type: 'success' });
      setDeleteConfirm(null);
      triggerRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({ title: 'Failed to delete task', message: err?.response?.data?.message || err.message, type: 'error' });
    } finally {
      setDeleting(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const getPendingExtensionRequest = (task) => {
    const requests = task.extensionRequests || [];
    const pending = requests.filter(r => r.approvalStatus === 'pending');
    return pending.length ? pending[pending.length - 1] : null;
  };

  const handleApproveExtension = async (task) => {
    const pending = getPendingExtensionRequest(task);
    if (!pending) {
      toast({ title: 'No pending extension request found', type: 'error' });
      return;
    }

    try {
      const updated = await taskService.approveTaskExtension(task._id, pending._id);
      setAssignedTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));
      setSelectedTask(prev => prev?._id === updated._id ? updated : prev);
      toast({ title: 'Extension Approved', message: 'Due time updated successfully.', type: 'success' });
      triggerRefresh();
    } catch (err) {
      toast({ title: 'Failed to approve extension', message: err?.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleOpenRejectExtension = (task) => {
    const pending = getPendingExtensionRequest(task);
    if (!pending) {
      toast({ title: 'No pending extension request found', type: 'error' });
      return;
    }
    setExtensionRejectionReason('');
    setExtensionRejectModal({ taskId: task._id, requestId: pending._id, title: task.title });
  };

  const handleRejectExtension = async () => {
    if (!extensionRejectModal) return;
    if (!extensionRejectionReason.trim()) {
      toast({ title: 'Rejection reason is required', type: 'error' });
      return;
    }

    try {
      const updated = await taskService.rejectTaskExtension(
        extensionRejectModal.taskId,
        extensionRejectModal.requestId,
        extensionRejectionReason.trim()
      );
      setAssignedTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));
      setSelectedTask(prev => prev?._id === updated._id ? updated : prev);
      toast({ title: 'Extension Rejected', type: 'warning' });
      setExtensionRejectModal(null);
      triggerRefresh();
    } catch (err) {
      toast({ title: 'Failed to reject extension', message: err?.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleUpdateTask = async (updatedData) => {
    try {
      const updated = await taskService.updateTask(editingTask._id, updatedData);
      setAssignedTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));
      setSelectedTask(prev => prev?._id === updated._id ? updated : prev);
      setEditingTask(null);
      toast({ title: 'Task Updated', message: 'Task details updated successfully', type: 'success' });
      triggerRefresh();
    } catch (err) {
      toast({ title: 'Failed to update task', message: err?.response?.data?.message || err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filter Buttons and Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {['all', 'pending', 'in-progress', 'extension_requested', 'completed', 'on-hold'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`
                px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300
                ${filter === status
                  ? 'bg-brand-accent text-slate-900 shadow-lg shadow-brand-accent/30 dark:shadow-brand-accent/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
            <p className="font-medium text-slate-600 dark:text-slate-400">Loading assigned tasks...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No assigned tasks</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You haven't assigned any tasks {filter !== 'all' ? `with status "${filter}"` : 'yet'}
            </p>
          </div>
        </Card>
      )}

      {/* Tasks List */}
      {!loading && filteredTasks.length > 0 && (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <AssignedTaskCard
              key={task._id}
              task={task}
              deleting={deleting[task._id]}
              onViewDetails={() => setSelectedTask(task)}
              onEdit={handleEditTask}
              onDelete={() => setDeleteConfirm(task._id)}
              onApproveExtension={() => handleApproveExtension(task)}
              onOpenRejectExtension={() => handleOpenRejectExtension(task)}
              getPendingExtensionRequest={getPendingExtensionRequest}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && filteredTasks.length > 0 && (
        <Card className="p-4 bg-brand-accent/5 border border-brand-accent/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Showing {filteredTasks.length} of {assignedTasks.length} task{assignedTasks.length !== 1 ? 's' : ''}
            </span>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {assignedTasks.filter(t => t.status === 'completed').length} completed
            </div>
          </div>
        </Card>
      )}
      {/* View Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Edit modal - Assignee can edit their tasks */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
        />
      )}

      {extensionRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setExtensionRejectModal(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Extension</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Provide a reason for rejecting extension request on "{extensionRejectModal.title}".
            </p>
            <textarea
              rows={4}
              value={extensionRejectionReason}
              onChange={(e) => setExtensionRejectionReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              placeholder="Rejection reason"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setExtensionRejectModal(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectExtension}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ModalBase
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Task"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                disabled={deleting[deleteConfirm]}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting[deleteConfirm] ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

// ─── Priority/border helpers ────────────────────────────────────────────────
const PRIORITY_BORDER = {
  URGENT: 'border-l-red-500',
  HIGH:   'border-l-orange-400',
  MEDIUM: 'border-l-amber-400',
  LOW:    'border-l-blue-400',
};

const PRIORITY_BADGE = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LOW:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

// ─── Manager insight card (sub-component so hooks work per-card) ─────────────
function AssignedTaskCard({
  task,
  deleting,
  onViewDetails,
  onEdit,
  onDelete,
  onApproveExtension,
  onOpenRejectExtension,
  getPendingExtensionRequest,
}) {
  const [expanded, setExpanded] = useState(false);
  const countdown = useTaskCountdown(task);

  const activeSeconds = calcActiveSeconds(task);
  const pausedSeconds = calcPausedSeconds(task);
  const pendingExt = getPendingExtensionRequest(task);

  const lastPauseReason = task.pauseEntries?.length > 0
    ? task.pauseEntries[task.pauseEntries.length - 1]?.reason
    : null;

  // Derive human-readable current state
  const getState = () => {
    if (task.isRunning)              return { label: 'Working',     dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-50 dark:bg-blue-900/20' };
    if (task.isPaused || task.status === 'paused')
                                     return { label: 'Paused',      dot: 'bg-orange-400',  text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    if (task.status === 'on-hold')   return { label: 'On Hold',     dot: 'bg-slate-500',   text: 'text-slate-700 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-slate-700/50' };
    if (task.status === 'completed') return { label: 'Completed',   dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (task.status === 'pending')   return { label: 'Not Started', dot: 'bg-amber-400',   text: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-900/20' };
    if (task.status === 'overdue')   return { label: 'Overdue',     dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-300',       bg: 'bg-red-50 dark:bg-red-900/20' };
    return { label: task.status,  dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700/50' };
  };
  const state = getState();

  const assigneeNames = Array.isArray(task.assignedTo)
    ? task.assignedTo.map(a => a?.name || 'Unknown').join(', ')
    : (task.assignedTo?.name || 'Unknown');

  const effectiveDue = task.dueAt || task.dueDate;
  const isOverdueTask = task.status !== 'completed' && effectiveDue && new Date(effectiveDue) < new Date();

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-l-4 ${PRIORITY_BORDER[task.priority] || 'border-l-slate-300'}`}
    >
      {/* ── Card Body ── */}
      <div className="p-5">
        {/* Top row: priority + state chip + live timer */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.MEDIUM}`}>
              {task.priority}
            </span>
            {/* State chip */}
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${state.bg} ${state.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${state.dot} ${task.isRunning ? 'animate-pulse' : ''}`} />
              {state.label}
            </span>
            {pendingExt && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                Extension Pending
              </span>
            )}
          </div>
          {/* Live timer chip for running tasks */}
          {task.isRunning && countdown.shouldTrack && (
            <TimerChip countdown={countdown} task={task} size="sm" />
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 leading-snug">
          {task.title}
        </h3>

        {/* Assignee */}
        <div className="flex items-center gap-1.5 mb-3">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{assigneeNames}</span>
          </span>
        </div>

        {/* ── Insight row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <InsightTile icon={<Timer className="w-3 h-3" />} label="Active" value={activeSeconds > 0 ? formatSecondsHuman(activeSeconds) : '—'} color="blue" />
          <InsightTile icon={<PauseCircle className="w-3 h-3" />} label="Paused" value={pausedSeconds > 0 ? formatSecondsHuman(pausedSeconds) : '—'} color="orange" />
          <InsightTile icon={<Activity className="w-3 h-3" />} label="Pauses" value={task.pauseEntries?.length || 0} color="slate" />
          <InsightTile icon={<BarChart3 className="w-3 h-3" />} label="Progress" value={`${task.progress || 0}%`} color="purple" />
        </div>

        {/* State-specific details */}
        {(task.isPaused || task.status === 'paused') && lastPauseReason && (
          <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 mb-3">
            <Pause className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
            <span className="text-xs text-orange-700 dark:text-orange-300">
              Paused: <span className="font-semibold">&ldquo;{lastPauseReason}&rdquo;</span>
            </span>
          </div>
        )}

        {task.status === 'on-hold' && lastPauseReason && (
          <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 mb-3">
            <PauseCircle className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              On hold: <span className="font-semibold">&ldquo;{lastPauseReason}&rdquo;</span>
            </span>
          </div>
        )}

        {task.status === 'completed' && (
          <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 mb-3">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              Completed {task.completedAt ? formatToIST(task.completedAt) : ''}
              {task.completionRemarks && (
                <span className="block mt-0.5 text-emerald-600 dark:text-emerald-400">
                  &ldquo;{task.completionRemarks}&rdquo;
                </span>
              )}
            </span>
          </div>
        )}

        {/* Due date row */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-3">
          <span className={`flex items-center gap-1 ${isOverdueTask ? 'text-red-500 dark:text-red-400 font-semibold' : ''}`}>
            <Calendar className="w-3 h-3" />
            {effectiveDue ? `Due: ${formatToIST(effectiveDue)}` : 'No due date'}
            {isOverdueTask && ' · OVERDUE'}
          </span>
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Extension request banner */}
        {pendingExt && (
          <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20 mb-3">
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
              Extension Request — +{pendingExt.requestedTimeMinutes} min
            </p>
            {pendingExt.requestRemarks && (
              <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-2">&ldquo;{pendingExt.requestRemarks}&rdquo;</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onApproveExtension(); }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
              >
                Approve
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenRejectExtension(); }}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View Details
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 text-sm font-semibold transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}

          <button
            onClick={() => setExpanded(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors ml-auto"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Less' : 'More'}
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* ── Expanded: pause history + description + tags ── */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {task.description && (
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{task.description}</p>
              </div>
            )}

            {task.pauseEntries?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Pause History ({task.pauseEntries.length})
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {task.pauseEntries.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span>
                        {entry.pausedAt ? new Date(entry.pausedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                        {entry.reason && <span className="text-slate-700 dark:text-slate-300 font-medium"> · &ldquo;{entry.reason}&rdquo;</span>}
                        {entry.resumedAt && (
                          <span className="text-emerald-500 ml-1">
                            → resumed {new Date(entry.resumedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Created {formatToIST(task.createdAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tiny insight tile ───────────────────────────────────────────────────────
function InsightTile({ icon, label, value, color }) {
  const colorMap = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
    slate:  'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400',
  };
  return (
    <div className={`rounded-xl px-2.5 py-2 ${colorMap[color] || colorMap.slate}`}>
      <div className="flex items-center gap-1 mb-0.5 opacity-70">{icon}<span className="text-[10px] font-semibold">{label}</span></div>
      <p className="text-sm font-bold leading-none">{value}</p>
    </div>
  );
}
