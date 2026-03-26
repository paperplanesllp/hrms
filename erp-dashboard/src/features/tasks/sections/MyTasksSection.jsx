import React, { useState, useEffect, useCallback } from 'react';
import { Eye, CheckCircle2, Clock, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import ModalBase from '../../../components/ui/Modal.jsx';
import TaskDetailsModal from '../TaskDetailsModal.jsx';
import TaskForm from '../TaskForm.jsx';

export default function MyTasksSection() {
  const [filter, setFilter] = useState('all');
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchMyTasks = useCallback(async () => {
    try {
      console.log('🔄 [MyTasks] Starting fetch with filter:', filter);
      setLoading(true);
      
      const tasks = await taskService.getMyTasks({
        status: filter !== 'all' ? filter : undefined
      });
      
      console.log('✅ [MyTasks] Fetch successful');
      console.log('📋 [MyTasks] Retrieved tasks count:', tasks?.length || 0);
      console.log('📊 [MyTasks] Tasks data:', tasks);
      
      if (!tasks || tasks.length === 0) {
        console.warn('⚠️ [MyTasks] No tasks returned from API');
      }
      
      setMyTasks(tasks || []);
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getISTNow = () => {
    const now = new Date();
    const local = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(local);
  };

  const daysUntilDue = (dateString) => {
    if (!dateString) return 0;
    const due = new Date(new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const now = getISTNow();
    const diffTime = due - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'on-hold':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'cancelled':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      case 'MEDIUM':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'LOW':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  const isOverdue = (task) => {
    const now = getISTNow();
    const due = new Date(new Date(task.dueDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return task.status !== 'completed' && due < now;
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
            <p className="font-medium text-slate-600 dark:text-slate-400">Loading your tasks...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No tasks found</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No tasks found with the selected filter.
            </p>
          </div>
        </Card>
      )}

      {/* Table View */}
      {!loading && filteredTasks.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300" style={{ width: '60px' }}>
                    S.No
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                    Task Title
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300" style={{ width: '100px' }}>
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300" style={{ width: '150px' }}>
                    Due Date & Time
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300" style={{ width: '80px' }}>
                    Status
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-300" style={{ width: '120px' }}>
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filteredTasks.map((task, index) => {
                  const overdue = isOverdue(task);
                  
                  return (
                    <tr
                      key={task._id}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                    >
                      {/* S.No */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {index + 1}
                        </span>
                      </td>

                      {/* Task Title */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                            {task.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {task.description || 'No description'}
                          </p>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getPriorityBadgeColor(task.priority)}`}>
                          {task.priority || 'N/A'}
                        </span>
                      </td>

                      {/* Due Date & Time */}
                      <td className="px-6 py-4">
                        <div className={overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                          <p>{formatDate(task.dueDate)}</p>
                          <p className={`text-xs mt-1 font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-500'}`}>
                            {overdue 
                              ? `⚠️ ${Math.abs(daysUntilDue(task.dueDate))} days overdue` 
                              : `📅 ${daysUntilDue(task.dueDate)} days left`
                            }
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                          {task.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Icon */}
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
                            title="View task details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {/* Edit removed per request */}

                          {/* Mark Complete Icon */}
                          {task.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChange(task._id, 'completed')}
                              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors duration-200"
                              title="Mark as completed"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}

                          {/* Delete removed per request */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredTasks.length} of {myTasks.length} tasks
          </div>
        </Card>
      )}

      {/* Task Details Modal */}
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
