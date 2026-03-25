/**
 * INTEGRATION EXAMPLES
 * How to integrate the Activity Timeline into existing dashboard pages
 */

// ============================================================================
// EXAMPLE 1: Add Activity Timeline Widget to HR Dashboard
// ============================================================================

// File: erp-dashboard/src/features/hr/HRDashboardPage.jsx (or your HR dashboard)

import React from "react";
import { useActivityTimeline } from "../../hooks/useActivityTimeline";
import { HRTimeline } from "../../components/common/ActivityTimeline";
import { Users, Activity } from "lucide-react";

export default function EnhancedHRDashboard() {
  return (
    <div className="space-y-8 p-6">
      {/* Existing HR Dashboard Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Your existing cards: Total Employees, Leave Requests, etc. */}
      </div>

      {/* NEW: Activity Timeline Section */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Staff Activity Monitor
          </h2>
        </div>

        <div className="p-6">
          <HRTimeline />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Add Activity Widget to Admin Dashboard
// ============================================================================

// File: erp-dashboard/src/features/admin/AdminAnalyticsDashboard.jsx (or your admin dashboard)

import React from "react";
import { AdminTimeline } from "../../components/common/ActivityTimeline";
import { BarChart, Activity } from "lucide-react";

export default function EnhancedAdminDashboard() {
  return (
    <div className="space-y-8 p-6">
      {/* Existing Admin Analytics */}
      <div className="grid grid-cols-4 gap-4">
        {/* Your existing stats cards */}
      </div>

      {/* Existing Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Your existing charts */}
      </div>

      {/* NEW: HR Activity Log Section */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            HR Activity Log
          </h2>
        </div>

        <div className="p-6">
          <AdminTimeline />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Compact Activity Feed (For Sidebar/Widget)
// ============================================================================

import { useActivityTimeline } from "../../hooks/useActivityTimeline";
import { Clock } from "lucide-react";

export function RecentActivityWidget() {
  const { activities, loading } = useActivityTimeline("hr-timeline");

  // Show only last 5 activities
  const recentActivities = activities.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
      </div>

      <div className="divide-y">
        {recentActivities.map((activity) => (
          <div key={activity._id} className="px-4 py-3 text-sm hover:bg-gray-50">
            <p className="font-medium text-gray-900">
              {activity.actorName}
            </p>
            <p className="text-gray-600 text-xs">
              {activity.description}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {new Date(activity.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Filtering Activities
// ============================================================================

import React, { useState } from "react";
import { useActivityTimeline } from "../../hooks/useActivityTimeline";

export function FilteredActivityTimeline() {
  const [selectedModule, setSelectedModule] = useState("all");
  const { activities, loading, refresh } = useActivityTimeline(
    "hr-timeline"
  );

  const handleFilterChange = (module) => {
    setSelectedModule(module);
    // Refresh with filter
    refresh({
      module: module === "all" ? undefined : module,
    });
  };

  const filteredActivities =
    selectedModule === "all"
      ? activities
      : activities.filter((a) => a.module === selectedModule);

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "PROFILE", "LEAVE", "ATTENDANCE", "EMPLOYEE"].map(
          (module) => (
            <button
              key={module}
              onClick={() => handleFilterChange(module)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedModule === module
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {module === "all" ? "All Activities" : module}
            </button>
          )
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : filteredActivities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No activities found
          </p>
        ) : (
          filteredActivities.map((activity) => (
            <TimelineCard key={activity._id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Activity Statistics
// ============================================================================

import { useActivityTimeline } from "../../hooks/useActivityTimeline";

export function ActivityStatistics() {
  const { activities } = useActivityTimeline("hr-timeline");

  // Calculate stats
  const stats = {
    totalActivities: activities.length,
    byModule: {},
    byAction: {},
    byUser: {},
  };

  activities.forEach((activity) => {
    // Count by module
    stats.byModule[activity.module] =
      (stats.byModule[activity.module] || 0) + 1;

    // Count by action
    stats.byAction[activity.actionType] =
      (stats.byAction[activity.actionType] || 0) + 1;

    // Count by user
    stats.byUser[activity.actorName] =
      (stats.byUser[activity.actorName] || 0) + 1;
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Total Activities Card */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 text-sm font-medium">Total Activities</p>
        <p className="text-4xl font-bold text-blue-600 mt-2">
          {stats.totalActivities}
        </p>
      </div>

      {/* Most Active Module Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 text-sm font-medium">Top Module</p>
        {Object.keys(stats.byModule).length > 0 && (
          <>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {Object.entries(stats.byModule).sort((a, b) => b[1] - a[1])[0][0]}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {Object.entries(stats.byModule).sort((a, b) => b[1] - a[1])[0][1]}{" "}
              activities
            </p>
          </>
        )}
      </div>

      {/* Most Active User Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 text-sm font-medium">Active User</p>
        {Object.keys(stats.byUser).length > 0 && (
          <>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {Object.entries(stats.byUser).sort((a, b) => b[1] - a[1])[0][0]}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {Object.entries(stats.byUser).sort((a, b) => b[1] - a[1])[0][1]}{" "}
              actions
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Activity Search
// ============================================================================

import React, { useState, useMemo } from "react";
import { useActivityTimeline } from "../../hooks/useActivityTimeline";
import { Search } from "lucide-react";

export function SearchableActivityTimeline() {
  const { activities, loading } = useActivityTimeline("hr-timeline");
  const [searchTerm, setSearchTerm] = useState("");

  // Client-side search
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return activities;

    const term = searchTerm.toLowerCase();
    return activities.filter(
      (activity) =>
        activity.description.toLowerCase().includes(term) ||
        activity.actorName.toLowerCase().includes(term) ||
        activity.targetUserName?.toLowerCase().includes(term) ||
        activity.module.toLowerCase().includes(term)
    );
  }, [activities, searchTerm]);

  return (
    <div>
      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search activities by name, action, module..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {searchResults.length} results
        </p>

        {searchResults.map((activity) => (
          <TimelineCard key={activity._id} activity={activity} />
        ))}

        {searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No activities match "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Real-time Activity Updates with Socket.io
// ============================================================================

import { useEffect, useState } from "react";
import { getSocket } from "../../lib/socket.js";
import { useActivityTimeline } from "../../hooks/useActivityTimeline";

export function RealtimeActivityTimeline() {
  const { activities, refresh } = useActivityTimeline("hr-timeline");
  const [notification, setNotification] = useState(null);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for new activities
    const handleNewActivity = (newActivity) => {
      // Show brief notification
      setNotification({
        message: `New activity: ${newActivity.description}`,
        type: "info",
      });

      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);

      // Refresh timeline
      refresh();
    };

    socket.on("activity:new", handleNewActivity);

    return () => {
      socket.off("activity:new", handleNewActivity);
    };
  }, [socket, refresh]);

  return (
    <div>
      {/* Notification Banner */}
      {notification && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          {notification.message}
        </div>
      )}

      {/* Timeline */}
      <ActivityTimeline activities={activities} />
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Export Activities to CSV
// ============================================================================

import { useActivityTimeline } from "../../hooks/useActivityTimeline";
import { Download } from "lucide-react";

export function ExportablActivityTimeline() {
  const { activities } = useActivityTimeline("hr-timeline");

  const handleExportCSV = () => {
    // Prepare CSV headers
    const headers = [
      "Date & Time",
      "Actor",
      "Role",
      "Action",
      "Description",
      "Target User",
    ];

    // Prepare CSV rows
    const rows = activities.map((activity) => [
      new Date(activity.createdAt).toLocaleString(),
      activity.actorName,
      activity.actorRole,
      activity.actionType,
      activity.description,
      activity.targetUserName || "-",
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    // Download
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent)
    );
    element.setAttribute("download", `activities-${Date.now()}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div>
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Download className="w-4 h-4" />
        Export as CSV
      </button>

      {/* Timeline */}
      <div className="mt-6">
        <ActivityTimeline activities={activities} />
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 9: Date Range Picker
// ============================================================================

import React, { useState } from "react";
import { useActivityTimeline } from "../../hooks/useActivityTimeline";

export function ActivityTimelineWithDatePicker() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { activities, loading, refresh } = useActivityTimeline(
    "hr-timeline"
  );

  const handleFilter = () => {
    refresh({
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  return (
    <div>
      {/* Date Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <ActivityTimeline activities={activities} />
      )}
    </div>
  );
}

// ============================================================================
// HOW TO USE THESE EXAMPLES
// ============================================================================

/*
1. SIMPLE INTEGRATION:
   Just drop <HRTimeline /> or <AdminTimeline /> into your existing pages

2. ADVANCED FILTERING:
   Use <FilteredActivityTimeline /> to let users filter by module

3. STATISTICS:
   Add <ActivityStatistics /> to show activity metrics

4. REAL-TIME:
   Wrap with <RealtimeActivityTimeline /> to get automatic updates

5. SEARCH:
   Use <SearchableActivityTimeline /> for user-friendly search

6. WIDGETS:
   Put <RecentActivityWidget /> in sidebars for quick access

7. EXPORT:
   Add CSV export with <ExportablActivityTimeline />

8. DATE FILTERING:
   Use <ActivityTimelineWithDatePicker /> for date range queries

9. COMPACT:
   Use the widget version for space-constrained areas

Choose the examples that match your UI design and requirements!
*/
