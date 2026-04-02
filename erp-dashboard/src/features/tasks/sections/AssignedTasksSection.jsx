import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, CheckCircle2, Clock, AlertCircle, Flag, Calendar, FileText, Loader, RefreshCw, ChevronDown, User, Eye } from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import ModalBase from '../../../components/ui/Modal.jsx';
import TaskDetailsModal from '../TaskDetailsModal.jsx';
import TaskForm from '../TaskForm.jsx';

export default function AssignedTasksSection() {
  const [filter, setFilter] = useState('all');
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchAssignedTasks = useCallback(async () => {
    try {
      console.log('🔄 [AssignedTasks] Starting fetch with filter:', filter);
      setLoading(true);
      
      const tasks = await taskService.getMyAssignedTasks({
        status: filter !== 'all' ? filter : undefined
      });
      
      console.log('✅ [AssignedTasks] Fetch successful');
      console.log('📋 [AssignedTasks] Retrieved assigned tasks count:', tasks?.length || 0);
      console.log('📊 [AssignedTasks] Tasks data:', tasks);
      
      if (!tasks || tasks.length === 0) {
        console.warn('⚠️ [AssignedTasks] No tasks returned from API');
      }
      
      setAssignedTasks(tasks || []);
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
      console.log('✔️ [AssignedTasks] Fetch completed (loading set to false)');
    }
  }, [filter]);

  // Fetch tasks on component mount and when filter changes
  useEffect(() => {
    console.log('🎯 [AssignedTasks] useEffect triggered');
    fetchAssignedTasks();
  }, [fetchAssignedTasks]);

  // Setup real-time socket listeners for task updates
  useEffect(() => {
    console.log('🔌 [AssignedTasks] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [AssignedTasks] Socket not available');
      return;
    }

    // Handle new task created
    const handleTaskCreated = (data) => {
      console.log('📡 [AssignedTasks] task:created event received:', data);
      // Refresh tasks to include the new one
      setTimeout(() => fetchAssignedTasks(), 500);
    };

    // Handle task updated
    const handleTaskUpdated = (data) => {
      console.log('📡 [AssignedTasks] task:updated event received:', data);
      setAssignedTasks(prev => {
        const exists = prev.some(t => t._id === data.task._id);
        if (exists) {
          return prev.map(t => t._id === data.task._id ? data.task : t);
        }
        return [...prev, data.task];
      });
    };

    // Handle task status changed
    const handleTaskStatusChanged = (data) => {
      console.log('📡 [AssignedTasks] task:status-changed event received:', data);
      setAssignedTasks(prev => prev.map(t => t._id === data.task._id ? data.task : t));
    };

    // Handle task deleted
    const handleTaskDeleted = (data) => {
      console.log('📡 [AssignedTasks] task:deleted event received:', data);
      setAssignedTasks(prev => prev.filter(t => t._id !== data.taskId));
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
  }, [fetchAssignedTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAssignedTasks();
    setRefreshing(false);
    toast({ title: 'Tasks refreshed', type: 'success' });
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

  const daysUntilDue = (date) => {
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const due = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const nowDate = new Date(now);
    const diffTime = due - nowDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (task) => {
    try {
      const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const due = new Date(new Date(task.dueDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      return task.status !== 'completed' && due < new Date(now);
    } catch (e) {
      return task.status !== 'completed' && new Date(task.dueDate) < new Date();
    }
  };

  const filteredTasks = filter === 'all' 
    ? assignedTasks 
    : assignedTasks.filter(t => t.status === filter.toLowerCase());

  // Action handlers
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const updated = await taskService.updateTaskStatus(taskId, newStatus);
      setAssignedTasks(prev => prev.map(t => t._id === taskId ? updated : t));
      toast({ title: `Task marked as ${newStatus}`, type: 'success' });
      setSelectedTask(null);
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ title: 'Failed to update status', message: err?.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      setAssignedTasks(prev => prev.filter(t => t._id !== taskId));
      toast({ title: 'Task deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({ title: 'Failed to delete task', message: err?.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleUpdateTask = async (formData) => {
    if (!editingTask) return;
    setSubmittingEdit(true);
    try {
      const updated = await taskService.updateTask(editingTask._id, formData);
      setAssignedTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
      toast({ title: 'Task updated', type: 'success' });
      setEditingTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
      toast({ title: 'Failed to update task', message: err?.response?.data?.message || err.message, type: 'error' });
    } finally {
      setSubmittingEdit(false);
    }
  };

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
          {filteredTasks.map((task) => {
            const StatusIcon = getStatusIcon(task.status);
            const days = daysUntilDue(task.dueDate);
            const overdue = isOverdue(task);
            const expanded = expandedTask === task._id;

            return (
              <Card
                key={task._id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
                style={{
                  borderLeftColor: task.priority === 'URGENT' ? '#dc2626' : 
                                  task.priority === 'HIGH' ? '#ea580c' : 
                                  task.priority === 'MEDIUM' ? '#d97706' : '#3b82f6'
                }}
              >
                {/* Card Header - Click to Expand */}
                <button
                  onClick={() => setExpandedTask(expanded ? null : task._id)}
                  className="w-full p-6 bg-gradient-to-r hover:opacity-95 transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%)`,
                    '--gradient-from': task.priority === 'URGENT' ? '#fee2e2' : 
                                      task.priority === 'HIGH' ? '#ffedd5' : 
                                      task.priority === 'MEDIUM' ? '#fef3c7' : '#dbeafe',
                    '--gradient-to': task.priority === 'URGENT' ? '#fecaca' : 
                                    task.priority === 'HIGH' ? '#fed7aa' : 
                                    task.priority === 'MEDIUM' ? '#fde68a' : '#bfdbfe'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1 text-left">
                      <div className={`p-2 rounded-lg ${getStatusColor(task.status)}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                          {task.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          {task.assignedTo && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <User className="w-4 h-4" />
                              <span>Assigned to: <strong>{Array.isArray(task.assignedTo) ? task.assignedTo.map(a => a?.name || 'Unknown').join(', ') : (task.assignedTo?.name || 'Unknown')}</strong></span>
                            </div>
                          )}
                          <div className={`text-sm font-semibold ${getStatusColor(task.status)}`}>
                            {task.status.toUpperCase().replace('-', ' ')}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </div>
                          <div className={`text-sm font-semibold flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400' : days <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            <Calendar className="w-4 h-4" />
                            {overdue ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status !== 'completed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(task._id, 'completed'); }}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                          title="Mark as completed"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {/* Edit/Delete removed per request */}
                      <ChevronDown className={`w-6 h-6 text-slate-600 dark:text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expanded && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    {task.description && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                      </div>
                    )}
                    
                    {task.department && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Department</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{task.department?.name || 'Unknown'}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Progress</h4>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-brand-accent h-2 rounded-full transition-all"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{task.progress || 0}%</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Due Date</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {task.tags && task.tags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-brand-accent/20 text-brand-accent dark:text-brand-accent rounded-full text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-500 dark:text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-700">
                      Created: {new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
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
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Edit modal removed (UI hidden) */}
    </div>
  );
}
