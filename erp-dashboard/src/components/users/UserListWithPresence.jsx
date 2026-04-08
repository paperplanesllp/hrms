import React, { useEffect, useState, useCallback } from 'react';
import { usePresenceStore } from '../../store/presenceStore.js';
import UserListItem from '../../components/users/UserListItem.jsx';
import { getSocket } from '../../lib/socket.js';
import api from '../../lib/api.js';
import { Search, Users, Eye, Users2 } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';

/**
 * UserListWithPresence Component
 * Displays a list of users with real-time presence status
 * 
 * Features:
 * - Real-time presence updates via Socket.IO
 * - Search functionality
 * - Filter by status (All, Online, Offline)
 * - Online count display
 * - Responsive design
 * - Activity tracking
 */
const UserListWithPresence = ({ 
  onUserSelect = () => {},
  onMessage = () => {},
  showMessageAction = true,
  maxHeight = 'max-h-[600px]'
}) => {
  const {
    users,
    initializeUsers,
    searchUsers,
    getSortedUsers,
    getOnlineCount,
    setFilterStatus,
    filteredStatus
  } = usePresenceStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayUsers, setDisplayUsers] = useState([]);

  // Load users from API on mount (presenceStore is kept in sync by SocketProvider)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/users');
        const users = Array.isArray(response.data) ? response.data : response.data?.users || [];
        initializeUsers(users);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [initializeUsers]);

  // Update displayed users when search, filter, or users change
  useEffect(() => {
    let results;
    
    if (searchQuery.trim()) {
      results = searchUsers(searchQuery, filteredStatus);
    } else {
      results = getSortedUsers(filteredStatus);
    }

    setDisplayUsers(results);
  }, [searchQuery, filteredStatus, users, searchUsers, getSortedUsers]);

  // Report activity when user interacts
  const handleUserInteraction = useCallback(() => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('user:activity');
    }
  }, []);

  const onlineCount = getOnlineCount();
  const totalCount = Object.keys(users).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Users & Presence
            </h2>
          </div>
          
          {/* Online Count Badge */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700 dark:text-green-200">
                {onlineCount} online
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Users2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {totalCount} total
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleUserInteraction();
            }}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-3">
          {['all', 'online', 'offline'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                handleUserInteraction();
              }}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${filteredStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div 
        className={`flex-1 overflow-y-auto ${maxHeight} scrollbar-thin`}
        onMouseMove={handleUserInteraction}
        onClick={handleUserInteraction}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Eye className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-medium">No users found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {displayUsers.map((user) => (
              <UserListItem
                key={user._id}
                user={user}
                onSelect={onUserSelect}
                onMessage={onMessage}
                showAction={showMessageAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
        {displayUsers.length > 0 && (
          <p>
            Showing {displayUsers.length} of {totalCount} user{totalCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserListWithPresence;
