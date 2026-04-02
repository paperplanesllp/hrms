import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, CheckCircle2, AlertCircle, Loader, RefreshCw,
  Search, X, Play, Pause, RotateCcw, BarChart3,
} from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import TaskDetailsModal from '../TaskDetailsModal.jsx';
import TaskTimerCard from '../components/TaskTimerCard.jsx';
import PauseReasonModal from '../components/PauseReasonModal.jsx';
import { formatSecondsHuman } from '../utils/taskTimerUtils.js';

export default function MyTasksSection() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [pauseModal, setPauseModal] = useState(null);     // { _id, title }
  const [completeModal, setCompleteModal] = useState(null); // { _id, title }

  const fetchMyTasks = useCallback(async () => {
    try {
      console.log('🔄 [MyTasks] Starting fetch with filter:', filter);
      setLoading(true);
      
      // Map 'paused' UI filter to 'on-hold' status (how it's stored in DB)
      const apiStatus = filter === 'paused' ? 'on-hold' : (filter !== 'all' ? filter : undefined);
      const tasks = await taskService.getMyTasks({ status: apiStatus });
      
      // Sort: newest first (running tasks still bubble to top)
      const sorted = [...(tasks || [])].sort((a, b) => {
        if (a.isRunning && !b.isRunning) return -1;
        if (!a.isRunning && b.isRunning) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setMyTasks(sorted);
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
      console.log('✔️ [MyTasks] Fetch completed (loading set to false)');
    }
  }, [filter]);

  // Fetch tasks on component mount and when filter changes
  useEffect(() => {
    console.log('🎯 [MyTasks] useEffect triggered');
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Setup real-time socket listeners for task updates
  useEffect(() => {
    console.log('🔌 [MyTasks] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [MyTasks] Socket not available');
      return;
    }

    // Handle new task created
    const handleTaskCreated = (data) => {
      console.log('📡 [MyTasks] task:created event received:', data);
      // Refresh tasks to include the new one
      setTimeout(() => fetchMyTasks(), 500);
      toast({ 
        title: 'New Task', 
        message: `New task assigned: ${data.task?.title}`,
        type: 'info' 
      });
    };

    // Handle task updated
    const handleTaskUpdated = (data) => {
      console.log('📡 [MyTasks] task:updated event received:', data);
      setMyTasks(prev => {
        const exists = prev.some(t => t._id === data.task._id);
        if (exists) {
          return prev.map(t => t._id === data.task._id ? data.task : t);
        }
        return [...prev, data.task];
      });
      toast({ 
        title: 'Task Updated', 
        message: `Task updated: ${data.task?.title}`,
        type: 'success' 
      });
    };

    // Handle task status changed
    const handleTaskStatusChanged = (data) => {
      console.log('📡 [MyTasks] task:status-changed event received:', data);
      setMyTasks(prev => prev.map(t => t._id === data.task._id ? data.task : t));
      toast({ 
        title: 'Status Updated', 
        message: `Task status: ${data.task?.status}`,
        type: 'success' 
      });
    };

    // Handle task deleted
    const handleTaskDeleted = (data) => {
      console.log('📡 [MyTasks] task:deleted event received:', data);
      setMyTasks(prev => prev.filter(t => t._id !== data.taskId));
      toast({ 
        title: 'Task Deleted', 
        message: `Task removed: ${data.message}`,
        type: 'warning' 
      });
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
  }, [fetchMyTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyTasks();
    setRefreshing(false);
    toast({ title: 'Tasks refreshed', type: 'success' });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(taskId, newStatus);
      setMyTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      toast({ title: `Task marked as ${newStatus}`, type: 'success' });
      setSelectedTask(null);
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
      setMyTasks(prev => prev.map(t => (t._id === updated._id ? updated : t)));
      toast({ title: 'Task updated successfully', type: 'success' });
      setEditingTask(null);
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
    try {
      console.log('🗑️ Deleting task:', taskId);
      await taskService.deleteTask(taskId);
      
      // Update local state
      setMyTasks(prev => prev.filter(t => t._id !== taskId));
      toast({ title: 'Task deleted successfully', type: 'success' });
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ 
        title: 'Error deleting task', 
        message: error?.response?.data?.message || 'Failed to delete task',
        type: 'error' 
      });
    }
  };

  // ─── Timer action handlers ─────────────────────────────────────────────────

  const handleStartTask = async (taskId) => {
    setActionLoading(taskId);
    try {
      const updated = await taskService.startTask(taskId);
      setMyTasks(prev => prev.map(t => t._id === taskId ? updated : t));
      toast({ title: 'Task Started ▶', message: 'Timer is now running', type: 'success' });
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
      setMyTasks(prev => prev.map(t => t._id === _id ? updated : t));
      toast({ title: 'Task Paused ⏸', message: `Logged: "${reason}"`, type: 'warning' });
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
      setMyTasks(prev => prev.map(t => t._id === taskId ? updated : t));
      toast({ title: 'Task Resumed ▶', message: 'Timer is running again', type: 'success' });
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

  const handleCompleteRequest = (task) => {
    setCompleteModal({ _id: task._id, title: task.title });
  };

  const handleCompleteConfirm = async () => {
    if (!completeModal) return;
    const { _id } = completeModal;
    setCompleteModal(null);
    setActionLoading(_id);
    try {
      const updated = await taskService.completeTask(_id);
      setMyTasks(prev => prev.map(t => t._id === _id ? updated : t));
      toast({ title: 'Task Completed ✓', message: 'Great work! Task marked as done.', type: 'success' });
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
    if (filter !== 'all') {
      tasks = tasks.filter(t => {
        if (filter === 'paused') return t.isPaused || t.status === 'on-hold';
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
  }, [myTasks, filter, search]);

  const FILTER_OPTIONS = [
    { value: 'all',         label: 'All' },
    { value: 'pending',     label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'paused',      label: 'Paused' },
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

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
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
        </div>

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
              onComplete={handleCompleteRequest}
              onView={setSelectedTask}
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

      {/* Pause Reason Modal */}
      {pauseModal && (
        <PauseReasonModal
          taskTitle={pauseModal.title}
          onConfirm={handlePauseConfirm}
          onCancel={() => setPauseModal(null)}
        />
      )}

      {/* Complete Confirmation Modal */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCompleteModal(null)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
              Complete Task?
            </h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                &ldquo;{completeModal.title}&rdquo;
              </span>{' '}
              will be marked as completed and the timer will stop.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCompleteModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
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
