import React from 'react';
import { getCompletePresenceInfo } from '../../lib/presenceUtils.js';
import { useAuthStore } from '../../store/authStore.js';

/**
 * UserListItem Component
 * Displays a user with their online/offline status, last seen time, and more
 * 
 * Features:
 * - Animated status dot (green online, yellow away, gray offline)
 * - Human-readable last seen time
 * - Hover tooltip with exact timestamp
 * - Responsive design
 * - Mobile-friendly
 */
const UserListItem = React.forwardRef(({ 
  user, 
  onSelect,
  onMessage,
  showAction = false,
  isSelected = false
}, ref) => {
  const currentUser = useAuthStore((s) => s.user);
  const isCurrentUser = currentUser?._id === user?._id;

  const presenceInfo = getCompletePresenceInfo(user);

  return (
    <div
      ref={ref}
      onClick={() => onSelect?.(user)}
      className={`
        group flex items-center gap-3 px-4 py-3 rounded-lg
        cursor-pointer transition-all duration-200
        hover:bg-blue-50 dark:hover:bg-blue-900/20
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-transparent'}
        border border-transparent hover:border-blue-200 dark:hover:border-blue-800
      `}
    >
      {/* Profile Image Container */}
      <div className="relative flex-shrink-0">
        <img
          src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`}
          alt={user?.name}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
        />

        {/* Status Dot */}
        <div
          className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
            border-[2px] border-white dark:border-gray-800
            transition-colors duration-300
            ${presenceInfo.statusColor}
            ring-2 ${presenceInfo.statusRing}
            ${presenceInfo.statusPulse ? 'animate-pulse' : ''}
          `}
          title={presenceInfo.fullTooltip}
        />
      </div>

      {/* User Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {user?.name}
          </h3>

          {/* "You" Badge */}
          {isCurrentUser && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full whitespace-nowrap">
              You
            </span>
          )}

          {/* Status Badge */}
          <span className={`
            px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
            ${presenceInfo.isActiveNow 
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
              : presenceInfo.isAway
              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200'
              : presenceInfo.isOnline
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }
          `}>
            {presenceInfo.statusLabel}
          </span>
        </div>

        {/* Email and Last Seen */}
        <div className="flex flex-col gap-0.5 mt-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {user?.email}
          </p>
          
          <p title={presenceInfo.fullTooltip} className={`
            text-xs transition-colors
            ${presenceInfo.isOnline 
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-500'
            }
          `}>
            {presenceInfo.lastSeenText}
          </p>
        </div>
      </div>

      {/* Action Button */}
      {showAction && !isCurrentUser && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMessage?.(user);
          }}
          className={`
            flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium
            transition-all duration-200
            opacity-0 group-hover:opacity-100
            ${presenceInfo.isOnline
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
            }
          `}
        >
          Message
        </button>
      )}
    </div>
  );
});

UserListItem.displayName = 'UserListItem';

export default UserListItem;
