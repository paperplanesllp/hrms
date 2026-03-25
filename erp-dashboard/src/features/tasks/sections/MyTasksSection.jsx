import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { CheckCircle, Clock, AlertCircle, Flag, Calendar, FileText } from 'lucide-react';

export default function MyTasksSection() {
  const [filter, setFilter] = useState('all');

  // Placeholder tasks assigned to current user
  const myTasks = [
    {
      id: 1,
      title: 'Design new dashboard layout',
      description: 'Create wireframes and mockups for the new dashboard interface',
      dueDate: '2026-03-28',
      priority: 'high',
      status: 'In Progress',
      progress: 65,
      assignedBy: 'Admin',
    },
    {
      id: 2,
      title: 'Update API documentation',
      description: 'Add new endpoints documentation and examples',
      dueDate: '2026-03-30',
      priority: 'medium',
      status: 'Pending',
      progress: 0,
      assignedBy: 'Team Lead',
    },
    {
      id: 3,
      title: 'Fix mobile responsiveness',
      description: 'Ensure all pages work correctly on mobile devices',
      dueDate: '2026-03-25',
      priority: 'high',
      status: 'Completed',
      progress: 100,
      assignedBy: 'Manager',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return CheckCircle;
      case 'In Progress':
        return Clock;
      case 'Pending':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'In Progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'Pending':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'from-red-500 to-red-600';
      case 'medium':
        return 'from-amber-500 to-amber-600';
      case 'low':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const filteredTasks = filter === 'all' ? myTasks : myTasks.filter(t => t.status.toLowerCase().includes(filter));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3">
        {['all', 'Pending', 'In Progress', 'Completed'].map((status) => (
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
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => {
          const StatusIcon = getStatusIcon(task.status);
          
          return (
            <Card 
              key={task.id}
              className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col"
              interactive
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {task.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {task.description}
                  </p>
                </div>
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${getPriorityColor(task.priority)}`}>
                  <Flag className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Status and Progress */}
              <div className="space-y-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${getStatusColor(task.status)}`} />
                  <span className={`text-xs font-semibold ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Progress
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {task.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-accent to-brand-accent/80 transition-all duration-500"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Meta Information */}
              <div className="space-y-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Assigned by: {task.assignedBy}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto pt-4">
                <Button variant="primary" size="sm" className="flex-1">
                  Update Status
                </Button>
                <Button variant="secondary" size="sm" className="flex-1">
                  View Details
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            No tasks found with the selected filter.
          </p>
        </Card>
      )}
    </div>
  );
}
