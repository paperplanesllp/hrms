import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Eye, CheckCircle2, AlertCircle, Loader, RefreshCw,
  Search, X, Play, Pause, RotateCcw, BarChart3, Edit2, Trash2, Calendar,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import TaskDetailsModal from '../TaskDetailsModal.jsx';
import TaskTimerCard from '../components/TaskTimerCard.jsx';
import PauseTaskModal from '../components/PauseTaskModal.jsx';
import OnHoldModal from '../components/OnHoldModal.jsx';
import { formatSecondsHuman } from '../utils/taskTimerUtils.js';
import { useTaskRefresh } from '../context/TaskRefreshContext.jsx';

// Helper function to get dates with offset
const getDateWithOffset = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export default function MyTasksSection() {
  const { refreshKey, triggerRefresh } = useTaskRefresh();
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(getDateWithOffset(0));
  const [search, setSearch] = useState('');
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [pauseModal, setPauseModal] = useState(null);     // { _id, title }
  const [holdModal, setHoldModal] = useState(null);        // { _id, title }
  const [completeModal, setCompleteModal] = useState(null); // { _id, title }
  const [extensionModal, setExtensionModal] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [additionalTime, setAdditionalTime] = useState('30');
  const [timeUnit, setTimeUnit] = useState('minutes');
  const [extensionRemarks, setExtensionRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [completionRemark, setCompletionRemark] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState({});

  // Track whether a fetch is already in flight to prevent duplicate calls
  const fetchInFlight = useRef(false);

  // Helper function to sort tasks: running first, then newest
  const sortTasks = useCallback((tasks) => {
    return [...(tasks || [])].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  /**
   * Update a single task in the list and keep selectedTask in sync.
   * Used by both local mutations and socket events.
   */
  const updateTaskInList = useCallback((updatedTask) => {
    setMyTasks(prev => {
      const exists = prev.some(t => t._id === updatedTask._id);
      const next = exists
        ? prev.map(t => t._id === updatedTask._id ? updatedTask : t)
        : [...prev, updatedTask];
      return sortTasks(next);
    });
    // Keep open detail modal in sync
    setSelectedTask(prev => prev?._id === updatedTask._id ? updatedTask : prev);
  }, [sortTasks]);

  const fetchMyTasks = useCallback(async (showLoadingSpinner = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      console.log('🔄 [MyTasks] Starting fetch with filter:', filter);
      if (showLoadingSpinner) setLoading(true);
      
      // Send filter directly to the API; 'all' = no status filter, 'daily' is client-side only
      // Paused tasks use status='paused', on-hold uses status='on-hold'
      const apiStatus = (filter !== 'all' && filter !== 'daily') ? filter : undefined;
      const tasks = await taskService.getMyTasks({ status: apiStatus });
      
      // Sort: newest first (running tasks still bubble to top)
      const sorted = sortTasks(tasks);
      setMyTasks(sorted);
      // Sync selectedTask to latest server data
      setSelectedTask(prev => {
        if (!prev) return prev;
        const fresh = sorted.find(t => t._id === prev._id);
        return fresh || prev;
      });
    } catch (error) {
      console.error('❌ [MyTasks] ERROR FETCHING TASKS');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      console.error('Full stack:', error?.stack);
      
      toast({ 
        title: 'Error loading tasks', 
        message: error?.response?.data?.message || 'Failed to fetch your tasks',
        type: 'error' 
      });
    } finally {
      setLoading(false);
      fetchInFlight.current = false;
      console.log('✔️ [MyTasks] Fetch completed (loading set to false)');
    }
  }, [filter, sortTasks]);

  // Initial load and filter changes show the loading spinner
  const prevFilter = useRef(filter);
  useEffect(() => {
    const filterChanged = prevFilter.current !== filter;
    prevFilter.current = filter;
    console.log('🎯 [MyTasks] useEffect triggered, filterChanged:', filterChanged);
    fetchMyTasks(filterChanged || myTasks.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, fetchMyTasks]);

  // Background re-fetch when global refreshKey changes (no spinner)
  useEffect(() => {
    if (refreshKey === 0) return; // skip initial mount
    fetchMyTasks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Setup real-time socket listeners for task updates
  useEffect(() => {
    console.log('🔌 [MyTasks] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [MyTasks] Socket not available');
      return;
    }

    // Handle new task created – refresh list so newly assigned task appears
    const handleTaskCreated = (data) => {
      console.log('📡 [MyTasks] task:created event received:', data);
      triggerRefresh();
    };

    // Handle task updated – patch in place + keep modal in sync
    const handleTaskUpdated = (data) => {
      console.log('📡 [MyTasks] task:updated event received:', data);
      if (data?.task) {
        updateTaskInList(data.task);
      }
    };

    // Handle task status changed – patch in place + keep modal in sync
    const handleTaskStatusChanged = (data) => {
      console.log('📡 [MyTasks] task:status-changed event received:', data);
      if (data?.task) {
        updateTaskInList(data.task);
      }
    };

    // Handle task deleted – remove from list and close modal if open
    const handleTaskDeleted = (data) => {
      console.log('📡 [MyTasks] task:deleted event received:', data);
      setMyTasks(prev => prev.filter(t => t._id !== data.taskId));
      setSelectedTask(prev => prev?._id === data.taskId ? null : prev);
    };

    // Register socket listeners
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:status-changed', handleTaskStatusChanged);
    socket.on('task:deleted', handleTaskDeleted);

    // Cleanup: Remove listeners when component unmounts
    return () => {
      console.log('🔌 [MyTasks] Cleaning up socket listeners');
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:status-changed', handleTaskStatusChanged);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [updateTaskInList, triggerRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyTasks(false);
    setRefreshing(false);
    toast({ title: 'Tasks refreshed', type: 'success' });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(taskId, newStatus);
      updateTaskInList(updatedTask);
      toast({ title: `Task marked as ${newStatus}`, type: 'success' });
      triggerRefresh(); // update overview counters
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({ 
        title: 'Error updating status', 
        message: error?.response?.data?.message || 'Failed to update task status',
        type: 'error' 
      });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setSelectedTask(null);
  };

  const handleUpdateTask = async (formData) => {
    if (!editingTask) return;

    setSubmittingEdit(true);
    try {
      console.log('🔧 Updating task:', editingTask._id, formData);
      const updated = await taskService.updateTask(editingTask._id, formData);
      updateTaskInList(updated);
      toast({ title: 'Task updated successfully', type: 'success' });
      setEditingTask(null);
      triggerRefresh();
    } catch (error) {
      console.error('❌ Error updating task:', error);
      toast({
        title: 'Failed to update task',
        message: error?.response?.data?.message || error?.message || 'Unable to update task',
        type: 'error'
      });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setDeleting(prev => ({ ...prev, [taskId]: true }));
    try {
      await taskService.deleteTask(taskId);
      setMyTasks(prev => prev.filter(t => t._id !== taskId));
      setSelectedTask(prev => prev?._id === taskId ? null : prev);
      toast({ title: 'Task deleted successfully', type: 'success' });
      setDeleteConfirm(null);
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ 
        title: 'Error deleting task', 
        message: error?.response?.data?.message || 'Failed to delete task',
        type: 'error' 
      });
    } finally {
      setDeleting(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // ─── Timer action handlers ─────────────────────────────────────────────────

  const handleStartTask = async (taskId) => {
    setActionLoading(taskId);
    try {
      const updated = await taskService.startTask(taskId);
      updateTaskInList(updated);
      toast({ title: 'Task Started ▶', message: 'Timer is now running', type: 'success' });
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Failed to start task',
        message: error?.response?.data?.message || 'Unable to start task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseRequest = (task) => {
    setPauseModal({ _id: task._id, title: task.title });
  };

  const handlePauseConfirm = async (reason) => {
    if (!pauseModal) return;
    const { _id } = pauseModal;
    setPauseModal(null);
    setActionLoading(_id);
    try {
      const updated = await taskService.pauseTask(_id, reason);
      updateTaskInList(updated);
      toast({ title: 'Task Paused ⏸', message: `Logged: "${reason}"`, type: 'warning' });
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Failed to pause task',
        message: error?.response?.data?.message || 'Unable to pause task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeTask = async (taskId) => {
    setActionLoading(taskId);
    try {
      const updated = await taskService.resumeTask(taskId);
      updateTaskInList(updated);
      toast({ title: 'Task Resumed ▶', message: 'Timer is running again', type: 'success' });
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Failed to resume task',
        message: error?.response?.data?.message || 'Unable to resume task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleHoldRequest = (task) => {
    setHoldModal({ _id: task._id, title: task.title });
  };

  const handleHoldConfirm = async (reason) => {
    if (!holdModal) return;
    const { _id } = holdModal;
    setHoldModal(null);
    setActionLoading(_id);
    try {
      const updated = await taskService.holdTask(_id, reason);
      updateTaskInList(updated);
      toast({ title: 'Task On Hold ⏸', message: `Reason logged: "${reason}"`, type: 'warning' });
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Failed to put task on hold',
        message: error?.response?.data?.message || 'Unable to hold task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeFromHold = async (taskId) => {
    setActionLoading(taskId);
    try {
      const updated = await taskService.resumeTaskFromHold(taskId);
      updateTaskInList(updated);
      toast({ title: 'Resumed from Hold ▶', message: 'Task is back in progress', type: 'success' });
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Failed to resume from hold',
        message: error?.response?.data?.message || 'Unable to resume task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteRequest = (task) => {
    setCompletionRemark('');
    setCompleteModal({ _id: task._id, title: task.title });
  };

  const handleRequestMoreTime = (task) => {
    setAdditionalTime('30');
    setTimeUnit('minutes');
    setExtensionRemarks('');
    setExtensionModal({ _id: task._id, title: task.title });
  };

  const handleRejectTaskRequest = (task) => {
    setRejectionReason('');
    setRejectionModal({ _id: task._id, title: task.title });
  };

  const submitExtensionRequest = async () => {
    if (!extensionModal) return;
    if (!extensionRemarks.trim()) {
      toast({ title: 'Remarks are required', type: 'error' });
      return;
    }

    setActionLoading(extensionModal._id);
    try {
      const updated = await taskService.requestTaskExtension(extensionModal._id, {
        additionalTime: Number(additionalTime),
        unit: timeUnit,
        remarks: extensionRemarks.trim(),
      });

      updateTaskInList(updated);
      toast({ title: 'Extension Request Sent', message: 'Your manager will review this extension request.', type: 'success' });
      setExtensionModal(null);
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Extension failed',
        message: error?.response?.data?.message || 'Unable to extend task time',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const submitTaskRejection = async () => {
    if (!rejectionModal) return;
    if (!rejectionReason.trim()) {
      toast({ title: 'Rejection reason is required', type: 'error' });
      return;
    }

    setActionLoading(rejectionModal._id);
    try {
      const updated = await taskService.rejectTask(rejectionModal._id, rejectionReason.trim());
      updateTaskInList(updated);
      toast({ title: 'Task rejected', message: 'Task was marked as rejected.', type: 'warning' });
      setRejectionModal(null);
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Reject failed',
        message: error?.response?.data?.message || 'Unable to reject task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteConfirm = async () => {
    if (!completeModal) return;
    
    // Validate that a remark is provided and meets minimum length
    if (!completionRemark.trim() || completionRemark.trim().length < 25) {
      toast({ title: 'Remark incomplete', message: 'Completion remark must be at least 25 characters', type: 'error' });
      return;
    }
    
    const { _id } = completeModal;
    setCompleteModal(null);
    setActionLoading(_id);
    try {
      const updated = await taskService.completeTask(_id, completionRemark);
      updateTaskInList(updated);
      setCompletionRemark('');
      toast({ title: 'Task Completed ✓', message: 'Great work! Task marked as done.', type: 'success' });
      triggerRefresh();
    } catch (error) {
      toast({
        title: 'Failed to complete task',
        message: error?.response?.data?.message || 'Unable to complete task',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Stats & filtered list ─────────────────────────────────────────────────

  const stats = useMemo(() => {
    const running   = myTasks.filter(t => t.isRunning).length;
    const paused    = myTasks.filter(t => t.isPaused).length;
    const completed = myTasks.filter(t => t.status === 'completed').length;
    const totalActiveSeconds = myTasks.reduce((acc, t) => acc + (t.totalActiveTimeInSeconds || 0), 0);
    return { total: myTasks.length, running, paused, completed, totalActiveSeconds };
  }, [myTasks]);

  const filteredTasks = useMemo(() => {
    let tasks = myTasks;
    
    // Get date range for any given date
    const getDateRange = (dateString) => {
      const date = new Date(dateString);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { start, end };
    };
    
    if (filter === 'daily') {
      // Show tasks for the selected date (dateFilter)
      const { start, end } = getDateRange(dateFilter);
      tasks = tasks.filter(t => {
        if (t.dueDate) {
          const taskDate = new Date(t.dueDate);
          return taskDate >= start && taskDate <= end;
        }
        if (t.createdAt) {
          const taskDate = new Date(t.createdAt);
          return taskDate >= start && taskDate <= end;
        }
        return false;
      });
    } else if (filter !== 'all') {
      tasks = tasks.filter(t => {
        if (filter === 'paused') return t.isPaused || t.status === 'paused';
        if (filter === 'on-hold') return t.status === 'on-hold';
        return t.status === filter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      );
    }
    return tasks;
  }, [myTasks, filter, search, dateFilter]);

  const FILTER_OPTIONS = [
    { value: 'all',         label: 'All' },
    { value: 'daily',       label: 'Daily Task' },
    { value: 'paused',      label: 'Paused' },
    { value: 'on-hold',     label: 'On Hold' },
    { value: 'completed',   label: 'Completed' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Analytics Summary Bar */}
      {myTasks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Tasks"    value={stats.total}         color="slate" />
          <StatCard label="Running"         value={stats.running}       color="blue"    glow={stats.running > 0} />
          <StatCard label="Paused"          value={stats.paused}        color="orange" />
          <StatCard label="Active Time"     value={formatSecondsHuman(stats.totalActiveSeconds)} color="purple" isText />
        </div>
      )}

      {/* Search + Filter + Refresh row */}
      <div className="flex flex-col gap-3 flex-wrap">
        {/* Search + Calendar shortcuts in one row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex gap-2 flex-wrap">
            {/* Calendar Date Picker */}
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setFilter('daily'); // Auto-select Daily Task filter
                }}
                className="px-3 py-2.5 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold cursor-pointer hover:border-brand-accent dark:hover:border-brand-accent transition-colors"
                title="Pick any date"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter buttons + Refresh in second row */}
        <div className="flex flex-wrap gap-2 items-center">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                filter === opt.value
                  ? 'bg-brand-accent text-slate-900 shadow-lg shadow-brand-accent/30 dark:shadow-brand-accent/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
            <p className="font-medium text-slate-600 dark:text-slate-400">Loading your tasks...</p>
          </div>
        </Card>
      )}

      {/* Empty */}
      {!loading && filteredTasks.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {search ? 'No tasks match your search' : 'No tasks found'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {search
                ? `No tasks match "${search}"`
                : 'No tasks with the selected filter.'}
            </p>
          </div>
        </Card>
      )}

      {/* Task Cards Grid */}
      {!loading && filteredTasks.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTasks.map(task => (
            <TaskTimerCard
              key={task._id}
              task={task}
              onStart={handleStartTask}
              onPause={handlePauseRequest}
              onResume={handleResumeTask}
              onHold={handleHoldRequest}
              onResumeHold={handleResumeFromHold}
              onComplete={handleCompleteRequest}
              onViewDetails={setSelectedTask}
              onRequestMoreTime={handleRequestMoreTime}
              onEdit={(t) => setEditingTask({ ...t })}
              onDelete={(t) => setDeleteConfirm(t)}
              loadingAction={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Result count */}
      {!loading && myTasks.length > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Showing {filteredTasks.length} of {myTasks.length} tasks
        </p>
      )}

      {/* ── Modals ── */}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Task"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Are you sure you want to delete this task?</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-bold">&ldquo;{deleteConfirm.title}&rdquo;</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirm._id)}
                disabled={deleting[deleteConfirm._id]}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting[deleteConfirm._id] ? <><Loader className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Task</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <Modal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title="Update Task"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editingTask.title || ''}
                onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</label>
              <textarea
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Priority</label>
              <select
                value={editingTask.priority || 'MEDIUM'}
                onChange={(e) => setEditingTask(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">⚠ Due date and time fields cannot be changed. Request an extension if needed.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTask(editingTask)}
                disabled={submittingEdit}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingEdit ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Edit2 className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pause Modal */}
      {pauseModal && (
        <PauseTaskModal
          task={pauseModal}
          isOpen={!!pauseModal}
          onClose={() => setPauseModal(null)}
          onPause={(taskId, reason) => handlePauseConfirm(reason)}
        />
      )}

      {/* On Hold Modal */}
      {holdModal && (
        <OnHoldModal
          task={holdModal}
          isOpen={!!holdModal}
          onClose={() => setHoldModal(null)}
          onHold={(taskId, reason) => handleHoldConfirm(reason)}
        />
      )}

      {/* Complete Confirmation Modal */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCompleteModal(null)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
              Complete Task?
            </h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-4">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                &ldquo;{completeModal.title}&rdquo;
              </span>{' '}
              will be marked as completed and the timer will stop.
            </p>
            
            {/* Completion Remark Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Completion Remark <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                  (Minimum 25 characters)
                </span>
              </label>
              <textarea
                value={completionRemark}
                onChange={(e) => setCompletionRemark(e.target.value)}
                placeholder="Describe what was accomplished, any challenges, and key outcomes... (minimum 25 characters)"
                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
                rows="3"
              />
              <div className="flex justify-between mt-2">
                <div>
                  {!completionRemark.trim() && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Remark is required to complete the task</p>
                  )}
                  {completionRemark.trim() && completionRemark.trim().length < 25 && (
                    <p className="text-xs text-red-600 dark:text-red-400">Must be at least 25 characters ({completionRemark.trim().length}/25)</p>
                  )}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {completionRemark.length}/5000
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setCompleteModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteConfirm}
                disabled={!completionRemark.trim() || completionRemark.trim().length < 25}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Complete ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Extension Modal */}
      {extensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setExtensionModal(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Extension</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Task Overdue: "{extensionModal.title}" is now overdue. Do you want to request more time?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="1"
                value={additionalTime}
                onChange={(e) => setAdditionalTime(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>

            <textarea
              rows={3}
              placeholder="Remarks (mandatory)"
              value={extensionRemarks}
              onChange={(e) => setExtensionRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setExtensionModal(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={submitExtensionRequest}
                className="flex-1 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRejectionModal(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Task</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Provide a rejection reason for "{rejectionModal.title}".
            </p>

            <textarea
              rows={4}
              placeholder="Rejection reason (mandatory)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRejectionModal(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={submitTaskRejection}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Reject Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, color, glow, isText }) {
  const colorMap = {
    slate:  'bg-slate-50  dark:bg-slate-700/50  text-slate-700  dark:text-slate-300',
    blue:   'bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    emerald:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  };
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${colorMap[color] || colorMap.slate} ${
        glow ? 'ring-1 ring-blue-300 dark:ring-blue-700' : ''
      }`}
    >
      <p className="text-xs font-semibold opacity-70 mb-0.5">{label}</p>
      <p className={`font-bold leading-tight ${isText ? 'text-sm' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
