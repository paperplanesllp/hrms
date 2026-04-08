import React from "react";
import {
  Calendar, Clock, MapPin, Users, Video, Phone, Trash2, CheckCircle, AlertCircle, User
} from "lucide-react";
import api from "../../lib/api.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { toast } from "../../store/toastStore.js";

export default function HRMeetingPanel({ meetings, onRefresh, onNewMeeting }) {
  const handleDelete = async (meetingId) => {
    if (!confirm("Cancel this meeting?")) return;
    try {
      await api.delete(`/admin/hr-team/meetings/${meetingId}`);
      toast.success("Meeting cancelled");
      onRefresh();
    } catch (_err) {
      toast.error("Failed to cancel meeting");
    }
  };

  const handleMarkComplete = async (meetingId) => {
    try {
      await api.put(`/admin/hr-team/meetings/${meetingId}`, { status: "completed" });
      toast.success("Meeting marked as completed");
      onRefresh();
    } catch (_err) {
      toast.error("Failed to update meeting");
    }
  };

  // Sort meetings: upcoming first, then past
  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= new Date());
  const pastMeetings = meetings.filter(m => new Date(m.date) < new Date());

  if (meetings.length === 0) {
    return (
      <Card className="p-12 backdrop-blur-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-white/10 text-center">
        <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No meetings scheduled</p>
        <Button onClick={onNewMeeting}>Schedule a Meeting</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">HR Meetings</h3>
        <Button onClick={onNewMeeting} size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Upcoming</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map(meeting => (
              <MeetingCard
                key={meeting._id}
                meeting={meeting}
                onDelete={handleDelete}
                onMarkComplete={handleMarkComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Past</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastMeetings.map(meeting => (
              <MeetingCard
                key={meeting._id}
                meeting={meeting}
                onDelete={handleDelete}
                onMarkComplete={handleMarkComplete}
                isPast
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingCard({ meeting, onDelete, onMarkComplete, isPast }) {
  const meetingDate = new Date(meeting.date);
  const today = new Date();
  const isToday = meetingDate.toDateString() === today.toDateString();
  const isSoon = (meetingDate - today) <= 24 * 60 * 60 * 1000 && !isPast; // Within 24 hours

  const getTypeColor = (type) => {
    switch (type) {
      case "video-call": return "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300";
      case "onsite": return "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300";
      case "discussion": return "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300";
      default: return "from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-300";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "video-call": return <Video className="w-4 h-4" />;
      case "onsite": return <MapPin className="w-4 h-4" />;
      case "discussion": return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "video-call": return "Video Call";
      case "onsite": return "On-site";
      case "discussion": return "Discussion";
      default: return "Meeting";
    }
  };

  return (
    <Card
      className={`backdrop-blur-xl ${getTypeColor(meeting.type)} border p-5 space-y-3 transition-all hover:shadow-lg ${
        isPast ? "opacity-60" : "hover:border-opacity-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-white text-lg">{meeting.title}</h4>
            {isToday && !isPast && (
              <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                TODAY
              </Badge>
            )}
            {isSoon && !isPast && (
              <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">
                SOON
              </Badge>
            )}
          </div>
          <p className="text-sm text-white/70">{meeting.description}</p>
        </div>
        <button
          onClick={() => onDelete(meeting._id)}
          className="p-2 rounded-lg text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meeting Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <Calendar className="w-4 h-4" />
          {meetingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Clock className="w-4 h-4" />
          {meeting.time}
        </div>

        {meeting.location && (
          <div className="flex items-center gap-2 text-white/70 col-span-2">
            <MapPin className="w-4 h-4" />
            {meeting.location}
          </div>
        )}

        <div className="flex items-center gap-2 text-white/70 col-span-2">
          <Users className="w-4 h-4" />
          {meeting.attendees?.length || 0} attending
        </div>
      </div>

      {/* Type Badge */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
        {getTypeIcon(meeting.type)}
        <span className="text-xs font-semibold">{getTypeLabel(meeting.type)}</span>
      </div>

      {/* Attendees */}
      <div className="flex flex-wrap gap-2">
        {meeting.attendees?.slice(0, 5).map(attendee => (
          <div
            key={attendee._id || attendee}
            className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 flex items-center gap-1"
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
            {attendee.name || attendee}
          </div>
        ))}
        {meeting.attendees?.length > 5 && (
          <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
            +{meeting.attendees.length - 5} more
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-white/20">
        {!isPast && (
          <>
            <button
              onClick={() => onMarkComplete(meeting._id)}
              className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all font-semibold text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Complete
            </button>
            {meeting.type === "video-call" && (
              <button className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all font-semibold text-sm flex items-center justify-center gap-2">
                <Video className="w-4 h-4" />
                Join
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
