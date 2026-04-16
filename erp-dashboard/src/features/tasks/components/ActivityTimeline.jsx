import React from 'react';
import { formatRelativeTime, getActivityIcon, formatActivityMessage } from '../utils/taskExecutionUtils.js';

export default function ActivityTimeline({ activityLog = [] }) {
  if (!activityLog || activityLog.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet</p>
      </div>
    );
  }

  // Sort by timestamp descending (newest first)
  const sortedActivities = [...activityLog].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="space-y-0">
      {sortedActivities.map((activity, index) => (
        <div key={activity._id || index} className="flex gap-4 pb-4 relative">
          {/* Timeline line */}
          {index < sortedActivities.length - 1 && (
            <div className="absolute left-5 top-9 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
          )}

          {/* Timeline dot and icon */}
          <div className="flex-shrink-0 relative">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center text-lg relative z-10">
              {getActivityIcon(activity.action)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatActivityMessage(activity)}
                </p>
                {activity.details?.message && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {activity.details.message}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {formatRelativeTime(activity.timestamp)}
            </p>

            {/* Details */}
            {activity.details && (
              <div className="mt-2 text-xs space-y-1">
                {activity.details.reason && (
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Reason:</span> {activity.details.reason}
                  </p>
                )}
                {activity.details.oldValue && activity.details.newValue && (
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Changed:</span> {activity.details.oldValue} → {activity.details.newValue}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
