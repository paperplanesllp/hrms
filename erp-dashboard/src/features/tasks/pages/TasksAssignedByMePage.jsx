import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Eye, Trash2, Download, Sliders } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import api from '../../lib/api.js';
import { toast } from '../../store/toastStore.js';
import TaskTable from './TaskTable.jsx';
import TaskFilters from './TaskFilters.jsx';
import TaskDetailsModal from './TaskDetailsModal.jsx';
import ModalBase from '../../components/ui/Modal.jsx';
import TaskForm from './TaskForm.jsx';

export default function TasksAssignedByMePage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    priority: null,
    status: null,
    dateRange: 'all',
    sort: 'dueDate'
  });

  // Load initial data
  useEffect(() => {
    console.log('Component mounted, loading initial data');
    loadData();
  }, []);

  // Load tasks when filters change
  useEffect(() => {
    console.log('Filters changed, loading tasks. Filters:', filters);
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users?limit=1000'),
        api.get('/department?limit=1000')
      ]);

      const usersList = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
      const deptsList = Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || []);

      setUsers(usersList);
      setDepartments(deptsList);
    } catch (err) {
      console.error('Error loading data:', err);
      toast({ title: 'Error loading data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = useCallback(async () => {
    try {
      const params = {
        priority: filters.priority,
        status: filters.status,
        search: filters.search,
        sort: filters.sort,
        limit: 500
      };

      if (filters.dateRange && filters.dateRange !== 'all') {
        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.from) params.from = dateRange.from.toISOString();
        if (dateRange.to) params.to = dateRange.to.toISOString();
      }

      const response = await api.get('/tasks/assigned', { params });
      const tasksData = response.data?.data || response.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      toast({
        title: 'Failed to load tasks',
        description: err.response?.data?.message || err.message,
        type: 'error'
      });
      setTasks([]);
    }
  }, [filters]);

  const getDateRange = (range) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (range) {
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

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      toast({ title: `Task marked as ${newStatus}`, type: 'success' });
      loadTasks();
      setShowDetailsModal(false);
    } catch (err) {
      toast({
        title: 'Failed to update task',
        description: err.message,
        type: 'error'
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      toast({ title: 'Task deleted successfully', type: 'success' });
      loadTasks();
    } catch (err) {
      toast({
        title: 'Failed to delete task',
        description: err.message,
        type: 'error'
      });
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await api.post('/tasks', taskData);
      toast({ title: 'Task created successfully', type: 'success' });
      setShowCreateModal(false);
      loadTasks();
    } catch (err) {
      console.error('Error creating task:', err);
      toast({
        title: 'Failed to create task',
        description: err.response?.data?.message || err.message,
        type: 'error'
      });
    }
  };

  const handleExport = () => {
    if (tasks.length === 0) {
      toast({ title: 'No tasks to export', type: 'error' });
      return;
    }

    try {
      // Prepare CSV headers
      const headers = ['Task Title', 'Priority', 'Status', 'Due Date', 'Assigned To', 'Department', 'Progress', 'Description'];
      
      // Prepare CSV rows
      const rows = tasks.map(task => [
        task.title || '',
        task.priority || '',
        task.status || '',
        task.dueDate ? new Date(task.dueDate).toLocaleString('en-IN', { 
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
          timeZone: 'Asia/Kolkata'
        }) : '',
        task.assignedTo?.length > 0
          ? (Array.isArray(task.assignedTo) ? task.assignedTo.map(a => a?.name || a).join('; ') : task.assignedTo?.name || '')
          : '',
        task.department?.name || '',
        task.progress || 0,
        task.description || ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => 
            // Escape cells containing commas or quotes
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tasks-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: `Exported ${tasks.length} tasks successfully`, type: 'success' });
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: 'Failed to export tasks',
        description: err.message,
        type: 'error'
      });
    }
  };

  if (loading) return <Spinner className="mt-20" />;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Tasks Assigned by Me"
        subtitle="Manage and track tasks you've assigned to your team"
      />

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border rounded-lg dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <Button 
          variant="outline" 
          onClick={() => {
            console.log('Filter button clicked, current state:', showFilters);
            setShowFilters(!showFilters);
          }}
          className="gap-2"
        >
          <Sliders size={18} />
          Filter {filters.priority || filters.status || filters.search || filters.dateRange !== 'all' ? '✓' : ''}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log('Export button clicked');
            handleExport();
          }}
          className="gap-2"
        >
          <Download size={18} />
          Export
        </Button>
        
        <Button 
          onClick={() => {
            console.log('New Task button clicked, opening modal');
            setShowCreateModal(true);
          }} 
          className="gap-2 ml-auto text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={18} />
          New Task
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="animate-in fade-in">
          <TaskFilters filters={filters} onFiltersChange={setFilters} users={users} />
        </div>
      )}

      {/* Task Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Total Tasks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{tasks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.status === 'pending' || t.status === 'new').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'in-progress').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</p>
        </Card>
      </div>

      {/* Tasks Table */}
      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">No tasks assigned by you</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TaskTable
            tasks={tasks}
            onViewTask={(task) => {
              setSelectedTask(task);
              setShowDetailsModal(true);
            }}
            onDeleteTask={handleDeleteTask}
          />
        </Card>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTask(null);
          }}
          onStatusChange={handleStatusChange}
          onDelete={() => {
            handleDeleteTask(selectedTask._id);
            setShowDetailsModal(false);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <ModalBase 
          title="Create New Task"
          isOpen={showCreateModal} 
          onClose={() => {
            console.log('Closing create task modal');
            setShowCreateModal(false);
          }}
          size="lg"
        >
          <TaskForm
            onSubmit={(taskData) => {
              console.log('TaskForm submitted with data:', taskData);
              handleCreateTask(taskData);
            }}
            onCancel={() => {
              console.log('TaskForm cancelled');
              setShowCreateModal(false);
            }}
            users={users}
            departments={departments}
            isPersonalTask={false}
          />
        </ModalBase>
      )}
    </div>
  );
}
