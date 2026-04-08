import { useState, useEffect } from "react";
import { Calendar, Clock, User, Users } from "lucide-react";
import api from "../../lib/api.js";

/**
 * Reusable TimelineCard component for displaying individual activity
 */
export function TimelineCard({ activity }) {
  if (!activity) return null;

  const getActionIcon = (actionType) => {
    const iconProps = { className: "w-4 h-4" };
    switch (actionType) {
      case "LOGIN":
        return "🔓";
      case "LOGOUT":
        return "🔒";
      case "PROFILE_UPDATE":
        return "👤";
      case "LEAVE_APPROVAL":
        return "✅";
      case "LEAVE_REJECTION":
        return "❌";
      case "ATTENDANCE_CHECKIN":
        return "📍";
      case "ATTENDANCE_CHECKOUT":
        return "🚪";
      case "EMPLOYEE_UPDATE":
        return "👥";
      case "DOCUMENT_UPLOAD":
        return "📄";
      default:
        return "•";
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case "LOGIN":
        return "bg-green-50 border-green-200";
      case "LOGOUT":
        return "bg-gray-50 border-gray-200";
      case "PROFILE_UPDATE":
        return "bg-blue-50 border-blue-200";
      case "LEAVE_APPROVAL":
        return "bg-green-50 border-green-200";
      case "LEAVE_REJECTION":
        return "bg-red-50 border-red-200";
      case "ATTENDANCE_CHECKIN":
        return "bg-blue-50 border-blue-200";
      case "EMPLOYEE_UPDATE":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
    if (isToday) {
      return date.toLocaleTimeString('en-IN', timeOpts);
    } else if (isYesterday) {
      return (
        "Yesterday, " +
        date.toLocaleTimeString('en-IN', timeOpts)
      );
    } else {
      return date.toLocaleDateString('en-IN', {
        month: "short",
        day: "numeric",
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "HR":
        return "bg-orange-100 text-orange-800";
      case "USER":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className={`border-l-4 border-l-blue-400 pl-4 pb-4 mb-4 ${getActionColor(
        activity.actionType
      )} rounded-lg p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getActionIcon(activity.actionType)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(activity.actorRole)}`}>
              {activity.actorRole}
            </span>
          </div>

          <p className="font-semibold text-gray-900 mb-1">
            {activity.actorName}
          </p>
          <p className="text-gray-700 text-sm mb-2">
            {activity.description}
          </p>

          {activity.targetUserName && (
            <p className="text-gray-600 text-xs mb-2">
              Target: <strong>{activity.targetUserName}</strong>
            </p>
          )}
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-500 text-xs whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <span>{formatDate(activity.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline component to display list of activities
 */
export function ActivityTimeline({ activities = [], loading = false, isEmpty = false, onLoadMore, hasMore = false }) {
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>No activities recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <TimelineCard key={activity._id} activity={activity} />
      ))}

      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
        >
          Load More
        </button>
      )}
    </div>
  );
}

/**
 * HR Timeline - Staff activities relevant to HR monitoring
 */
export function HRTimeline() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchHRTimeline();
  }, [filter]);

  const fetchHRTimeline = async () => {
    setLoading(true);
    try {
      const result = await api.get("/activity/hr-timeline", {
        params: {
          limit: 50,
          skip: 0,
        },
      });
      setActivities(result.data?.data || []);
      setHasMore((result.data?.skip + result.data?.limit) < result.data?.total);
    } catch (error) {
      console.error("Error fetching HR timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const newPage = page + 1;
    try {
      const result = await api.get("/activity/hr-timeline", {
        params: {
          limit: 50,
          skip: newPage * 50,
        },
      });
      setActivities([...activities, ...(result.data?.data || [])]);
      setPage(newPage);
      setHasMore((result.data?.skip + result.data?.limit) < result.data?.total);
    } catch (error) {
      console.error("Error loading more activities:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Staff Activity Timeline
        </h2>
      </div>

      <ActivityTimeline
        activities={activities}
        loading={loading}
        isEmpty={activities.length === 0 && !loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </div>
  );
}

/**
 * Admin Timeline - HR and system-level activities
 */
export function AdminTimeline() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchAdminTimeline();
  }, []);

  const fetchAdminTimeline = async () => {
    setLoading(true);
    try {
      const result = await api.get("/activity/admin-timeline", {
        params: {
          limit: 50,
          skip: 0,
        },
      });
      setActivities(result.data?.data || []);
      setHasMore((result.data?.skip + result.data?.limit) < result.data?.total);
    } catch (error) {
      console.error("Error fetching admin timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const newPage = page + 1;
    try {
      const result = await api.get("/activity/admin-timeline", {
        params: {
          limit: 50,
          skip: newPage * 50,
        },
      });
      setActivities([...activities, ...(result.data?.data || [])]);
      setPage(newPage);
      setHasMore((result.data?.skip + result.data?.limit) < result.data?.total);
    } catch (error) {
      console.error("Error loading more activities:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-red-600" />
          Complete Activity Log
        </h2>
        <p className="text-sm text-gray-600">All staff and HR activities</p>
      </div>

      <ActivityTimeline
        activities={activities}
        loading={loading}
        isEmpty={activities.length === 0 && !loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </div>
  );
}
