import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Trash2, 
  Edit2,
  X,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Zap,
  Loader
} from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { useSocket } from '../../../hooks/useSocket.js';
import { useAuthStore } from '../../../store/authStore.js';

export default function TasksListSection() {
  const socket = useSocket();
  const user = useAuthStore(s => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [sortBy, setSortBy] = useState('dueDate');
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Real data state
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const itemsPerPage = 10;

  // Check if user has admin/hr role to view all tasks
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  // Fetch all tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use appropriate endpoint based on user role
      let tasks;
      if (isAdminOrHR) {
        // Admin/HR can see all tasks
        tasks = await taskService.getAllTasks();
      } else {
        // Regular users can only see their own tasks
        tasks = await taskService.getMyTasks();
      }
      
      setAllTasks(tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      const errorMsg = err?.response?.status === 403 
        ? 'You do not have permission to view all tasks'
        : 'Failed to load tasks';
      setError(errorMsg);
      toast({ title: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isAdminOrHR]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen for real-time task updates
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (task) => {
      setAllTasks(prev => [task, ...prev]);
      toast({ title: 'New task created', type: 'success' });
    };

    const handleTaskUpdated = (updatedTask) => {
      setAllTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    };

    const handleTaskDeleted = (taskId) => {
      setAllTasks(prev => prev.filter(t => t._id !== taskId));
    };

    const handleTaskStatusChanged = (data) => {
      setAllTasks(prev => prev.map(t => t._id === data.taskId ? { ...t, status: data.status } : t));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:status-changed', handleTaskStatusChanged);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:status-changed', handleTaskStatusChanged);
    };
  }, [socket]);

  // Filter and search logic
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.assignedTo?.name && task.assignedTo.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPriority = 
        selectedPriorities.length === 0 || 
        selectedPriorities.includes(task.priority?.toLowerCase());
      
      const matchesStatus = 
        selectedStatuses.length === 0 || 
        selectedStatuses.includes(task.status?.toLowerCase());
      
      const matchesDepartment = 
        selectedDepartments.length === 0 || 
        (task.department && selectedDepartments.includes(task.department));

      return matchesSearch && matchesPriority && matchesStatus && matchesDepartment;
    });
  }, [searchQuery, selectedPriorities, selectedStatuses, selectedDepartments, allTasks]);

  // Sort logic
  const sortedTasks = useMemo(() => {
    const tasks = [...filteredTasks];
    
    switch (sortBy) {
      case 'dueDate':
        return tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case 'priority': {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return tasks.sort((a, b) => (priorityOrder[a.priority?.toLowerCase()] || 99) - (priorityOrder[b.priority?.toLowerCase()] || 99));
      }
      case 'status': {
        const statusOrder = { 'in-progress': 0, 'pending': 1, 'on-hold': 2, 'completed': 3, 'cancelled': 4 };
        return tasks.sort((a, b) => (statusOrder[a.status?.toLowerCase()] || 99) - (statusOrder[b.status?.toLowerCase()] || 99));
      }
      case 'assignee':
        return tasks.sort((a, b) => (a.assignedTo?.name || '').localeCompare(b.assignedTo?.name || ''));
      case 'newest':
        return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      default:
        return tasks;
    }
  }, [filteredTasks, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique departments from tasks
  const uniqueDepartments = useMemo(() => {
    const depts = new Set(allTasks.map(t => t.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [allTasks]);

  const handlePriorityToggle = (priority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
    setCurrentPage(1);
  };

  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const handleDepartmentToggle = (department) => {
    setSelectedDepartments(prev =>
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedPriorities([]);
    setSelectedStatuses([]);
    setSelectedDepartments([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return colors[priority] || colors.low;
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'Completed',
      'in-progress': 'In Progress',
      pending: 'Pending',
    };
    return labels[status] || status;
  };

  const isTaskOverdue = (dueDate, status) => {
    return status !== 'completed' && new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading tasks...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">Error Loading Tasks</h3>
              <p className="text-sm text-red-800 dark:text-red-400 mb-3">{error}</p>
              <Button 
                variant="danger" 
                size="sm"
                onClick={fetchTasks}
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && allTasks.length === 0 && (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">No tasks yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Create your first task to get started</p>
        </Card>
      )}

      {/* Tasks Content */}
      {!loading && !error && allTasks.length > 0 && (
        <>
          {/* Permission Info Banner */}
          {!isAdminOrHR && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  <span className="font-semibold">Viewing your tasks:</span> You can see only tasks assigned to you. Contact HR or Admin to view all team tasks.
                </p>
              </div>
            </Card>
          )}

          {/* Header with title and view mode toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {isAdminOrHR ? 'All Tasks' : 'My Tasks'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-brand-accent text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
            title="Table view"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-brand-accent text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
            title="Card view"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search and Controls */}
      <Card className="p-6 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, assignee..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all"
            />
          </div>
          
          <Button 
            variant="secondary" 
            size="md" 
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'ring-2 ring-brand-accent' : ''}
          >
            Filters
          </Button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium hover:border-brand-accent dark:hover:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
            <option value="assignee">Sort by Assignee</option>
            <option value="newest">Sort by Newest</option>
          </select>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Filters</h3>
              {(selectedPriorities.length > 0 || selectedStatuses.length > 0 || selectedDepartments.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-brand-accent hover:text-brand-accent/80 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {['high', 'medium', 'low'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityToggle(priority)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedPriorities.includes(priority)
                        ? getPriorityColor(priority) + ' ring-2 ring-offset-1 dark:ring-offset-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {['pending', 'in-progress', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedStatuses.includes(status)
                        ? getStatusColor(status) + ' ring-2 ring-offset-1 dark:ring-offset-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                Department
              </label>
              <div className="flex flex-wrap gap-2">
                {uniqueDepartments.map(dept => (
                  <button
                    key={dept}
                    onClick={() => handleDepartmentToggle(dept)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedDepartments.includes(dept)
                        ? 'bg-brand-accent text-white ring-2 ring-offset-1 dark:ring-offset-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedPriorities.length > 0 || selectedStatuses.length > 0 || selectedDepartments.length > 0) && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {selectedPriorities.map(p => (
                    <Badge
                      key={p}
                      variant="secondary"
                      className="cursor-pointer hover:opacity-75"
                      onClick={() => handlePriorityToggle(p)}
                    >
                      Priority: {p.charAt(0).toUpperCase() + p.slice(1)} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  {selectedStatuses.map(s => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="cursor-pointer hover:opacity-75"
                      onClick={() => handleStatusToggle(s)}
                    >
                      Status: {getStatusLabel(s)} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  {selectedDepartments.map(d => (
                    <Badge
                      key={d}
                      variant="secondary"
                      className="cursor-pointer hover:opacity-75"
                      onClick={() => handleDepartmentToggle(d)}
                    >
                      Dept: {d} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Assigned By
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        overdue && task.status !== 'completed' ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {task.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {task.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{task.assignedTo.avatar}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {task.assignedTo.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{task.assignedBy.avatar}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {task.assignedBy.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm ${
                          overdue && task.status !== 'completed'
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {new Date(task.dueDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: '2-digit'
                          })}
                          {overdue && task.status !== 'completed' && (
                            <AlertCircle className="w-4 h-4 inline ml-1" />
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {task.progress}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                task.progress === 100 ? 'bg-emerald-500' :
                                task.progress >= 75 ? 'bg-blue-500' :
                                task.progress >= 50 ? 'bg-amber-500' :
                                task.progress >= 25 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          <button
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          <button
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>-<span className="font-semibold">{Math.min(currentPage * itemsPerPage, sortedTasks.length)}</span> of <span className="font-semibold">{sortedTasks.length}</span> tasks
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <div className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedTasks.map((task) => {
            const overdue = isTaskOverdue(task.dueDate, task.status);
            return (
              <Card
                key={task.id}
                className={`p-5 hover:shadow-lg transition-all cursor-pointer border-l-4 ${
                  overdue && task.status !== 'completed'
                    ? 'border-l-red-500 shadow-red-500/5 hover:shadow-red-500/10'
                    : 'border-l-slate-300 dark:border-l-slate-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 mb-2">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {task.description}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    {overdue && task.status !== 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertCircle size={12} />
                        Overdue
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {task.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 3 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
                          +{task.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress */}
                  {task.progress !== undefined && (
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Progress</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{task.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all rounded-full ${
                            task.progress === 100 ? 'bg-emerald-500' :
                            task.progress >= 75 ? 'bg-blue-500' :
                            task.progress >= 50 ? 'bg-amber-500' :
                            task.progress >= 25 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Assigned to:</span>
                      <span className="text-lg">{task.assignedTo.avatar}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{task.assignedTo.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Due:</span>
                      <span className={`font-medium ${
                        overdue && task.status !== 'completed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button className="flex-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button className="flex-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600 dark:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Grid Pagination */}
      {viewMode === 'grid' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>-<span className="font-semibold">{Math.min(currentPage * itemsPerPage, sortedTasks.length)}</span> of <span className="font-semibold">{sortedTasks.length}</span> tasks
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <div className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Page {currentPage} of {totalPages || 1}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedTasks.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Zap className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                No tasks found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Try adjusting your filters or search terms
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={clearAllFilters}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
