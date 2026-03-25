import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  getPriorityStyles,
  getStatusStyles
} from './taskUtils.js';

export default function TaskFilters({
  filters = {},
  onFiltersChange,
  users = []
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || null };
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    onFiltersChange({
      search: '',
      priority: null,
      status: null,
      assignedTo: null,
      dateRange: 'all',
      sort: 'dueDate'
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Search & Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={filters.priority || ''}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map(opt => {
              const styles = getPriorityStyles(opt.value);
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Toggle */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex-1"
          >
            <ChevronDown size={16} />
            Advanced
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange || 'all'}
                onChange={(e) => handleChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Assigned To
              </label>
              <select
                value={filters.assignedTo || ''}
                onChange={(e) => handleChange('assignedTo', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Sort By
              </label>
              <select
                value={filters.sort || 'dueDate'}
                onChange={(e) => handleChange('sort', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display & Reset */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            {/* Priority Badge */}
            {filters.priority && (
              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${getPriorityStyles(filters.priority).badge}`}>
                <span className="text-xs font-semibold">
                  {PRIORITY_OPTIONS.find(o => o.value === filters.priority)?.label}
                </span>
                <button
                  onClick={() => handleChange('priority', null)}
                  className="hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Status Badge */}
            {filters.status && (
              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${getStatusStyles(filters.status).badge}`}>
                <span className="text-xs font-semibold">
                  {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
                </span>
                <button
                  onClick={() => handleChange('status', null)}
                  className="hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Date Range Badge */}
            {filters.dateRange && filters.dateRange !== 'all' && (
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <span className="text-xs font-semibold capitalize">
                  {filters.dateRange}
                </span>
                <button
                  onClick={() => handleChange('dateRange', 'all')}
                  className="hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Assigned To Badge */}
            {filters.assignedTo && (
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                <span className="text-xs font-semibold">
                  {users.find(u => u._id === filters.assignedTo)?.name}
                </span>
                <button
                  onClick={() => handleChange('assignedTo', null)}
                  className="hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Search Badge */}
            {filters.search && (
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                <span className="text-xs font-semibold truncate max-w-xs">
                  "{filters.search}"
                </span>
                <button
                  onClick={() => handleChange('search', '')}
                  className="hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-shrink-0 ml-2"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
