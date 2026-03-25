import React, { useState, useEffect } from "react";
import { getSocket } from "../../lib/socket.js";
import { useAuthStore } from "../../store/authStore.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import {
  Activity,
  MessageCircle,
  Calendar,
  Users,
  Zap,
  AlertCircle,
  Newspaper,
  Clock,
  Send,
  CheckCircle2,
  Shield,
  TrendingUp,
  Megaphone
} from "lucide-react";

export default function HRTimelineFeed({ onActivityUpdate }) {
  const socket = getSocket();
  const user = useAuthStore((s) => s.user);
  const [timeline, setTimeline] = useState([]);
  const [filter, setFilter] = useState("all"); // all, news, discussions, meetings, leaf
  const [socketConnected, setSocketConnected] = useState(socket?.connected || false);

  const getEventIcon = (type) => {
    const icons = {
      "news": <Newspaper className="w-4 h-4" />,
      "discussion": <MessageCircle className="w-4 h-4" />,
      "meeting": <Calendar className="w-4 h-4" />,
      "reply": <Zap className="w-4 h-4" />,
      "member": <Users className="w-4 h-4" />,
      "leave_request": <AlertCircle className="w-4 h-4" />,
      "leave_approved": <CheckCircle2 className="w-4 h-4" />,
      "policy_update": <Shield className="w-4 h-4" />,
      "status_update": <TrendingUp className="w-4 h-4" />,
    };
    return icons[type] || <Activity className="w-4 h-4" />;
  };

  const getEventColor = (type) => {
    const colors = {
      "news": "from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-400",
      "discussion": "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400",
      "meeting": "from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-400",
      "reply": "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
      "member": "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
      "leave_request": "from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400",
      "leave_approved": "from-green-500/10 to-green-600/5 border-green-500/20 text-green-400",
      "policy_update": "from-red-500/10 to-red-600/5 border-red-500/20 text-red-400",
      "status_update": "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
    };
    return colors[type] || "from-gray-500/10 to-gray-600/5 border-gray-500/20 text-gray-400";
  };

  const getEventBadge = (type) => {
    const badges = {
      "news": { label: "📰 News", color: "bg-amber-500/20 text-amber-300" },
      "discussion": { label: "💬 Discussion", color: "bg-purple-500/20 text-purple-300" },
      "meeting": { label: "📅 Meeting", color: "bg-pink-500/20 text-pink-300" },
      "reply": { label: "⚡ Reply", color: "bg-blue-500/20 text-blue-300" },
      "member": { label: "👥 Member", color: "bg-emerald-500/20 text-emerald-300" },
      "leave_request": { label: "📋 Leave Req", color: "bg-yellow-500/20 text-yellow-300" },
      "leave_approved": { label: "✅ Approved", color: "bg-green-500/20 text-green-300" },
      "policy_update": { label: "🔔 Policy", color: "bg-red-500/20 text-red-300" },
      "status_update": { label: "📊 Status", color: "bg-indigo-500/20 text-indigo-300" },
    };
    return badges[type] || { label: type, color: "bg-gray-500/20 text-gray-300" };
  };

  useEffect(() => {
    if (!socket) {
      console.warn("⚠️ HRTimelineFeed: Socket not available");
      return;
    }

    console.log("✅ HRTimelineFeed: Setting up socket listeners");

    // Listen to all events
    const handleNewsCreated = (news) => {
      console.log("📢 News created event received:", news);
      const event = {
        id: `news-${news._id}`,
        type: "news",
        title: "📢 New News Update",
        message: news.title,
        description: news.body?.substring(0, 100) + "..." || "No description",
        author: news.createdBy?.name || "HR Team",
        timestamp: new Date(),
        icon: Newspaper,
        isPolicyUpdate: news.isPolicyUpdate,
        isPinned: true
      };
      setTimeline((prev) => [event, ...prev]);
      if (onActivityUpdate) onActivityUpdate(event);
    };

    const handleNewDiscussion = (discussion) => {
      const event = {
        id: `discussion-${discussion._id}`,
        type: "discussion",
        title: "💬 New Discussion",
        message: discussion.title || "A new discussion started",
        author: discussion.createdBy?.name || "A member",
        timestamp: new Date(),
      };
      setTimeline((prev) => [event, ...prev]);
    };

    const handleNewReply = (reply) => {
      const event = {
        id: `reply-${reply._id}`,
        type: "reply",
        title: "⚡ New Reply",
        message: `${reply.author?.name || "A member"} replied to a discussion`,
        timestamp: new Date(),
      };
      setTimeline((prev) => [event, ...prev]);
    };

    const handleNewMeeting = (meeting) => {
      const event = {
        id: `meeting-${meeting._id}`,
        type: "meeting",
        title: "📅 New Meeting",
        message: meeting.title || "A meeting was scheduled",
        description: `Scheduled for ${new Date(meeting.scheduledFor).toLocaleString()}`,
        author: meeting.organizer?.name || "A member",
        timestamp: new Date(),
        isPinned: true
      };
      setTimeline((prev) => [event, ...prev]);
    };

    const handleStatusUpdated = (data) => {
      const event = {
        id: `status-${data.userId}`,
        type: "status_update",
        title: "📊 Status Updated",
        message: `${data.userName} is now ${data.status}`,
        timestamp: new Date(),
      };
      setTimeline((prev) => [event, ...prev]);
    };

    const handleNewsDeleted = (newsId) => {
      setTimeline((prev) => prev.filter((item) => item.id !== `news-${newsId}`));
    };

    const handleLeaveRequest = (data) => {
      const event = {
        id: `leave-${data.leaveId}`,
        type: "leave_request",
        title: "📋 New Leave Request",
        message: `${data.details}`,
        author: data.message.split(" from ")[1],
        timestamp: new Date(),
        isPinned: true
      };
      setTimeline((prev) => [event, ...prev]);
    };

    const handleLeaveStatusUpdate = (data) => {
      const event = {
        id: `leave-status-${data.timestamp}`,
        type: data.status === "APPROVED" ? "leave_approved" : "leave_request",
        title: data.title,
        message: data.message,
        timestamp: new Date(),
      };
      setTimeline((prev) => [event, ...prev]);
    };

    // Track socket connection status
    const handleConnect = () => {
      console.log("✅ Socket connected in HRTimelineFeed");
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket disconnected in HRTimelineFeed");
      setSocketConnected(false);
    };

    // Register all listeners
    socket.on("news_created", handleNewsCreated);
    socket.on("new_hr_discussion", handleNewDiscussion);
    socket.on("new_hr_reply", handleNewReply);
    socket.on("new_hr_meeting", handleNewMeeting);
    socket.on("hr_member_status_updated", handleStatusUpdated);
    socket.on("news_deleted", handleNewsDeleted);
    socket.on("new_leave_request", handleLeaveRequest);
    socket.on("leave_status_update", handleLeaveStatusUpdate);
    socket.on("new_policy_update", handleNewsCreated);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("news_created", handleNewsCreated);
      socket.off("new_hr_discussion", handleNewDiscussion);
      socket.off("new_hr_reply", handleNewReply);
      socket.off("new_hr_meeting", handleNewMeeting);
      socket.off("hr_member_status_updated", handleStatusUpdated);
      socket.off("news_deleted", handleNewsDeleted);
      socket.off("new_leave_request", handleLeaveRequest);
      socket.off("leave_status_update", handleLeaveStatusUpdate);
      socket.off("new_policy_update", handleNewsCreated);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  // Filter timeline
  const filteredTimeline = filter === "all" 
    ? timeline 
    : timeline.filter((item) => item.type === filter);

  if (timeline.length === 0) {
    return (
      <Card className="p-12 text-center backdrop-blur-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-white/10">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400 mb-2">No activity yet</p>
        <p className="text-sm text-gray-500">
          {socket ? "Listening for live events..." : "Socket not connected - refresh page"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
        socketConnected 
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-red-500/20 text-red-300 border border-red-500/30"
      }`}>
        {socketConnected ? "✅ Connected to live updates" : "🔄 Connecting to live updates..."}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "all", label: "All Activity", icon: Activity },
          { id: "news", label: "News", icon: Newspaper },
          { id: "meeting", label: "Meetings", icon: Calendar },
          { id: "discussion", label: "Discussions", icon: MessageCircle },
        ].map((filterOption) => (
          <button
            key={filterOption.id}
            onClick={() => setFilter(filterOption.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === filterOption.id
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredTimeline.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-white/10">
            <p className="text-gray-400">No {filter} activity yet</p>
          </Card>
        ) : (
          filteredTimeline.map((item, idx) => {
            const badge = getEventBadge(item.type);
            const isNew = idx === 0;

            return (
              <Card
                key={item.id}
                className={`p-4 backdrop-blur-xl bg-gradient-to-r ${getEventColor(
                  item.type
                )} border transition-all hover:border-opacity-100 ${
                  isNew ? "ring-2 ring-green-400/50" : ""
                } ${item.isPinned ? "ring-1 ring-amber-400/30" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 mt-1 rounded-lg bg-white/10">
                    {getEventIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="mb-1 text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-white font-medium">{item.message}</p>
                        {item.description && (
                          <p className="text-sm text-gray-300 mt-1">{item.description}</p>
                        )}
                      </div>
                      {isNew && (
                        <span className="px-2 py-1 text-xs font-bold text-green-200 bg-green-500/30 rounded-full animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {item.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </span>
                      {item.author && (
                        <>
                          <span>•</span>
                          <span>{item.author}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge */}
                  <div className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-lg ${badge.color}`}>
                    {badge.label}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
