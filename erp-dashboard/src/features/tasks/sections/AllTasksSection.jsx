import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { 
  Users, Grid3x3, LayoutList, Search, Filter, Loader, RefreshCw,
  X, CheckCircle, CheckCircle2, AlertCircle, Eye
} from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import { useAuthStore } from '../../../store/authStore.js';
import ModalBase from '../../../components/ui/Modal.jsx';
import TaskDetailsModal from '../TaskDetailsModal.jsx';
import TaskForm from '../TaskForm.jsx';

export default function AllTasksSection() {
  const user = useAuthStore(s => s.user);
  const [viewMode, setViewMode] = useState('list'); // grid or list
  const [allTasks, setAllTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
  });

  // Check if user has admin/hr role
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  // Helper function to sort tasks: running first, then newest
  const sortTasks = useCallback((tasks) => {
    return [...(tasks || [])].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  // Fetch all tasks function
  const fetchAllTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use appropriate endpoint based on user role
      let tasks;
      if (isAdminOrHR) {
        // Admin/HR can see all tasks
        tasks = await taskService.getAllTasks({ limit: 500 });
      } else {
        // Regular users can only see their own tasks
        tasks = await taskService.getMyTasks({ limit: 500 });
      }
      
      // Sort: newest first (running tasks still bubble to top)
      const sorted = sortTasks(tasks);
      
      setAllTasks(sorted);
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      const errorMsg = error?.response?.status === 403 
        ? 'You do not have permission to view all tasks'
        : error?.response?.data?.message || 'Failed to fetch tasks';
      setError(errorMsg);
      toast({
        title: 'Error loading tasks',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [isAdminOrHR]);

  // Fetch all tasks on mount
  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  // Setup real-time socket listeners for task updates
  useEffect(() => {
    console.log('🔌 [AllTasks] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [AllTasks] Socket not available');
      return;
    }

    // Handle new task created
    const handleTaskCreated = (data) => {
      console.log('📡 [AllTasks] task:created event received:', data);
      setAllTasks(prev => [data.task, ...prev]);
      toast({ 
        title: 'New Task Created', 
        message: `${data.task?.title}`,
        type: 'info' 
      });
    };

    // Handle task updated
    const handleTaskUpdated = (data) => {
      console.log('📡 [AllTasks] task:updated event received:', data);
      setAllTasks(prev => {
        const exists = prev.some(t => t._id === data.task._id);
        let updated;
        if (exists) {
          updated = prev.map(t => t._id === data.task._id ? data.task : t);
        } else {
          updated = [...prev, data.task];
        }
        // Re-sort after update to ensure new tasks appear first
        return sortTasks(updated);
      });
    };

    // Handle task status changed
    const handleTaskStatusChanged = (data) => {
      console.log('📡 [AllTasks] task:status-changed event received:', data);
      setAllTasks(prev => {
        const updated = prev.map(t => t._id === data.task._id ? data.task : t);
        // Re-sort after status change
        return sortTasks(updated);
      });
      toast({ 
        title: 'Task Status Updated', 
        message: `${data.task?.title} - ${data.task?.status}`,
        type: 'success' 
      });
    };

    // Handle task deleted
    const handleTaskDeleted = (data) => {
      console.log('📡 [AllTasks] task:deleted event received:', data);
      setAllTasks(prev => prev.filter(t => t._id !== data.taskId));
      toast({ 
        title: 'Task Deleted', 
        message: data.message,
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
      console.log('🔌 [AllTasks] Cleaning up socket listeners');
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:status-changed', handleTaskStatusChanged);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = allTasks;

    // Search
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    setFilteredTasks(filtered);
  }, [allTasks, searchQuery, filters]);

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      setDeleting(prev => ({ ...prev, [taskId]: true }));
      await taskService.deleteTask(taskId);
      setAllTasks(prev => prev.filter(t => t._id !== taskId));
      toast({ title: 'Task deleted successfully', type: 'success' });
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

  const canEditTask = (task) => {
    if (!user) return false;
    if (isAdminOrHR) return true;
    const uid = user._id || user.id;
    const isCreator = task.assignedBy?._id?.toString() === uid?.toString();
    const isAssignee = task.assignedTo?._id?.toString() === uid?.toString();
    return isCreator || isAssignee;
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const updated = await taskService.updateTaskStatus(taskId, newStatus);
      setAllTasks(prev => prev.map(t => t._id === taskId ? updated : t));
      toast({ title: `Task marked ${newStatus}`, type: 'success' });
      setSelectedTask(null);
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ title: 'Failed to update status', message: err?.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleUpdateTask = async (formData) => {
    if (!editingTask) return;
    setSubmittingEdit(true);
    try {
      const updated = await taskService.updateTask(editingTask._id, formData);
      setAllTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
      toast({ title: 'Task updated', type: 'success' });
      setEditingTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
      toast({ title: 'Failed to update task', message: err?.response?.data?.message || err.message, type: 'error' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'on-hold':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'from-red-500 to-red-700';
      case 'HIGH':
        return 'from-orange-500 to-orange-700';
      case 'MEDIUM':
        return 'from-amber-500 to-amber-700';
      case 'LOW':
        return 'from-blue-500 to-blue-700';
      default:
        return 'from-slate-500 to-slate-700';
    }
  };

  const isOverdue = (task) => {
    return task.status !== 'completed' && new Date(task.dueDate) < new Date();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
            <p className="font-medium text-slate-600 dark:text-slate-400">Loading tasks...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="p-6 border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-red-900 dark:text-red-300">Error Loading Tasks</h3>
              <p className="mb-3 text-sm text-red-800 dark:text-red-400">{error}</p>
              <Button 
                variant="danger" 
                size="sm"
                onClick={fetchAllTasks}
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Permission Info Banner */}
      {!loading && !error && !isAdminOrHR && (
        <Card className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <span className="font-semibold">Viewing your tasks:</span> You can see only tasks assigned to you. Contact HR or Admin to view all team tasks.
            </p>
          </div>
        </Card>
      )}

      {/* Tasks Content */}
      {!loading && !error && (
        <>
          {/* Header with search and filters */}
          <Card className="p-6">
        <div className="space-y-4">
          {/* Search and View Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute w-5 h-5 left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brand-accent text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutList className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-brand-accent text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={fetchAllTasks}
                className="p-2 transition-colors rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 text-sm bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-4 py-2 text-sm bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            >
              <option value="all">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Results count */}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredTasks.length} of {allTasks.length} tasks
          </div>
        </div>
      </Card>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-600 dark:text-slate-400">
            {searchQuery ? 'No tasks match your search.' : 'No tasks found.'}
          </p>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <Card key={task._id} className="p-4 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-slate-900 dark:text-white">
                    {task.title}
                  </h3>
                  <p className="text-xs truncate text-slate-600 dark:text-slate-400">
                    Assigned to: {Array.isArray(task.assignedTo) ? task.assignedTo.map(a => a?.name || 'Unknown').join(', ') : (task.assignedTo?.name || 'Unknown')} by {task.assignedBy?.name || 'Unknown'}
                  </p>
                </div>

                <div className="flex items-center flex-shrink-0 gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                    {task.status.replace('-', ' ').toUpperCase()}
                  </div>

                  <div className={`px-3 py-1 rounded text-xs font-semibold text-white bg-gradient-to-r ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </div>

                  {isOverdue(task) && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">⚠ Overdue</span>
                  )}

                  {canEditTask(task) && task.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(task._id, 'completed')}
                      className="p-2 text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:text-emerald-400"
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedTask(task)}
                    className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-blue-400"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit/Delete removed per request */}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map(task => (
            <Card key={task._id} className="flex flex-col p-5 transition-all hover:shadow-lg">
              <div className="mb-4">
                <h3 className="mb-2 font-bold text-slate-900 dark:text-white line-clamp-2">
                  {task.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {task.description || 'No description'}
                </p>
              </div>

              <div className="pb-4 mb-4 space-y-2 border-b border-slate-200 dark:border-slate-700">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                  {task.status.replace('-', ' ').toUpperCase()}
                </div>
                {isOverdue(task) && (
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400">⚠ Overdue</div>
                )}
              </div>

              <div className="flex-1 mb-4 text-xs text-slate-600 dark:text-slate-400">
                <div>To: {Array.isArray(task.assignedTo) ? task.assignedTo.map(a => a?.name || 'Unknown').join(', ') : (task.assignedTo?.name || 'Unknown')}</div>
                <div>By: {task.assignedBy?.name || 'Unknown'}</div>
                <div>Due: {new Date(new Date(task.dueDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="flex gap-2">
                {canEditTask(task) && task.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange(task._id, 'completed')}
                    className="flex-1 px-3 py-2 text-sm font-semibold text-emerald-600 transition-colors rounded-lg bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    Mark Complete
                  </button>
                )}

                <button
                  onClick={() => setSelectedTask(task)}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  View
                </button>

                {/* Edit/Delete removed per request */}
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* View Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Edit modal removed (UI hidden) */}
        </>
      )}
    </div>
  );
}
