import React, { useState, useCallback, useMemo, memo } from 'react';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import TaskRow from './TaskRow.jsx';
import TaskFilters from './TaskFilters.jsx';
import BulkActionsBar from './BulkActionsBar.jsx';
import ReminderDropdown from './ReminderDropdown.jsx';

const ITEMS_PER_PAGE = 15;

const PremiumTaskTable = ({
  tasks = [],
  onTaskUpdate,
  onTaskDelete,
  onBulkTasksDelete,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkAssign,
  onTaskCreate,
  users = [],
  departments = [],
  isLoading = false
}) => {
  // State Management
  const [sortField, setSortField] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    department: [],
    assignedTo: [],
    dueDate: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Filtering Function
  const filteredTasks = useMemo(() => {
    console.log('🔍 [TaskTable] Filtering tasks with:', { filters, searchQuery });
    
    return tasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(query);
        const userMatch = users.find(u => u._id === task.assignedTo)?.firstName?.toLowerCase().includes(query);
        const deptMatch = departments.find(d => d._id === task.department)?.name?.toLowerCase().includes(query);
        
        if (!titleMatch && !userMatch && !deptMatch) return false;
      }

      // Status filter
      if (filters.status?.length > 0 && !filters.status.includes(task.status)) return false;

      // Priority filter
      if (filters.priority?.length > 0 && !filters.priority.includes(task.priority)) return false;

      // Department filter
      if (filters.department?.length > 0 && !filters.department.includes(task.department)) return false;

      // Assigned To filter
      if (filters.assignedTo?.length > 0 && !filters.assignedTo.includes(task.assignedTo)) return false;

      // Due Date filter
      if (filters.dueDate?.length > 0) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const monthEnd = new Date(today);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        let dateMatched = false;

        for (let dateFilter of filters.dueDate) {
          const taskDueDate = new Date(task.dueDate);
          const taskDateOnly = new Date(taskDueDate.getFullYear(), taskDueDate.getMonth(), taskDueDate.getDate());
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const tomorrowDateOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

          switch (dateFilter) {
            case 'today':
              if (taskDateOnly.getTime() === todayDateOnly.getTime()) dateMatched = true;
              break;
            case 'tomorrow':
              if (taskDateOnly.getTime() === tomorrowDateOnly.getTime()) dateMatched = true;
              break;
            case 'this-week':
              if (taskDueDate <= weekEnd && taskDueDate >= today) dateMatched = true;
              break;
            case 'this-month':
              if (taskDueDate <= monthEnd && taskDueDate >= today) dateMatched = true;
              break;
            case 'overdue':
              if (taskDueDate < todayDateOnly) dateMatched = true;
              break;
            case 'no-date':
              if (!task.dueDate) dateMatched = true;
              break;
            default:
              break;
          }

          if (dateMatched) break;
        }

        if (!dateMatched) return false;
      }

      return true;
    });
  }, [tasks, filters, searchQuery, users, departments]);

  // Sorting Function
  const sortedTasks = useMemo(() => {
    console.log(`📊 [TaskTable] Sorting by ${sortField} ${sortDirection}`);
    
    const sorted = [...filteredTasks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle special cases
      if (sortField === 'assignedTo') {
        const aUser = users.find(u => u._id === a.assignedTo);
        const bUser = users.find(u => u._id === b.assignedTo);
        aVal = `${aUser?.firstName || ''} ${aUser?.lastName || ''}`;
        bVal = `${bUser?.firstName || ''} ${bUser?.lastName || ''}`;
      }

      // Handle null values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Compare
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return sorted;
  }, [filteredTasks, sortField, sortDirection, users]);

  // Pagination
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTasks, currentPage]);

  const totalPages = Math.ceil(sortedTasks.length / ITEMS_PER_PAGE);

  // Handlers
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    console.log(`🔄 [TaskTable] Sort changed: ${field} ${sortDirection}`);
  }, [sortField, sortDirection]);

  const handleFilterChange = useCallback((filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
    setCurrentPage(1);
    console.log(`🔽 [TaskTable] Filter ${filterType} changed:`, values);
  }, []);

  const handleTaskSelect = useCallback((taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      console.log(`✅ [TaskTable] Task ${taskId} ${newSet.has(taskId) ? 'selected' : 'deselected'}`);
      return newSet;
    });
  }, []);

  const handleDragStart = useCallback((taskId) => {
    setDraggedTaskId(taskId);
    console.log(`🎯 [TaskTable] Drag started: ${taskId}`);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    console.log(`🗑️ [TaskTable] Deleting ${selectedTasks.size} tasks...`);
    const taskIds = Array.from(selectedTasks);
    await onBulkTasksDelete?.(taskIds);
    setSelectedTasks(new Set());
  }, [selectedTasks, onBulkTasksDelete]);

  const handleBulkStatusChange = useCallback((status) => {
    console.log(`📝 [TaskTable] Changing status to ${status} for ${selectedTasks.size} tasks`);
    const taskIds = Array.from(selectedTasks);
    onBulkStatusChange?.(taskIds, status);
  }, [selectedTasks, onBulkStatusChange]);

  const handleBulkPriorityChange = useCallback((priority) => {
    console.log(`🎯 [TaskTable] Changing priority to ${priority} for ${selectedTasks.size} tasks`);
    const taskIds = Array.from(selectedTasks);
    onBulkPriorityChange?.(taskIds, priority);
  }, [selectedTasks, onBulkPriorityChange]);

  const handleBulkAssign = useCallback((userId) => {
    console.log(`👤 [TaskTable] Assigning ${selectedTasks.size} tasks to user ${userId}`);
    const taskIds = Array.from(selectedTasks);
    onBulkAssign?.(taskIds, userId);
  }, [selectedTasks, onBulkAssign]);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
    console.log('🔄 [TaskTable] Selection cleared');
  }, []);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="opacity-30 group-hover:opacity-60 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
        <TaskFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          users={users}
          departments={departments}
        />
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedTasks.size}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkAssign={handleBulkAssign}
        onClearSelection={handleClearSelection}
        isLoading={isLoading}
        users={users}
      />

      {/* Results Info */}
      <div className="flex items-center justify-between px-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Showing <strong>{paginatedTasks.length}</strong> of <strong>{sortedTasks.length}</strong> tasks
          {filteredTasks.length < tasks.length && (
            <> from <strong>{tasks.length}</strong> total</>
          )}
        </p>
      </div>

      {/* Table Section */}
      {sortedTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No tasks match your filters</p>
          <button
            onClick={onTaskCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus size={18} />
            Create New Task
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {/* Checkbox Header */}
                  <th className="px-4 py-3 w-12">
                    <button
                      onClick={() => {
                        if (selectedTasks.size === paginatedTasks.length) {
                          setSelectedTasks(new Set());
                        } else {
                          const newSet = new Set(paginatedTasks.map(t => t._id));
                          setSelectedTasks(newSet);
                        }
                      }}
                      className={`w-6 h-6 rounded border-2 transition-colors ${
                        selectedTasks.size === paginatedTasks.length && paginatedTasks.length > 0
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                      title={selectedTasks.size > 0 ? 'Deselect all' : 'Select all on page'}
                    />
                  </th>

                  {/* Priority Header */}
                  <th className="px-4 py-3 w-28">
                    <button
                      onClick={() => handleSort('priority')}
                      className="group flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      Priority
                      {renderSortIcon('priority')}
                    </button>
                  </th>

                  {/* Title Header */}
                  <th className="px-4 py-3 flex-1 min-w-64">
                    <button
                      onClick={() => handleSort('title')}
                      className="group flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      Task Title
                      {renderSortIcon('title')}
                    </button>
                  </th>

                  {/* Assigned To Header */}
                  <th className="px-4 py-3 w-40">
                    <button
                      onClick={() => handleSort('assignedTo')}
                      className="group flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      Assigned To
                      {renderSortIcon('assignedTo')}
                    </button>
                  </th>

                  {/* Status Header */}
                  <th className="px-4 py-3 w-40">
                    <button
                      onClick={() => handleSort('status')}
                      className="group flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      Status
                      {renderSortIcon('status')}
                    </button>
                  </th>

                  {/* Due Date Header */}
                  <th className="px-4 py-3 w-32">
                    <button
                      onClick={() => handleSort('dueDate')}
                      className="group flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      Due Date
                      {renderSortIcon('dueDate')}
                    </button>
                  </th>

                  {/* Progress Header */}
                  <th className="px-4 py-3 w-40 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Progress
                  </th>

                  {/* Reminder Header */}
                  <th className="px-4 py-3 w-12 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Reminder
                  </th>

                  {/* Actions Header */}
                  <th className="px-4 py-3 w-20 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedTasks.map(task => (
                  <TaskRow
                    key={task._id}
                    task={task}
                    onUpdate={onTaskUpdate}
                    onDelete={onTaskDelete}
                    onSelect={handleTaskSelect}
                    isSelected={selectedTasks.has(task._id)}
                    isDragging={draggedTaskId === task._id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    users={users}
                    departments={departments}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        pageNum === currentPage
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(PremiumTaskTable);
