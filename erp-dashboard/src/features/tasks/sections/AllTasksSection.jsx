import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { 
  Users, Grid3x3, LayoutList, Search, Filter, Loader, RefreshCw, Trash2, Edit2,
  X, CheckCircle, AlertCircle
} from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { useAuthStore } from '../../../store/authStore.js';

export default function AllTasksSection() {
  const user = useAuthStore(s => s.user);
  const [viewMode, setViewMode] = useState('list'); // grid or list
  const [allTasks, setAllTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
  });

  // Check if user has admin/hr role
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

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
      
      setAllTasks(tasks || []);
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
                    Assigned to: {task.assignedTo?.name || 'Unknown'} by {task.assignedBy?.name || 'Unknown'}
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

                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    disabled={deleting[task._id]}
                    className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                <div>To: {task.assignedTo?.name || 'Unknown'}</div>
                <div>By: {task.assignedBy?.name || 'Unknown'}</div>
                <div>Due: {new Date(task.dueDate).toLocaleDateString()}</div>
              </div>

              <button
                onClick={() => handleDeleteTask(task._id)}
                disabled={deleting[task._id]}
                className="w-full px-3 py-2 text-sm font-semibold text-red-600 transition-colors rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50"
              >
                {deleting[task._id] ? 'Deleting...' : 'Delete'}
              </button>
            </Card>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
