import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Users, Grid3x3, LayoutList, Search, Filter, TrendingUp } from 'lucide-react';

export default function AllTasksSection() {
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  // Placeholder all tasks data
  const allTasks = [
    { id: 1, title: 'Design new dashboard', assignee: 'Sarah Johnson', team: 'Design', status: 'In Progress', progress: 65 },
    { id: 2, title: 'API implementation', assignee: 'Mike Davis', team: 'Engineering', status: 'In Progress', progress: 80 },
    { id: 3, title: 'Mobile optimization', assignee: 'Emma Wilson', team: 'Frontend', status: 'Pending', progress: 20 },
    { id: 4, title: 'Database migration', assignee: 'John Smith', team: 'Backend', status: 'In Progress', progress: 45 },
    { id: 5, title: 'Security audit', assignee: 'Lisa Anderson', team: 'DevOps', status: 'Completed', progress: 100 },
    { id: 6, title: 'Documentation update', assignee: 'Tom Brady', team: 'Tech Writing', status: 'Pending', progress: 10 },
  ];

  const getTeamColor = (team) => {
    const colors = {
      'Design': 'from-purple-500 to-purple-600',
      'Engineering': 'from-blue-500 to-blue-600',
      'Frontend': 'from-cyan-500 to-cyan-600',
      'Backend': 'from-indigo-500 to-indigo-600',
      'DevOps': 'from-green-500 to-green-600',
      'Tech Writing': 'from-pink-500 to-pink-600',
    };
    return colors[team] || 'from-slate-500 to-slate-600';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Pending':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Controls */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-64 relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search all tasks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            />
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" size="md" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
            
            <div className="flex gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-brand-accent shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-800 text-brand-accent shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="List View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTasks.map((task) => (
            <Card 
              key={task.id}
              className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
              interactive
            >
              {/* Team Badge */}
              <div className="mb-4">
                <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getTeamColor(task.team)}`}>
                  {task.team}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 line-clamp-2">
                {task.title}
              </h3>

              {/* Assignee */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-accent to-brand-accent/70 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {task.assignee}
                </span>
              </div>

              {/* Status and Progress */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                    {task.status}
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

              {/* Action Button */}
              <Button variant="primary" size="sm" className="w-full mt-auto">
                View Details
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="overflow-hidden">
          <div className="space-y-2">
            {allTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gradient-to-br ${getTeamColor(task.team)}`} />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>{task.assignee}</span>
                    <span>•</span>
                    <span>{task.team}</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Progress</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{task.progress}%</p>
                  </div>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <TrendingUp className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-brand-accent transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="p-6 grid grid-cols-3 gap-4 bg-gradient-to-br from-brand-accent/5 to-transparent dark:from-brand-accent/10">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {allTasks.filter(t => t.status === 'In Progress').length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {allTasks.filter(t => t.status === 'Pending').length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {allTasks.filter(t => t.status === 'Completed').length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Completed</p>
        </div>
      </Card>
    </div>
  );
}
