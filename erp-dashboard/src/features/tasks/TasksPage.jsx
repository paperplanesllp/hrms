import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Clock, CheckCircle, AlertCircle, TrendingUp, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import PageTitle from '../../components/common/PageTitle.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import TasksTabNavigation from './TasksTabNavigation.jsx';
import TasksOverviewSection from './sections/TasksOverviewSection.jsx';
import TasksListSection from './sections/TasksListSection.jsx';
import AssignTaskSection from './sections/AssignTaskSection.jsx';
import MyTasksSection from './sections/MyTasksSection.jsx';
import AllTasksSection from './sections/AllTasksSection.jsx';
import TaskReportsSection from './sections/TaskReportsSection.jsx';

export default function TasksPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const accessToken = useAuthStore(s => s.accessToken);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshStatsKey, setRefreshStatsKey] = useState(0); // Trigger to refresh stats

  // Check authentication on mount
  useEffect(() => {
    if (!accessToken || !user) {
      toast({ title: 'Authentication Required', message: 'Please log in to access tasks', type: 'error' });
      navigate('/login', { replace: true });
    }
  }, [accessToken, user, navigate]);

  // Callback when a task is created
  const handleTaskCreated = () => {
    // Increment the key to trigger a refresh in TasksOverviewSection
    setRefreshStatsKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'task-list', label: 'Task List' },
    { id: 'assign', label: 'Assign Task' },
    { id: 'my-tasks', label: 'My Tasks' },
    { id: 'all-tasks', label: 'All Tasks' },
    { id: 'reports', label: 'Reports' },
  ];

// Quick stats for the header - available for future use
  // const quickStats = [
  //   { icon: Clock, label: 'Active Tasks', value: '24', color: 'bg-blue-50', iconColor: 'text-blue-500' },
  //   { icon: CheckCircle, label: 'Completed', value: '48', color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  //   { icon: AlertCircle, label: 'Overdue', value: '3', color: 'bg-red-50', iconColor: 'text-red-500' },
  //   { icon: TrendingUp, label: 'Completion Rate', value: '92%', color: 'bg-brand-accent/10', iconColor: 'text-brand-accent' },
  // ];

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'overview':
        return <TasksOverviewSection key={refreshStatsKey} onCreateTask={() => setActiveTab('assign')} onViewAnalytics={() => setActiveTab('reports')} />;
      case 'task-list':
        return <TasksListSection />;
      case 'assign':
        return <AssignTaskSection onTaskCreated={handleTaskCreated} />;
      case 'my-tasks':
        return <MyTasksSection />;
      case 'all-tasks':
        return <AllTasksSection />;
      case 'reports':
        return <TaskReportsSection />;
      default:
        return <TasksOverviewSection key={refreshStatsKey} onCreateTask={() => setActiveTab('assign')} onViewAnalytics={() => setActiveTab('reports')} />;
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
            onClick={() => setActiveTab('assign')}
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
    </div>
  );
}
