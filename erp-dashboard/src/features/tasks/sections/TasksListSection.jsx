import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { ListTodo, Filter, Search, ArrowUpDown, Eye, Trash2, Edit2 } from 'lucide-react';

export default function TasksListSection() {
  const [viewMode, setViewMode] = useState('table'); // table or grid

  // Placeholder task data
  const placeholderTasks = [
    { id: 1, title: 'Design new dashboard layout', assignee: 'Sarah Johnson', priority: 'high', status: 'In Progress', dueDate: '2026-03-28' },
    { id: 2, title: 'Update API documentation', assignee: 'Mike Davis', priority: 'medium', status: 'Pending', dueDate: '2026-03-30' },
    { id: 3, title: 'Implement payment gateway', assignee: 'Emma Wilson', priority: 'high', status: 'In Progress', dueDate: '2026-03-31' },
    { id: 4, title: 'Fix mobile responsiveness', assignee: 'John Smith', priority: 'medium', status: 'Completed', dueDate: '2026-03-25' },
    { id: 5, title: 'Review user feedback', assignee: 'Lisa Anderson', priority: 'low', status: 'Pending', dueDate: '2026-04-02' },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
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
      {/* Filters and Controls */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              />
            </div>
            <Button variant="secondary" size="md" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
            <Button variant="secondary" size="md" leftIcon={<ArrowUpDown className="w-4 h-4" />}>
              Sort
            </Button>
          </div>
        </div>
      </Card>

      {/* Task List Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Task Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {placeholderTasks.map((task, idx) => (
                <tr 
                  key={task.id}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {task.title}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {task.assignee}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200" title="View Details">
                        <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </button>
                      <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200" title="Edit">
                        <Edit2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </button>
                      <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing <span className="font-semibold">1-5</span> of <span className="font-semibold">47</span> tasks
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">← Previous</Button>
            <Button variant="secondary" size="sm">Next →</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
