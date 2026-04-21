import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import api from '../../lib/api.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import Button from '../../components/ui/Button.jsx';
import CreateTaskModal from './modals/CreateTaskModal.jsx';
import TasksTabNavigation from './TasksTabNavigation.jsx';
import TasksOverviewSection from './sections/TasksOverviewSection.jsx';
import MyTasksSection from './sections/MyTasksSection.jsx';
import AssignedTasksSection from './sections/AssignedTasksSection.jsx';
import TaskReportsSection from './sections/TaskReportsSection.jsx';
import { TaskRefreshProvider, useTaskRefresh } from './context/TaskRefreshContext.jsx';
import { useTaskSocketListener } from './hooks/useTaskSocketListener.js';

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Check authentication on mount
  useEffect(() => {
    console.log('📄 [TasksPage] Component mounted');
    console.log('👤 [TasksPage] User:', user);
    console.log('🔐 [TasksPage] Access Token exists:', !!accessToken);
    
    if (!accessToken || !user) {
      console.error('❌ [TasksPage] Not authenticated, redirecting to login');
      toast({ title: 'Authentication Required', message: 'Please log in to access tasks', type: 'error' });
      navigate('/login', { replace: true });
    } else {
      console.log('✅ [TasksPage] User is authenticated');
      console.log('👤 [TasksPage] User ID:', user?.id);
      console.log('👤 [TasksPage] User Name:', user?.name);
      loadFormData();
    }
  }, [accessToken, user, navigate]);

  // Load users and departments for task form
  const loadFormData = async () => {
    try {
      console.log('📥 [TasksPage] Loading users and departments...');
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users?limit=1000'),
        api.get('/department?limit=1000')
      ]);

      const usersList = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
      const deptsList = Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || []);

      console.log('✅ [TasksPage] Loaded users:', usersList.length);
      console.log('✅ [TasksPage] Loaded departments:', deptsList.length);
      
      setUsers(usersList);
      setDepartments(deptsList);
    } catch (err) {
      console.error('❌ [TasksPage] Error loading form data:', err);
    }
  };

  // Callback when a task is created
  const handleTaskCreated = (newTask) => {
    console.log('📝 [TasksPage] Task created, triggering global refresh');
    triggerRefresh();
  };

  // Open create task modal
  const handleOpenCreateModal = () => {
    console.log('🎯 [TasksPage] Opening create task modal');
    setIsCreateModalOpen(true);
  };

  // Close create task modal
  const handleCloseCreateModal = () => {
    console.log('🎯 [TasksPage] Closing create task modal');
    setIsCreateModalOpen(false);
  };

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
    { id: 'reports', label: 'Reports' },
  ];

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'overview':
        return <TasksOverviewSection onCreateTask={handleOpenCreateModal} onViewAnalytics={() => setActiveTab('reports')} />;
      case 'my-tasks':
        return <MyTasksSection />;
      case 'assigned-tasks':
        return <AssignedTasksSection />;
      case 'reports':
        return <TaskReportsSection />;
      default:
        return <TasksOverviewSection onCreateTask={handleOpenCreateModal} onViewAnalytics={() => setActiveTab('reports')} />;
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
          >
            Filter
          </Button>,
          <Button 
            key="export"
            variant="secondary" 
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
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
