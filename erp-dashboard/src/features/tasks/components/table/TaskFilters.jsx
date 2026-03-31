import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search, Sliders } from 'lucide-react';

// FilterDropdown Component - Outside of TaskFilters
const FilterDropdown = ({ 
  label, 
  filterType, 
  options, 
  selectedValues, 
  activeDropdown,
  setActiveDropdown,
  toggleFilter 
}) => {
  const isOpen = activeDropdown === filterType;
  const count = selectedValues?.length || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setActiveDropdown(isOpen ? null : filterType)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          count > 0
            ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
      >
        <span className="text-sm font-medium">{label}</span>
        {count > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold">
            {count}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 min-w-56 max-h-80 overflow-y-auto">
          {options.map(option => {
            const isSelected = selectedValues?.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleFilter(filterType, option.value)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <div className="flex-1 flex items-center gap-2">
                  {option.color && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  )}
                  {!option.color && (
                    <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TaskFilters = ({
  filters,
  onFilterChange,
  onSearchChange,
  searchQuery = '',
  users = [],
  departments = []
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const containerRef = useRef(null);

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-700' },
    { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'on-hold', label: 'On Hold', color: 'bg-gray-100 text-gray-700' },
    { value: 'under-review', label: 'Under Review', color: 'bg-purple-100 text-purple-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-300 text-slate-600' }
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-700' },
    { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' }
  ];

  const dueDateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'no-date', label: 'No Due Date' }
  ];

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilter = (filterType, value) => {
    const currentValues = filters[filterType] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFilterChange(filterType, newValues);
  };

  const clearAllFilters = () => {
    onFilterChange('status', []);
    onFilterChange('priority', []);
    onFilterChange('department', []);
    onFilterChange('assignedTo', []);
    onFilterChange('dueDate', []);
  };

  const hasActiveFilters = (
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    (filters.department && filters.department.length > 0) ||
    (filters.assignedTo && filters.assignedTo.length > 0) ||
    (filters.dueDate && filters.dueDate.length > 0)
  );

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Search by task title, assigned user, department..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Sliders size={18} />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Status Filter */}
        <FilterDropdown
          label="Status"
          filterType="status"
          options={statusOptions}
          selectedValues={filters.status}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          toggleFilter={toggleFilter}
        />

        {/* Priority Filter */}
        <FilterDropdown
          label="Priority"
          filterType="priority"
          options={priorityOptions}
          selectedValues={filters.priority}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          toggleFilter={toggleFilter}
        />

        {/* Department Filter */}
        {departments.length > 0 && (
          <FilterDropdown
            label="Department"
            filterType="department"
            options={departments.map(d => ({ value: d._id, label: d.name }))}
            selectedValues={filters.department}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            toggleFilter={toggleFilter}
          />
        )}

        {/* Assigned To Filter */}
        {users.length > 0 && (
          <FilterDropdown
            label="Assigned To"
            filterType="assignedTo"
            options={users.map(u => ({ 
              value: u._id, 
              label: `${u.firstName} ${u.lastName}` 
            }))}
            selectedValues={filters.assignedTo}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            toggleFilter={toggleFilter}
          />
        )}

        {/* Due Date Filter */}
        <FilterDropdown
          label="Due Date"
          filterType="dueDate"
          options={dueDateOptions}
          selectedValues={filters.dueDate}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          toggleFilter={toggleFilter}
        />

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <X size={16} />
            <span className="text-sm font-medium">Clear All</span>
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-300">
            <strong>Active Filters:</strong>
            {filters.status?.length > 0 && ` Status (${filters.status.length})`}
            {filters.priority?.length > 0 && ` • Priority (${filters.priority.length})`}
            {filters.department?.length > 0 && ` • Department (${filters.department.length})`}
            {filters.assignedTo?.length > 0 && ` • Assigned To (${filters.assignedTo.length})`}
            {filters.dueDate?.length > 0 && ` • Due Date (${filters.dueDate.length})`}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
