import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Activity, 
  Filter, 
  Search,
  Calendar,
  Loader,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import { taskService } from './taskService.js';
import { getSocket } from '../../lib/socket.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { TaskRefreshProvider, useTaskRefresh } from './context/TaskRefreshContext.jsx';

/**
 * Daily Task Updates Page
 * Shows all task-related activities including:
 * - Tasks assigned to the current user
 * - Tasks created by the current user
 * - Task completions and status changes
 * - Real-time updates via Socket.io
 */
export default function DailyTaskUpdatesPage() {
  return (
    <TaskRefreshProvider>
      <DailyTaskUpdatesPageInner />
    </TaskRefreshProvider>
  );
}

function DailyTaskUpdatesPageInner() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { refreshKey } = useTaskRefresh();

  const [updates, setUpdates] = useState([]);
  const [filteredUpdates, setFilteredUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, assigned, created, completed, status-changed
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest

  // Fetch all task updates
  const fetchTaskUpdates = useCallback(async () => {
    if (!user?.id) {
      toast({ title: 'Error', message: 'User not authenticated', type: 'error' });
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Fetch all recent tasks (increased limit to get more data)
      const dashboardTasks = await taskService.getDashboardTasks(100);
      
      if (dashboardTasks && Array.isArray(dashboardTasks)) {
        setUpdates(dashboardTasks);
      } else {
        setUpdates([]);
      }
    } catch (error) {
      console.error('Error fetching task updates:', error);
      toast({ title: 'Error', message: 'Failed to load task updates', type: 'error' });
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...updates];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(update => update.type === filterType);
    }

    // Search by title or person
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(update => 
        (update.title?.toLowerCase().includes(query)) ||
        (update.person?.toLowerCase().includes(query)) ||
        (update.assignedBy?.name?.toLowerCase().includes(query)) ||
        (update.description?.toLowerCase().includes(query))
      );
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.updatedAt || 0);
        return dateA - dateB;
      });
    }

    setFilteredUpdates(filtered);
  }, [updates, filterType, searchQuery, sortBy]);

  // Fetch updates on mount
  useEffect(() => {
    fetchTaskUpdates();
  }, [fetchTaskUpdates, refreshKey]);

  // Setup real-time socket listeners
  useEffect(() => {
    const socket = getSocket();
    
    if (!socket) return;

    const handleTaskEvent = () => {
      console.log('📡 [DailyTaskUpdates] Task event received, refreshing');
      setTimeout(() => {
        fetchTaskUpdates();
      }, 300);
    };

    socket.on('task:created', handleTaskEvent);
    socket.on('task:updated', handleTaskEvent);
    socket.on('task:status-changed', handleTaskEvent);
    socket.on('task:deleted', handleTaskEvent);

    return () => {
      socket.off('task:created', handleTaskEvent);
      socket.off('task:updated', handleTaskEvent);
      socket.off('task:status-changed', handleTaskEvent);
      socket.off('task:deleted', handleTaskEvent);
    };
  }, [fetchTaskUpdates]);

  // Get color for activity type
  const getActivityColor = (type) => {
    const colors = {
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      assigned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      updated: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    };
    return colors[type] || colors.updated;
  };

  const getActivityLabel = (type) => {
    const labels = {
      completed: '✓ Completed',
      assigned: '→ Assigned',
      updated: '○ Updated',
      overdue: '! Overdue',
    };
    return labels[type] || 'Update';
  };

  const getActivityIcon = (type) => {
    const icons = {
      completed: <CheckCircle className="w-5 h-5" />,
      assigned: <ArrowRight className="w-5 h-5" />,
      updated: <Zap className="w-5 h-5" />,
      overdue: <AlertCircle className="w-5 h-5" />,
    };
    return icons[type] || <Activity className="w-5 h-5" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (err) {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 animate-slideInUp">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/tasks')}
              className="p-2 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-brand-accent" />
                Daily Task Updates
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                View all task assignments, completions, and status changes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="p-6 mb-8">
          <div className="grid gap-4 lg:grid-cols-4 mb-4">
            {/* Search Box */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by task title, person, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            </div>

            {/* Filter Type */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <option value="all">All Updates</option>
                <option value="assigned">Assigned</option>
                <option value="updated">Updated</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(filterType !== 'all' || searchQuery) && (
            <div className="flex flex-wrap gap-2">
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  <Filter className="w-4 h-4" />
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  <button
                    onClick={() => setFilterType('all')}
                    className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    ✕
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  <Search className="w-4 h-4" />
                  {searchQuery}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Updates List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
          </div>
        ) : filteredUpdates.length === 0 ? (
          <Card className="p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {updates.length === 0 ? 'No task updates yet' : 'No matching updates'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {updates.length === 0 
                ? 'Check back later for task assignments and updates'
                : 'Try adjusting your filters or search query'
              }
            </p>
            {searchQuery || filterType !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Results count */}
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Showing {filteredUpdates.length} of {updates.length} updates
            </div>

            {/* Updates Grid */}
            <div className="space-y-3">
              {filteredUpdates.map((update) => (
                <Card
                  key={update.id || update._id}
                  className="p-5 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    if (update.taskId || update._id) {
                      navigate(`/tasks`, { 
                        state: { 
                          highlightTaskId: update.taskId || update._id,
                          scrollToTask: true 
                        } 
                      });
                    }
                  }}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
                        {update.avatar ? (
                          <span className="text-lg">{update.avatar}</span>
                        ) : (
                          getActivityIcon(update.type)
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white truncate">
                            {update.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            {update.person || update.assignedBy?.name || update.description || 'Task update'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${getActivityColor(update.type)}`}>
                          {getActivityLabel(update.type)}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500 mt-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(update.createdAt || update.updatedAt)}
                        </span>
                        {update.dueAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {formatDate(update.dueAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

