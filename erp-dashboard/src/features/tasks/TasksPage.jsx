import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import api from '../../lib/api.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import RefreshStatus from '../../components/common/RefreshStatus.jsx';
import Button from '../../components/ui/Button.jsx';
import CreateTaskModal from './modals/CreateTaskModal.jsx';
import TasksTabNavigation from './TasksTabNavigation.jsx';
import TasksOverviewSection from './sections/TasksOverviewSection.jsx';
import MyTasksSection from './sections/MyTasksSection.jsx';
import AssignedTasksSection from './sections/AssignedTasksSection.jsx';
import TaskReportsSection from './sections/TaskReportsSection.jsx';
import { TaskRefreshProvider, useTaskRefresh } from './context/TaskRefreshContext.jsx';
import { useTaskSocketListener } from './hooks/useTaskSocketListener.js';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';

export default function TasksPage() {
  return (
    <TaskRefreshProvider>
      <TasksPageInner />
    </TaskRefreshProvider>
  );
}

function TasksPageInner() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const accessToken = useAuthStore(s => s.accessToken);
  const { triggerRefresh } = useTaskRefresh();
  
  // Initialize socket listener for real-time task updates
  useTaskSocketListener();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [myTasksInitialFilter, setMyTasksInitialFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const tasksRefresh = useAutoRefresh(
    async () => {
      triggerRefresh();
    },
    30000,
    { enabled: Boolean(user && accessToken) && !isCreateModalOpen }
  );

  // Check authentication on mount
  useEffect(() => {
    console.log('📄 [TasksPage] Component mounted');
    console.log('👤 [TasksPage] User:', user);
    console.log('🔐 [TasksPage] Access Token exists:', !!accessToken);
    
    if (!accessToken || !user) {
      console.error('❌ [TasksPage] Not authenticated, redirecting to login');
      toast({ title: 'Authentication Required', message: 'Please log in to access tasks', type: 'error' });
      navigate('/auth/login', { replace: true });
    } else {
      console.log('✅ [TasksPage] User is authenticated');
      console.log('👤 [TasksPage] User ID:', user?.id);
      console.log('👤 [TasksPage] User Name:', user?.name);
      loadFormData();
    }
  }, [accessToken, user, navigate]);

  // Load users and departments for task form
  async function loadFormData() {
    try {
      console.log('📥 [TasksPage] Loading users and departments...');
      const [usersResult, deptsResult] = await Promise.allSettled([
        api.get('/users/assignable?limit=1000'),
        api.get('/department?limit=1000')
      ]);

      const usersRes = usersResult.status === 'fulfilled' ? usersResult.value : null;
      const deptsRes = deptsResult.status === 'fulfilled' ? deptsResult.value : null;
      const usersList = usersRes ? (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || [])) : [];
      const deptsList = deptsRes ? (Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || [])) : [];

      console.log('✅ [TasksPage] Loaded users:', usersList.length);
      console.log('✅ [TasksPage] Loaded departments:', deptsList.length);
      
      setUsers(usersList);
      setDepartments(deptsList);
    } catch (err) {
      console.error('❌ [TasksPage] Error loading form data:', err);
    }
  }

  // Callback when a task is created
  const handleTaskCreated = () => {
    console.log('📝 [TasksPage] Task created, triggering global refresh');
    triggerRefresh();
  };

  // Open create task modal
  const handleOpenCreateModal = () => {
    console.log('🎯 [TasksPage] Opening create task modal');
    setIsCreateModalOpen(true);
  };

  const openMyTasks = (filter = 'all') => {
    setMyTasksInitialFilter(filter);
    setActiveTab('my-tasks');
  };

  const handleExportTasks = async () => {
    try {
      const res = await api.get('/tasks/my', { params: { limit: 1000 } });
      const tasks = res.data?.data || res.data || [];
      const rows = [
        ['Title', 'Status', 'Priority', 'Assigned By', 'Due', 'Estimated Minutes', 'Remaining', 'Created'],
        ...tasks.map((task) => [
          task.title || '',
          task.status || '',
          task.priority || '',
          task.assignedBy?.name || task.assignedBy?.email || '',
          task.dueAt || task.dueDate || '',
          task.estimatedTotalMinutes ?? task.estimatedMinutes ?? '',
          task.remainingLabel || '',
          task.createdAt || '',
        ])
      ];
      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Tasks exported', message: 'Your task list was downloaded as CSV.', type: 'success' });
    } catch (error) {
      toast({ title: 'Export failed', message: error?.response?.data?.message || error.message, type: 'error' });
    }
  };

  // Close create task modal
  const handleCloseCreateModal = () => {
    console.log('🎯 [TasksPage] Closing create task modal');
    setIsCreateModalOpen(false);
  };

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  const tabs = [
    { id: 'overview', label: 'Overview' },   
    { 
      id: 'task-list', 
      label: 'Task List',
      children: [
        { id: 'my-tasks', label: 'My Tasks' },
        { id: 'assigned-tasks', label: 'Tasks Assigned' }
      ]
    },
    ...(isAdminOrHR ? [{ id: 'reports', label: 'Reports' }] : []),
  ];

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'overview':
        return <TasksOverviewSection onCreateTask={handleOpenCreateModal} onViewAnalytics={() => setActiveTab('reports')} onOpenTaskList={openMyTasks} />;
      case 'my-tasks':
        return <MyTasksSection initialFilter={myTasksInitialFilter} />;
      case 'assigned-tasks':
        return <AssignedTasksSection />;
      case 'reports':
        return isAdminOrHR ? <TaskReportsSection /> : <TasksOverviewSection onCreateTask={handleOpenCreateModal} onViewAnalytics={() => setActiveTab('reports')} onOpenTaskList={openMyTasks} />;
      default:
        return <TasksOverviewSection onCreateTask={handleOpenCreateModal} onViewAnalytics={() => setActiveTab('reports')} onOpenTaskList={openMyTasks} />;
    }
  };

  return (
    <div className="animate-slideInUp">
      {/* Premium Page Header */}
      <PageTitle
        title="Task Management"
        subtitle="Organize, track, and manage team tasks efficiently with real-time updates and progress monitoring."
        icon={CheckCircle}
        actions={[
          <Button 
            key="filter"
            variant="secondary" 
            size="md"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => openMyTasks('all')}
          >
            Filter
          </Button>,
          <Button 
            key="export"
            variant="secondary" 
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportTasks}
          >
            Export
          </Button>,
          <Button 
            key="new-task"
            variant="primary" 
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            New Task
          </Button>,
        ]}
      />

      {/* Premium Tab Navigation */}
      <div className="mb-10">
        <div className="mb-4">
          <RefreshStatus
            isRefreshing={tasksRefresh.isRefreshing}
            lastUpdatedAt={tasksRefresh.lastUpdatedAt}
          />
        </div>
        <TasksTabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content Section */}
      <div className="animate-fadeIn">
        {renderActiveSection()}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onTaskCreated={handleTaskCreated}
        users={users}
        departments={departments}
      />
    </div>
  );
}
