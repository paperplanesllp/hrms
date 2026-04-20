import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, Loader, RefreshCw, User, FileText } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import api from '../../../lib/api.js';
import { useAuthStore } from '../../../store/authStore.js';
import { toast } from '../../../store/toastStore.js';
import { ROLES } from '../../../app/constants.js';

export default function TaskProgressReports() {
  const user = useAuthStore(s => s.user);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is HR or Admin
  const normalizedRole = String(user?.role || '').toUpperCase();
  const isAdminOrHR = normalizedRole === ROLES.ADMIN || normalizedRole === ROLES.HR;

  // Fetch tasks with progress tracking
  const fetchTasksWithProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch assigned tasks (ones this user has given to others)
      const response = await api.get('/tasks/assigned', {
        params: { limit: 1000 }
      });

      const tasksData = response.data?.data || response.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      console.log('✅ Tasks loaded:', tasksData.length);
    } catch (err) {
      console.error('❌ Error fetching tasks:', err);
      setError(err.response?.data?.message || 'Failed to load tasks');
      toast({
        title: 'Error',
        description: 'Failed to load task reports',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminOrHR) {
      setError('Access Denied: Only HR and Admin can view task progress reports');
      return;
    }
    fetchTasksWithProgress();
  }, [isAdminOrHR]);

  // Filter tasks based on status and search
  useEffect(() => {
    let filtered = tasks;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(lower) ||
        task.assignedTo?.some(u => u?.name?.toLowerCase().includes(lower)) ||
        task.assignedTo?.some(u => u?.email?.toLowerCase().includes(lower))
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, statusFilter, searchTerm]);

  const formatDate = (date) => {
    if (!date) return 'Not started';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskStatus = (task) => {
    if (task.status === 'completed') {
      return {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: <CheckCircle2 size={16} />
      };
    } else if (task.status === 'in-progress' && task.startedAt) {
      return {
        label: 'In Progress',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: <Clock size={16} />
      };
    } else {
      return {
        label: 'Pending',
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300',
        icon: <AlertCircle size={16} />
      };
    }
  };

  if (!isAdminOrHR) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
          <h3 className="font-bold text-red-800 dark:text-red-300">Access Denied</h3>
        </div>
        <p className="text-sm text-red-700 dark:text-red-400">
          Only HR and Admin users can access task progress reports.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Task Progress Reports
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track task execution and completion details
          </p>
        </div>
        <Button
          variant="primary"
          onClick={fetchTasksWithProgress}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by task title or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTasks.length === 0 && (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <AlertCircle className="mx-auto mb-3 text-slate-400" size={32} />
          <p className="text-slate-600 dark:text-slate-400">
            {searchTerm ? 'No tasks match your search' : 'No tasks found'}
          </p>
        </div>
      )}

      {/* Tasks List */}
      {!isLoading && filteredTasks.length > 0 && (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const taskStatus = getTaskStatus(task);
            const assigneeNames = Array.isArray(task.assignedTo)
              ? task.assignedTo.map(u => u?.name || u?.email).join(', ')
              : 'Unassigned';

            return (
              <div
                key={task._id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:shadow-md transition"
              >
                {/* Task Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <User size={14} />
                      {assigneeNames}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${taskStatus.color}`}
                  >
                    {taskStatus.icon}
                    {taskStatus.label}
                  </span>
                </div>

                {/* Progress Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  {/* Started Date */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Work Started
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-slate-900 dark:text-white">
                        {task.startedAt ? formatDate(task.startedAt) : 'Not yet started'}
                      </span>
                    </div>
                  </div>

                  {/* Completed Date */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Completed At
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <span className="text-slate-900 dark:text-white">
                        {task.completedAt ? formatDate(task.completedAt) : 'Not completed'}
                      </span>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Due Date
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-orange-500" />
                      <span className="text-slate-900 dark:text-white">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'No due date'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Completion Remarks */}
                {task.completionRemarks && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                          Completion Remarks
                        </div>
                        <p className="text-sm text-green-900 dark:text-green-100 leading-relaxed">
                          {task.completionRemarks}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Progress
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {task.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Total Tasks
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {filteredTasks.length}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Completed
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {filteredTasks.filter(t => t.status === 'completed').length}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              In Progress
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {filteredTasks.filter(t => t.status === 'in-progress').length}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Pending
            </div>
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
              {filteredTasks.filter(t => t.status === 'pending').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
