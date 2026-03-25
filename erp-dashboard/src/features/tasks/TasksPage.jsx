import React, { useState } from 'react';
import { Plus, Filter, Download, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'task-list', label: 'Task List' },
    { id: 'assign', label: 'Assign Task' },
    { id: 'my-tasks', label: 'My Tasks' },
    { id: 'all-tasks', label: 'All Tasks' },
    { id: 'reports', label: 'Reports' },
  ];

  // Quick stats for the header
  const quickStats = [
    { icon: Clock, label: 'Active Tasks', value: '24', color: 'bg-blue-50', iconColor: 'text-blue-500' },
    { icon: CheckCircle, label: 'Completed', value: '48', color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { icon: AlertCircle, label: 'Overdue', value: '3', color: 'bg-red-50', iconColor: 'text-red-500' },
    { icon: TrendingUp, label: 'Completion Rate', value: '92%', color: 'bg-brand-accent/10', iconColor: 'text-brand-accent' },
  ];

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'overview':
        return <TasksOverviewSection />;
      case 'task-list':
        return <TasksListSection />;
      case 'assign':
        return <AssignTaskSection />;
      case 'my-tasks':
        return <MyTasksSection />;
      case 'all-tasks':
        return <AllTasksSection />;
      case 'reports':
        return <TaskReportsSection />;
      default:
        return <TasksOverviewSection />;
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
          >
            New Task
          </Button>,
        ]}
      />

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {quickStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-6 flex items-start gap-4 hover:shadow-lg transition-shadow duration-300">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

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
