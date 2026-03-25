import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertCircle, Flag, Calendar, FileText, Loader, RefreshCw, ChevronDown } from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function MyTasksSection() {
  const [filter, setFilter] = useState('all');
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({});

  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      const tasks = await taskService.getMyTasks({
        status: filter !== 'all' ? filter : undefined
      });
      setMyTasks(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({ 
        title: 'Error loading tasks', 
        message: error?.response?.data?.message || 'Failed to fetch your tasks',
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch tasks on component mount and when filter changes
  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyTasks();
    setRefreshing(false);
    toast({ title: 'Tasks refreshed', type: 'success' });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [taskId]: true }));
      const updatedTask = await taskService.updateTaskStatus(taskId, newStatus);
      
      // Update local state
      setMyTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      toast({ title: `Task marked as ${newStatus}`, type: 'success' });
      setExpandedTask(null);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({ 
        title: 'Error updating status', 
        message: error?.response?.data?.message || 'Failed to update task status',
        type: 'error' 
      });
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'in-progress':
        return Clock;
      case 'pending':
        return AlertCircle;
      case 'on-hold':
        return AlertCircle;
      case 'cancelled':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800';
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
      case 'pending':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800';
      case 'on-hold':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800';
      case 'cancelled':
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return 'from-red-500 to-red-600';
      case 'MEDIUM':
        return 'from-amber-500 to-amber-600';
      case 'LOW':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const isOverdue = (task) => {
    return task.status !== 'completed' && new Date(task.dueDate) < new Date();
  };

  const daysUntilDue = (date) => {
    const now = new Date();
    const due = new Date(date);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredTasks = filter === 'all' 
    ? myTasks 
    : myTasks.filter(t => t.status === filter.toLowerCase());

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filter Buttons and Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {['all', 'pending', 'in-progress', 'completed', 'on-hold'].map((status) => (
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
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader className="w-8 h-8 mx-auto mb-4 animate-spin text-brand-accent" />
          <p className="text-slate-600 dark:text-slate-400">Loading your tasks...</p>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No tasks found with the selected filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredTasks.map((task) => {
            const StatusIcon = getStatusIcon(task.status);
            const isExpanded = expandedTask === task._id;
            
            return (
              <Card 
                key={task._id}
                className="flex flex-col p-6 transition-all duration-300 hover:shadow-lg"
                interactive
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="mb-2 text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                      {task.description || 'No description'}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${getPriorityColor(task.priority)} flex-shrink-0`}>
                    <Flag className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Status and Progress */}
                <div className="pb-4 mb-4 space-y-3 border-b border-slate-200 dark:border-slate-700">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(task.status)}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{task.status.replace('-', ' ').toUpperCase()}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Progress
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {task.progress || 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div 
                        className="h-full transition-all duration-500 bg-gradient-to-r from-brand-accent to-brand-accent/80"
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Meta Information */}
                <div className="mb-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {isOverdue(task) && <span className="ml-2 font-semibold text-red-500">(Overdue)</span>}
                      {!isOverdue(task) && <span className="ml-2 text-slate-600 dark:text-slate-500">({daysUntilDue(task.dueDate)} days)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Assigned by: {task.assignedBy?.name || 'Unknown'}</span>
                  </div>
                </div>

                {/* Expandable Status Options */}
                {isExpanded && task.status !== 'completed' && (
                  <div className="p-3 mb-4 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    <p className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-300">Update Status:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {task.status !== 'in-progress' && (
                        <button
                          onClick={() => handleStatusChange(task._id, 'in-progress')}
                          disabled={updatingStatus[task._id]}
                          className="px-3 py-2 text-xs font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                          {updatingStatus[task._id] ? 'Updating...' : 'Mark In Progress'}
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(task._id, 'completed')}
                        disabled={updatingStatus[task._id]}
                        className="px-3 py-2 text-xs font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {updatingStatus[task._id] ? 'Completing...' : 'Mark Complete'}
                      </button>
                      {task.status !== 'on-hold' && (
                        <button
                          onClick={() => handleStatusChange(task._id, 'on-hold')}
                          disabled={updatingStatus[task._id]}
                          className="px-3 py-2 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                        >
                          {updatingStatus[task._id] ? 'Pausing...' : 'On Hold'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 mt-auto">
                  {task.status !== 'completed' && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setExpandedTask(expandedTask === task._id ? null : task._id)}
                      leftIcon={<ChevronDown className="w-3 h-3" />}
                    >
                      {expandedTask === task._id ? 'Hide Options' : 'Update Status'}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" className="flex-1">
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
