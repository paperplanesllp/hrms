import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, LayoutList, Download } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Card from '../../components/ui/Card.jsx';
import api from '../../lib/api.js';
import { toast } from '../../store/toastStore.js';
import TaskCard from './TaskCard.jsx';
import TaskTable from './TaskTable.jsx';
import TaskFilters from './TaskFilters.jsx';
import TaskDetailsModal from './TaskDetailsModal.jsx';
import TaskDashboard from './TaskDashboard.jsx';
import ModalBase from '../../components/ui/Modal.jsx';
import TaskForm from './TaskForm.jsx';

export default function TasksManagePage() {
  const [view, setView] = useState('table'); // grid, table, dashboard
  const [allTasks, setAllTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const [filters, setFilters] = useState({
    search: '',
    priority: null,
    status: null,
    dateRange: 'all',
    assignedTo: null,
    sort: 'dueDate'
  });
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (view !== 'dashboard') {
      filterAndSortTasks();
    }
  }, [filters, sortField, sortDirection, allTasks]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes, deptsRes] = await Promise.all([
        api.get('/tasks', { params: { limit: 500 } }),
        api.get('/users'),
        api.get('/department')
      ]);
      setAllTasks(tasksRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
    } catch (err) {
      toast({
        title: 'Failed to load data',
        description: err.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTasks = () => {
    let filtered = [...allTasks];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(t => t.assignedTo?._id === filters.assignedTo);
    }

    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(t => {
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        switch (filters.dateRange) {
          case 'today':
            return dueDate.getTime() === today.getTime();
          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            weekEnd.setHours(0, 0, 0, 0);
            return dueDate >= weekStart && dueDate < weekEnd;
          case 'month':
            return dueDate.getMonth() === today.getMonth() && 
                   dueDate.getFullYear() === today.getFullYear();
          case 'overdue':
            return dueDate < today && t.status !== 'completed';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'dueDate':
          aVal = new Date(a.dueDate);
          bVal = new Date(b.dueDate);
          break;
        case 'priority':
          const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          aVal = priorityOrder[a.priority] || 2;
          bVal = priorityOrder[b.priority] || 2;
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTasks(filtered);
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleCreateTask = async (formData) => {
    try {
      setIsSubmitting(true);
      await api.post('/tasks', formData);
      toast({
        title: 'Task created successfully',
        type: 'success'
      });
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      toast({
        title: 'Failed to create task',
        description: err.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (formData) => {
    try {
      setIsSubmitting(true);
      await api.patch(`/tasks/${editingTask._id}`, formData);
      toast({
        title: 'Task updated successfully',
        type: 'success'
      });
      setEditingTask(null);
      loadData();
    } catch (err) {
      toast({
        title: 'Failed to update task',
        description: err.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast({
        title: 'Task deleted successfully',
        type: 'success'
      });
      setSelectedTask(null);
      loadData();
    } catch (err) {
      toast({
        title: 'Failed to delete task',
        description: err.message,
        type: 'error'
      });
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      const updatedTask = response.data?.data || response.data;
      
      // Update only the specific task in state instead of reloading all tasks
      setAllTasks(prevTasks =>
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

  if (view === 'dashboard') {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Task Dashboard"
          subtitle="Overview of all team task activities"
          actions={[
            <div key="view-toggle" className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <Button
                size="sm"
                variant={view === 'table' ? 'primary' : 'outline'}
                onClick={() => setView('table')}
              >
                <LayoutList size={16} />
              </Button>
              <Button
                size="sm"
                variant={view === 'grid' ? 'primary' : 'outline'}
                onClick={() => setView('grid')}
              >
                <LayoutGrid size={16} />
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
        <TaskDashboard userId={null} onFilterChange={(newFilters) => {
          setFilters(prev => ({ ...prev, ...newFilters }));
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Manage Tasks"
        subtitle="Assign, track, and manage team tasks with priority-based color system"
        actions={[
          <Button key="create" onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={18} />
            Create Task
          </Button>,
          <div key="view-toggle" className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <Button
              size="sm"
              variant={view === 'table' ? 'primary' : 'outline'}
              onClick={() => setView('table')}
            >
              <LayoutList size={16} />
            </Button>
            <Button
              size="sm"
              variant={view === 'grid' ? 'primary' : 'outline'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={16} />
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
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            No tasks found. Create your first task to get started.
          </p>
        </Card>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  onViewDetails={setSelectedTask}
                />
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <TaskTable
                tasks={filteredTasks}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
                onView={setSelectedTask}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </Card>
          )}
        </>
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
          title="Create New Task"
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
