import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';

export default function MultiUserSelect({
  users = [],
  selectedUsers = [],
  onSelectedUsersChange,
  disabled = false,
  loading = false,
  label = 'Assign To',
  required = false,
  error = '',
  placeholder = 'Search and select users...',
  maxSelections = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(users);
  const containerRef = useRef(null);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(user =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleUser = (user) => {
    const isSelected = selectedUsers.some(u => u._id === user._id);

    if (isSelected) {
      onSelectedUsersChange(selectedUsers.filter(u => u._id !== user._id));
    } else {
      // Check max selections limit
      if (maxSelections && selectedUsers.length >= maxSelections) {
        return;
      }
      onSelectedUsersChange([...selectedUsers, user]);
    }
  };

  const removeUser = (userId) => {
    onSelectedUsersChange(selectedUsers.filter(u => u._id !== userId));
  };

  const isUserSelected = (userId) => {
    return selectedUsers.some(u => u._id === userId);
  };

  const isMaxReached = maxSelections && selectedUsers.length >= maxSelections;

  return (
    <div className="w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className={`relative border rounded-lg bg-white dark:bg-slate-900 transition-colors ${
        error
          ? 'border-red-500 dark:border-red-700'
          : 'border-slate-300 dark:border-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {/* Selected Users Display & Search */}
        <div
          className="flex flex-wrap items-center gap-2 p-2 min-h-12 cursor-pointer"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedUsers.length === 0 && !isOpen && (
            <span className="text-slate-400 dark:text-slate-500 text-sm">
              {placeholder}
            </span>
          )}

          {selectedUsers.map(user => (
            <div
              key={user._id}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm"
            >
              <span>
                {user.name}
                {user.isCurrentUser && (
                  <span className="ml-1 text-xs font-bold opacity-80">(you)</span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeUser(user._id);
                }}
                className="hover:text-blue-900 dark:hover:text-blue-100"
                disabled={disabled}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {isOpen && (
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full pl-8 pr-2 py-1 border-0 bg-transparent text-slate-900 dark:text-white focus:outline-none text-sm"
                  disabled={disabled}
                  autoFocus
                />
              </div>
            </div>
          )}

          {!isOpen && (
            <ChevronDown className={`ml-auto w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 border-t border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-b-lg z-50">
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  No users found
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user._id}
                    onClick={() => toggleUser(user)}
                    className={`p-3 border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-colors ${
                      isUserSelected(user._id)
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    } ${isMaxReached && !isUserSelected(user._id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white text-sm truncate">
                          {user.name}
                          {user.isCurrentUser && (
                            <span className="ml-1 text-xs font-bold text-blue-600 dark:text-blue-300">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isUserSelected(user._id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isUserSelected(user._id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {maxSelections && selectedUsers.length === maxSelections && (
              <div className="p-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                Maximum {maxSelections} user(s) selected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Helper Text */}
      {!error && selectedUsers.length > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {selectedUsers.length} user(s) selected
        </p>
      )}
    </div>
  );
}
