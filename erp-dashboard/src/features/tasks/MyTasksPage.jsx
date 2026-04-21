import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LayoutGrid, LayoutList } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import api from '../../lib/api.js';
import { toast } from '../../store/toastStore.js';
import TaskCard from './TaskCard.jsx';
import TaskFilters from './TaskFilters.jsx';
import TaskDetailsModal from './TaskDetailsModal.jsx';
import TaskDashboard from './TaskDashboard.jsx';
import TaskTable from './TaskTable.jsx';
import ModalBase from '../../components/ui/Modal.jsx';
import TaskForm from './TaskForm.jsx';
import { useTaskSocketListener } from './hooks/useTaskSocketListener.js';
import { useTaskRefresh } from './context/TaskRefreshContext.jsx';

export default function MyTasksPage() {
  const [view, setView] = useState('grid'); // grid, list, dashboard
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const { refreshKey } = useTaskRefresh();
  
  // Initialize socket listener for real-time task updates
  useTaskSocketListener();
  const [filters, setFilters] = useState({
    search: '',
    priority: null,
    status: null,
    dateRange: 'all',
    sort: 'newest'
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert dateRange to from/to dates
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filters.dateRange) {
      case 'today':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { from: weekStart, to: weekEnd };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { from: monthStart, to: monthEnd };
      }
      case 'overdue':
        return { to: today };
      default:
        return {};
    }
  };

  // Load tasks wrapper - created with useCallback for dependency management
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      const params = {
        priority: filters.priority,
        status: filters.status,
        search: filters.search,
        sort: filters.sort,
        limit: 100
      };
      
      // Add date range parameters
      if (dateRange.from) {
        params.from = dateRange.from.toISOString();
      }
      if (dateRange.to) {
        params.to = dateRange.to.toISOString();
      }
      
      console.log('📥 Loading tasks with params:', params);
      
      // Try to get all tasks including self-assigned with includeSelfAssigned flag
      const response = await api.get('/tasks/my', { params: { ...params, includeSelfAssigned: true } });
      console.log('✅ Tasks loaded:', response.data);
      
      // Handle both response formats
      let tasksData = response.data?.data || response.data || [];
      tasksData = Array.isArray(tasksData) ? tasksData : [];
      
      // If empty and it's the first load, also try fetching tasks created by current user
      if (tasksData.length === 0 && !filters.search) {
        console.log('📥 No tasks found, checking for self-created tasks...');
        try {
          const createdResponse = await api.get('/tasks', { 
            params: { 
              createdBy: 'me',
              ...params 
            } 
          });
          const createdTasks = Array.isArray(createdResponse.data?.data || createdResponse.data) 
            ? (createdResponse.data?.data || createdResponse.data) 
            : [];
          
          // Merge both lists and remove duplicates
          const allTasksMap = new Map();
          tasksData.forEach(t => allTasksMap.set(t._id, t));
          createdTasks.forEach(t => allTasksMap.set(t._id, t));
          tasksData = Array.from(allTasksMap.values());
          
          console.log('✅ Added ', createdTasks.length, ' self-created tasks');
        } catch (err) {
          console.warn('Could not fetch self-created tasks:', err.message);
        }
      }
      
      setTasks(tasksData);
      console.log('✅ Set tasks:', tasksData.length, 'items');
    } catch (err) {
      console.error('❌ Error loading tasks:', err.response?.data || err.message);
      toast({
        title: 'Failed to load tasks',
        description: err.response?.data?.message || err.message,
        type: 'error'
      });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initialize users and departments on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          api.get('/users?limit=1000'),
          api.get('/department?limit=1000')
        ]);
        // Handle different response formats
        const usersList = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
        const deptsList = Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || []);
        
        setUsers(usersList);
        setDepartments(deptsList);
        console.log('✅ Loaded users:', usersList.length, 'departments:', deptsList.length);
      } catch (err) {
        console.error('❌ Failed to load users/departments:', err.message);
        // Set empty arrays on error so UI still renders
        setUsers([]);
        setDepartments([]);
      }
    };
    loadInitialData();
  }, []);

  // Load tasks when filters or view changes
  useEffect(() => {
    if (view !== 'dashboard') {
      loadTasks();
    }
  }, [filters, view, loadTasks, refreshKey]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      const updatedTask = response.data?.data || response.data;
      
      // Update only the specific task in state instead of reloading all tasks
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === taskId ? { ...task, status: newStatus, ...updatedTask } : task
        )
      );
      
      toast({
        title: `Task marked as ${newStatus}`,
        type: 'success'
      });
      setSelectedTask(null);
    } catch (err) {
      toast({
        title: 'Failed to update task status',
        description: err.message,
        type: 'error'
      });
    }
  };

  const handleCreateTask = async (formData) => {
    try {
      setIsSubmitting(true);
      console.log('📤 Submitting task:', formData);
      await api.post('/tasks', formData);
      toast({
        title: 'Task created successfully',
        type: 'success'
      });
      setShowCreateModal(false);
      loadTasks();
    } catch (err) {
      console.error('❌ Error creating task:', err.response?.data || err.message);
      toast({
        title: 'Failed to create task',
        description: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (formData) => {
    try {
      setIsSubmitting(true);
      console.log('📤 Updating task:', formData);
      await api.patch(`/tasks/${editingTask._id}`, formData);
      toast({
        title: 'Task updated successfully',
        type: 'success'
      });
      setEditingTask(null);
      loadTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error('❌ Error updating task:', err.response?.data || err.message);
      toast({
        title: 'Failed to update task',
        description: err.response?.data?.message || err.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setSelectedTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      console.log('🗑️ Deleting task:', taskId);
      await api.delete(`/tasks/${taskId}`);
      toast({
        title: 'Task deleted successfully',
        type: 'success'
      });
      loadTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error('❌ Error deleting task:', err.response?.data || err.message);
      toast({
        title: 'Failed to delete task',
        description: err.response?.data?.message || err.message,
        type: 'error'
      });
    }
  };

  if (view === 'dashboard') {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Task Dashboard"
          subtitle="Overview of all your task activities and statistics"
          actions={[
            <div key="actions" className="flex gap-2">
              <Button
                variant={view === 'grid' ? 'primary' : 'outline'}
                onClick={() => setView('grid')}
                className="gap-2"
              >
                <LayoutGrid size={18} />
                Cards
              </Button>
              <Button
                variant={view === 'dashboard' ? 'primary' : 'outline'}
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </Button>
            </div>
          ]}
        />
        <TaskDashboard userId={null} onFilterChange={(newFilters) => {
          setFilters(prev => ({ ...prev, ...newFilters }));
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="My Tasks"
        subtitle="View and manage your assigned tasks"
        actions={[
          <Button key="create" onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={18} />
            Create Request
          </Button>,
          <div key="view-toggle" className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <Button
              size="sm"
              variant={view === 'grid' ? 'primary' : 'outline'}
              onClick={() => setView('grid')}
              className="gap-2"
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              size="sm"
              variant={view === 'list' ? 'primary' : 'outline'}
              onClick={() => setView('list')}
              className="gap-2"
            >
              <LayoutList size={16} />
            </Button>
            <Button
              size="sm"
              variant={view === 'dashboard' ? 'primary' : 'outline'}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </Button>
          </div>
        ]}
      />

      {/* Filters */}
      <TaskFilters filters={filters} onFiltersChange={setFilters} users={users} />

      {/* Content */}
      {loading ? (
        <Spinner className="mt-20" />
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            No tasks found. Create your first task or contact your manager.
          </p>
        </div>
      ) : view === 'list' ? (
        <TaskTable
          tasks={tasks}
          onView={setSelectedTask}
          onEdit={(task) => {
            setEditingTask(task);
            setSelectedTask(null);
          }}
          onStatusChange={handleStatusChange}
          onSort={(sortField) => setFilters({ ...filters, sort: sortField })}
          sortField={filters.sort}
        />
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}>
          {tasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onStatusChange={handleStatusChange}
              onViewDetails={setSelectedTask}
              onDelete={handleDeleteTask}
              onEdit={handleEditTask}
              isEmployee={true}
            />
          ))}
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

      {/* Create Task Modal */}
      {showCreateModal && (
        <ModalBase
          title="Create Task Request"
          onClose={() => setShowCreateModal(false)}
          className="max-w-2xl"
        >
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateModal(false)}
            isSubmitting={isSubmitting}
            users={users}
            departments={departments}
          />
        </ModalBase>
      )}

      {/* Edit modal removed (UI hidden) */}
    </div>
  );
}
