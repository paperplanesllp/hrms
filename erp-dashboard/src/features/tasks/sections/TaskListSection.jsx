import React, { useState, useEffect } from 'react';
import { Grid3x3, List, LayoutGrid } from 'lucide-react';
import TaskFilterBar from '../components/TaskFilterBar.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskLoadingSkeleton from '../components/TaskLoadingSkeleton.jsx';
import TaskEmptyState from '../components/TaskEmptyState.jsx';
import api from '../../../lib/api.js';


export default function TaskListSection({
  onViewTask,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  onRefreshStats
}) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState('grid'); // grid, list, kanban
  const [filters, setFilters] = useState({});
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadTasks();
    loadDepartments();
  }, [filters]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.from) queryParams.append('from', filters.from);
      if (filters.to) queryParams.append('to', filters.to);

      const response = await api.get(`/tasks/my?${queryParams.toString()}`);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await onTaskStatusChange?.(taskId, newStatus);
    loadTasks(); // Refresh list
  };

  // Group tasks by status for kanban view
  const groupedByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    completed: tasks.filter(t => t.status === 'completed'),
    'on-hold': tasks.filter(t => t.status === 'on-hold'),
    cancelled: tasks.filter(t => t.status === 'cancelled')
  };

  return (
    <div className="space-y-6 duration-300 animate-in fade-in">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task List</h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewType === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title="Grid view"
          >
            <Grid3x3 size={20} />
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewType === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title="List view"
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewType('kanban')}
            className={`p-2 rounded-lg transition-colors ${
              viewType === 'kanban'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title="Kanban view"
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <TaskFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onSearch={(search) => setFilters({ ...filters, search })}
        showDateRange={true}
        extraFilters={[
          {
            key: 'department',
            label: 'Department',
            type: 'select',
            placeholder: 'All Departments',
            options: departments.map(d => ({ label: d.name, value: d._id }))
          }
        ]}
      />

      {/* Content */}
      {isLoading ? (
        <TaskLoadingSkeleton type="cards" />
      ) : tasks.length === 0 ? (
        <TaskEmptyState
          title="No tasks found"
          description="Create your first task or adjust filters to see tasks"
          actionLabel="Create New Task"
        />
      ) : viewType === 'grid' ? (
        // Grid view
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onViewDetails={onViewTask}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : viewType === 'list' ? (
        // List view (table)
        <div className="overflow-x-auto border-2 border-gray-200 shadow-lg rounded-xl dark:border-gray-700">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700 dark:border-gray-700">
                <th className="px-6 py-4 text-sm font-bold text-left text-gray-900 dark:text-white">Title</th>
                <th className="px-6 py-4 text-sm font-bold text-left text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-left text-gray-900 dark:text-white">Priority</th>
                <th className="px-6 py-4 text-sm font-bold text-left text-gray-900 dark:text-white">Progress</th>
                <th className="px-6 py-4 text-sm font-bold text-left text-gray-900 dark:text-white">Due Date</th>
                <th className="px-6 py-4 text-sm font-bold text-left text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr
                  key={task._id}
                  className="transition-colors border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewTask(task)}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {task.title}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block text-xs font-bold px-2.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1.5 rounded-full ${
                      task.priority === 'URGENT' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                      task.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                      task.priority === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 h-2 overflow-hidden bg-gray-200 rounded-full dark:bg-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewTask(task)}
                      className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Kanban view
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Object.entries(groupedByStatus).map(([status, statusTasks]) => (
            <div key={status} className="p-4 border-2 border-gray-200 bg-gray-50 dark:bg-slate-800/50 rounded-xl dark:border-gray-700">
              <div className="pb-3 mb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <h3 className="mb-1 font-bold text-gray-900 capitalize dark:text-white">{status}</h3>
                <span className="inline-block px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                  {statusTasks.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {statusTasks.length > 0 ? (
                  statusTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => onViewTask(task)}
                      className="p-3 transition-all bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:bg-slate-700 dark:border-gray-600 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500"
                    >
                      <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
                        {task.title}
                      </h4>
                      <p className="mb-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                        {task.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{task.priority}</span>
                        <span className="text-gray-500 dark:text-gray-400">{task.progress || 0}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
