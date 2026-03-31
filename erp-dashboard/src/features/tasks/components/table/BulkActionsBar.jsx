import React, { useState } from 'react';
import { Trash2, ChevronDown, AlertCircle } from 'lucide-react';

// BulkActionDropdown Component - Outside of BulkActionsBar
const BulkActionDropdown = ({ label, options, onSelect, showMenu, setShowMenu, isLoading }) => (
  <div className="relative">
    <button
      onClick={() => setShowMenu(!showMenu)}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
    >
      <span className="text-sm font-medium">{label}</span>
      <ChevronDown size={16} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
    </button>

    {showMenu && (
      <div className="absolute top-full left-0 mt-2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 min-w-48">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => {
              onSelect(option.value);
              setShowMenu(false);
            }}
            disabled={isLoading}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              option.color || 'hover:bg-slate-100 dark:hover:bg-slate-700'
            } disabled:opacity-50`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )}
  </div>
);

const BulkActionsBar = ({
  selectedCount = 0,
  onBulkDelete,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkAssign,
  onClearSelection,
  isLoading = false,
  users = []
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkDelete = () => {
    console.log(`🗑️ [BulkActionsBar] Deleting ${selectedCount} tasks`);
    onBulkDelete?.();
    setShowDeleteConfirm(false);
  };

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-700' },
    { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'on-hold', label: 'On Hold', color: 'bg-gray-100 text-gray-700' },
    { value: 'under-review', label: 'Under Review', color: 'bg-purple-100 text-purple-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-300 text-slate-600' }
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-700' },
    { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' }
  ];

  return (
    <div className="sticky bottom-0 z-50 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-900 dark:to-indigo-800 text-white px-6 py-4 rounded-lg shadow-2xl mb-6 border-t border-indigo-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              {selectedCount}
            </div>
            <span className="text-sm font-semibold">
              {selectedCount === 1 ? 'Task' : 'Tasks'} selected
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Change Status */}
          <BulkActionDropdown
            label="Change Status"
            options={statusOptions}
            onSelect={(value) => {
              console.log(`📝 [BulkActionsBar] Setting status to ${value} for ${selectedCount} tasks`);
              onBulkStatusChange?.(value);
              setShowStatusMenu(false);
            }}
            showMenu={showStatusMenu}
            setShowMenu={setShowStatusMenu}
            isLoading={isLoading}
          />

          {/* Change Priority */}
          <BulkActionDropdown
            label="Change Priority"
            options={priorityOptions}
            onSelect={(value) => {
              console.log(`🎯 [BulkActionsBar] Setting priority to ${value} for ${selectedCount} tasks`);
              onBulkPriorityChange?.(value);
              setShowPriorityMenu(false);
            }}
            showMenu={showPriorityMenu}
            setShowMenu={setShowPriorityMenu}
            isLoading={isLoading}
          />

          {/* Assign To */}
          {users.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                <span className="text-sm font-medium">Assign To</span>
                <ChevronDown size={16} className={`transition-transform ${showAssignMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAssignMenu && (
                <div className="absolute top-full left-0 mt-2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 min-w-56 max-h-80 overflow-y-auto">
                  {users.map(user => (
                    <button
                      key={user._id}
                      onClick={() => {
                        console.log(`👤 [BulkActionsBar] Assigning ${selectedCount} tasks to ${user.firstName} ${user.lastName}`);
                        onBulkAssign?.(user._id);
                        setShowAssignMenu(false);
                      }}
                      disabled={isLoading}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {user.firstName} {user.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete Button */}
          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 font-medium"
            >
              <Trash2 size={18} />
              <span className="text-sm">Delete</span>
            </button>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="absolute top-full right-0 mt-2 z-40 bg-white dark:bg-slate-900 border-2 border-red-500 rounded-lg shadow-lg p-4 min-w-80">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Delete {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'}?</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      This action cannot be undone. All selected tasks will be permanently deleted.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </div>
                    ) : (
                      'Delete Tasks'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear Selection Button */}
          <button
            onClick={() => {
              onClearSelection?.();
              setShowDeleteConfirm(false);
              setShowStatusMenu(false);
              setShowPriorityMenu(false);
              setShowAssignMenu(false);
            }}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium text-sm disabled:opacity-50"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
