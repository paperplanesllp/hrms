import React, { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../lib/socket.js";
import { usePresenceStore } from "../../store/presenceStore.js";
import api from "../../lib/api.js";
import { getDerivedPresenceStatus, getAvatarDotStyle, sortItemsByPresence, formatExactTimestamp } from "../../lib/presenceUtils.js";
import { toast } from "../../store/toastStore.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import {
  Users,
  MessageCircle,
  Video,
  Calendar,
  Clock,
  Plus,
  TrendingUp,
  AlertCircle,
  Zap,
  ChevronRight,
  Send,
  Phone,
  X,
  ShieldCheck,
  Mail,
  UserPlus,
  Sparkles,
  CheckCircle2,
  MapPin,
  Briefcase,
  Building2,
  Heart,
  Lock,
  Droplet,
  Eye,
  EyeOff,
} from "lucide-react";
import HRDiscussionPanel from "./HRDiscussionPanel.jsx";
import HRMeetingPanel from "./HRMeetingPanel.jsx";
import HRActivityFeed from "./HRActivityFeed.jsx";
import HRTimelineFeed from "./HRTimelineFeed.jsx";

const initialHRForm = {
  // Basic Details
  name: "",
  email: "",
  phone: "",
  gender: "",
  address: "",
  bloodGroup: "",
  
  // Personal Details
  dateOfBirth: "",
  maritalStatus: "",
  nationality: "",
  emergencyContact: "",
  
  // Employment Details
  department: "",
  designation: "",
  joiningDate: "",
  employeeType: "",
  workLocation: "",
  reportingManager: "",
  
  // Account Details
  password: "",
  confirmPassword: "",
  status: "Active",
};

export default function HRTeamPage() {
  const socket = getSocket();

  const [hrTeam, setHRTeam] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const presenceUsers = usePresenceStore(s => s.users);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showCreateHRModal, setShowCreateHRModal] = useState(false);
  const [createHRLoading, setCreateHRLoading] = useState(false);
  const [hrForm, setHRForm] = useState(initialHRForm);

  const loadHRTeamData = async () => {
    try {
      setLoading(true);

      const [teamRes, discussionsRes, meetingsRes, activityRes] =
        await Promise.all([
          api.get("/admin/hr-team"),
          api.get("/admin/hr-team/discussions"),
          api.get("/admin/hr-team/meetings"),
          api.get("/admin/hr-team/activity"),
        ]);

      setHRTeam(teamRes.data || []);
      setDiscussions(discussionsRes.data || []);
      setMeetings(meetingsRes.data || []);
      setActivity(activityRes.data || []);
    } catch (err) {
      console.error("Failed to load HR team data:", err);
      toast({
        title: "Failed to load HR team data",
        message: err?.response?.data?.message || "Please try again",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHR = async (e) => {
    e.preventDefault();
    setCreateHRLoading(true);

    try {
      await api.post("/users", {
        name: hrForm.name,
        email: hrForm.email,
        phone: hrForm.phone,
        password: hrForm.password,
        role: "HR",
        gender: hrForm.gender,
        dateOfBirth: hrForm.dateOfBirth,
        emergencyContact: hrForm.emergencyContact,
        maritalStatus: hrForm.maritalStatus,
        nationality: hrForm.nationality,
        bloodGroup: hrForm.bloodGroup,
      });

      toast({
        title: "HR account created",
        message: `${hrForm.name} has been added to the HR team`,
        type: "success",
      });

      setShowCreateHRModal(false);
      setHRForm(initialHRForm);
      loadHRTeamData();
    } catch (err) {
      toast({
        title: "Failed to create HR account",
        message: err?.response?.data?.message || "Please check the form details",
        type: "error",
      });
    } finally {
      setCreateHRLoading(false);
    }
  };

  useEffect(() => {
    loadHRTeamData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleDiscussion = (discussion) => {
      setDiscussions((prev) => [discussion, ...prev]);
      setActivity((prev) => [
        {
          type: "discussion",
          message: `${discussion?.createdBy?.name || "A member"} started discussion: "${discussion?.title || "Untitled"}"`,
          timestamp: new Date(),
          user: discussion?.createdBy,
        },
        ...prev,
      ]);
    };

    const handleReply = (reply) => {
      setDiscussions((prev) =>
        prev.map((d) =>
          d._id === reply.discussionId
            ? { ...d, replies: [...(d.replies || []), reply] }
            : d
        )
      );

      setActivity((prev) => [
        {
          type: "reply",
          message: `${reply?.author?.name || "A member"} replied to a discussion`,
          timestamp: new Date(),
          user: reply?.author,
        },
        ...prev,
      ]);
    };

    const handleMeeting = (meeting) => {
      setMeetings((prev) => [meeting, ...prev]);
      setActivity((prev) => [
        {
          type: "meeting",
          message: `${meeting?.organizer?.name || "A member"} scheduled a meeting: "${meeting?.title || "Untitled"}"`,
          timestamp: new Date(),
          user: meeting?.organizer,
        },
        ...prev,
      ]);
    };

    const handleStatusUpdated = (data) => {
      setHRTeam((prev) =>
        prev.map((member) =>
          member._id === data.userId ? { ...member, status: data.status } : member
        )
      );
    };

    socket.on("new_hr_discussion", handleDiscussion);
    socket.on("new_hr_reply", handleReply);
    socket.on("new_hr_meeting", handleMeeting);
    socket.on("hr_member_status_updated", handleStatusUpdated);

    return () => {
      socket.off("new_hr_discussion", handleDiscussion);
      socket.off("new_hr_reply", handleReply);
      socket.off("new_hr_meeting", handleMeeting);
      socket.off("hr_member_status_updated", handleStatusUpdated);
    };
  }, [socket]);

  const onlineCount = useMemo(
    () => Object.values(presenceUsers).filter(m => m?.isOnline).length,
    [presenceUsers]
  );

  // Sort HR team by presence (online members first)
  const sortedHrTeam = useMemo(() =>
    sortItemsByPresence(hrTeam, (member) => presenceUsers[member._id]),
    [hrTeam, presenceUsers]
  );

  const getMemberPresence = (memberId) => getDerivedPresenceStatus(presenceUsers[memberId]);
  const getMemberDotClass = (memberId) => {
    const d = getAvatarDotStyle(getMemberPresence(memberId).status);
    return `${d.bg} ring-2 ${d.ring}${d.pulse ? ' animate-pulse' : ''}`;
  };
  const getMemberPresenceLabel = (memberId) => {
    const presence = getMemberPresence(memberId);
    const data = presenceUsers[memberId];
    const rawDate = presence.status === 'offline' ? data?.lastSeen : presence.status === 'away' ? data?.lastActivityAt : null;
    const tooltip = rawDate ? `Last active on ${formatExactTimestamp(rawDate)}` : '';
    if (presence.status === 'offline') {
      const label = presence.lastSeen && presence.lastSeen !== 'never' ? `Last seen ${presence.lastSeen}` : 'Offline';
      return { label, tooltip };
    }
    return { label: presence.label, tooltip };
  };
  const getMemberPresenceTextColor = (memberId) => {
    const { status } = getMemberPresence(memberId);
    if (status === 'online' || status === 'active-now' || status === 'active-recently' || status === 'typing') return 'text-emerald-400';
    if (status === 'away') return 'text-amber-400';
    return 'text-slate-500';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageTitle
          title="HR Team Hub"
          subtitle="Premium HR management and collaboration workspace"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="h-40 border rounded-3xl animate-pulse border-white/10 bg-gradient-to-br from-slate-800/70 to-slate-900/70"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="HR Team Hub"
        subtitle="Unified HR collaboration, team management, discussions, and meetings"
      />

      {/* Premium Hero */}
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.25)]">
        <div className="absolute right-0 w-40 h-40 rounded-full -top-10 bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 rounded-full h-44 w-44 bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-full border-white/10 bg-white/10 text-white/80 backdrop-blur-xl">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Collaboration Control Center</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Manage your HR team from one premium workspace
            </h2>
            <p className="max-w-xl mt-3 text-sm leading-6 text-slate-300 md:text-base">
              View HR staff, start discussions, schedule meetings, and track live team activity in real time.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowCreateHRModal(true)}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-white shadow-[0_10px_30px_rgba(16,185,129,0.30)] hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>

            <Button
              onClick={() => setShowNewMeeting(true)}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-white shadow-[0_10px_30px_rgba(59,130,246,0.28)] hover:scale-[1.02]"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard
          title="Team Members"
          value={hrTeam.length}
          icon={Users}
          from="from-blue-500"
          to="to-cyan-500"
          soft="from-blue-500/10"
        />
        <PremiumStatCard
          title="Discussions"
          value={discussions.length}
          icon={MessageCircle}
          from="from-violet-500"
          to="to-fuchsia-500"
          soft="from-violet-500/10"
        />
        <PremiumStatCard
          title="Meetings"
          value={meetings.length}
          icon={Calendar}
          from="from-pink-500"
          to="to-rose-500"
          soft="from-pink-500/10"
        />
        <PremiumStatCard
          title="Online Now"
          value={onlineCount}
          icon={Zap}
          from="from-emerald-500"
          to="to-lime-500"
          soft="from-emerald-500/10"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 border rounded-2xl border-white/10 bg-slate-900/60 backdrop-blur-xl">
        {[
          { id: "overview", label: "Overview", icon: Users },
          { id: "discussions", label: "Discussions", icon: MessageCircle },
          { id: "meetings", label: "Meetings", icon: Calendar },
          { id: "timeline", label: "Live Timeline", icon: TrendingUp },
          { id: "activity", label: "Activity", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Team Members */}
            <div className="space-y-4 xl:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-main)]">
                  <Users className="w-5 h-5 text-emerald-500" />
                  Team Members
                </h3>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowCreateHRModal(true)}
                    className="px-4 py-2 text-white rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>

                  <Button
                    onClick={() => setShowNewMeeting(true)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Meeting
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/60 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="border-b border-white/10 bg-white/[0.03]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Member
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Status
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedHrTeam.map((member) => (
                        <tr
                          key={member._id}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="flex items-center justify-center text-sm font-bold text-white shadow-lg h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
                                  {member?.name?.charAt(0)?.toUpperCase() || "H"}
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[2px] border-slate-900 transition-colors duration-300 ${getMemberDotClass(member._id)}`}
                                />
                              </div>

                              <div>
                                <p className="font-semibold text-white">
                                  {member.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {member.phone || "No phone"}
                                </p>
                                <p className={`text-[11px] mt-0.5 cursor-default ${getMemberPresenceTextColor(member._id)}`}
                                   title={getMemberPresenceLabel(member._id).tooltip}>
                                  {getMemberPresenceLabel(member._id).label}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-300">
                            {member.email}
                          </td>

                          <td className="px-6 py-4">
                            <Badge className="px-3 py-1 text-xs border rounded-full border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                              {member.role || "HR"}
                            </Badge>
                          </td>

                          <td className="px-6 py-4">
                            <Badge
                              className={`rounded-full px-3 py-1 text-xs ${
                                (member.status || "Active") === "Active"
                                  ? "border border-green-400/20 bg-green-500/10 text-green-300"
                                  : "border border-slate-400/20 bg-slate-500/10 text-slate-300"
                              }`}
                            >
                              {member.status || "Active"}
                            </Badge>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-2 transition rounded-xl text-emerald-400 hover:bg-emerald-500/10">
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-blue-400 transition rounded-xl hover:bg-blue-500/10">
                                <Video className="w-4 h-4" />
                              </button>
                              <button className="p-2 transition rounded-xl text-violet-400 hover:bg-violet-500/10">
                                <Mail className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {hrTeam.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                            <p className="font-medium text-slate-300">
                              No HR team members found
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Add your first HR team member to get started
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-main)]">
                <Zap className="w-5 h-5 text-amber-500" />
                Quick Actions
              </h3>

              <Card className="space-y-4 rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <ActionButton
                  onClick={() => setShowCreateHRModal(true)}
                  icon={UserPlus}
                  label="Add HR Staff"
                  gradient="from-emerald-500 to-green-600"
                />
                <ActionButton
                  onClick={() => setActiveTab("discussions")}
                  icon={MessageCircle}
                  label="Open Discussions"
                  gradient="from-blue-600 to-cyan-500"
                />
                <ActionButton
                  onClick={() => setShowNewMeeting(true)}
                  icon={Calendar}
                  label="Schedule Meeting"
                  gradient="from-violet-600 to-fuchsia-500"
                />
                <ActionButton
                  onClick={() =>
                    toast({
                      title: "Video call",
                      message: "Video call service can be connected here",
                      type: "success",
                    })
                  }
                  icon={Video}
                  label="Start Video Call"
                  gradient="from-pink-500 to-rose-500"
                />

                <div className="pt-4 border-t border-white/10">
                  <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
                    Quick Contact
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        toast({
                          title: "Chat",
                          message: "Open HR team chat here",
                          type: "success",
                        })
                      }
                      className="flex items-center justify-center gap-2 px-4 py-3 font-medium transition rounded-2xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <Send className="w-4 h-4" />
                      Chat
                    </button>

                    <button
                      onClick={() =>
                        toast({
                          title: "Call",
                          message: "Phone call action can be integrated here",
                          type: "success",
                        })
                      }
                      className="flex items-center justify-center gap-2 px-4 py-3 font-medium transition rounded-2xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Recent Activity
                </h4>

                <div className="pr-1 space-y-3 overflow-y-auto max-h-72">
                  {activity.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/5 bg-white/[0.03] p-3"
                    >
                      <p className="text-sm font-medium text-white">{item.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  ))}

                  {activity.length === 0 && (
                    <div className="py-8 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <p className="text-sm text-slate-400">No recent activity</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "discussions" && (
          <HRDiscussionPanel discussions={discussions} onRefresh={loadHRTeamData} />
        )}

        {activeTab === "meetings" && (
          <HRMeetingPanel
            meetings={meetings}
            hrTeam={hrTeam}
            onRefresh={loadHRTeamData}
            onNewMeeting={() => setShowNewMeeting(true)}
          />
        )}

        {activeTab === "timeline" && <HRTimelineFeed />}

        {activeTab === "activity" && <HRActivityFeed activity={activity} />}
      </div>

      {showCreateHRModal && (
        <CreateHRModal
          onClose={() => setShowCreateHRModal(false)}
          hrForm={hrForm}
          setHRForm={setHRForm}
          createHRLoading={createHRLoading}
          handleCreateHR={handleCreateHR}
        />
      )}

      {showNewMeeting && (
        <HRMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onSuccess={() => {
            setShowNewMeeting(false);
            loadHRTeamData();
          }}
          hrTeam={hrTeam}
        />
      )}
    </div>
  );
}

function PremiumStatCard({ title, value, icon: Icon, from, to, soft }) {
  return (
    <Card className="rounded-[24px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${from} ${to} shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

function ActionButton({ onClick, icon: Icon, label, gradient }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r ${gradient} px-5 py-4 font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02]`}
    >
      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
      {label}
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

function PremiumModalShell({ title, subtitle, icon: Icon, onClose, children, maxWidth = "max-w-2xl" }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 shadow-[0_30px_100px_rgba(0,0,0,0.35)]`}
      >
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="w-6 h-6 text-emerald-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 transition rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function InputField({ label, children, hint }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-200">{label}</label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function inputClass() {
  return "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.07]";
}

function CreateHRModal({
  onClose,
  hrForm,
  setHRForm,
  createHRLoading,
  handleCreateHR,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFormChange = (field, value) => {
    setHRForm({ ...hrForm, [field]: value });
  };

  const passwordsMatch = hrForm.password && hrForm.confirmPassword && hrForm.password === hrForm.confirmPassword;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      {/* Modal Container */}
      <div className="w-full max-w-4xl max-h-[90vh] rounded-[24px] overflow-hidden shadow-2xl bg-white border border-slate-200">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                <UserPlus className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add Team Member</h2>
                <p className="mt-0.5 text-sm text-slate-600">Create a new HR staff account with complete details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreateHR} className="overflow-y-auto max-h-[calc(90vh-180px)] px-8 py-6">
          <div className="space-y-8">
            {/* SECTION 1: Basic Details */}
            <FormSection
              title="Basic Details"
              subtitle="Essential information about the employee"
              icon={Users}
              color="emerald"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Full Name"
                  required
                  error=""
                >
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={hrForm.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </FormField>

                <FormField label="Gender" required>
                  <select
                    value={hrForm.gender}
                    onChange={(e) => handleFormChange("gender", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>

                <FormField label="Email Address" required>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={hrForm.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </FormField>

                <FormField label="Mobile Number" required>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={hrForm.phone}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </FormField>

                <FormField label="Blood Group">
                  <select
                    value={hrForm.bloodGroup}
                    onChange={(e) => handleFormChange("bloodGroup", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </FormField>

                <FormField label="Address">
                  <textarea
                    placeholder="Enter residential address"
                    value={hrForm.address}
                    onChange={(e) => handleFormChange("address", e.target.value)}
                    rows="2"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* SECTION 2: Personal Details */}
            <FormSection
              title="Personal Details"
              subtitle="Personal and family information"
              icon={Heart}
              color="blue"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Date of Birth">
                  <input
                    type="date"
                    value={hrForm.dateOfBirth}
                    onChange={(e) => handleFormChange("dateOfBirth", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </FormField>

                <FormField label="Marital Status">
                  <select
                    value={hrForm.maritalStatus}
                    onChange={(e) => handleFormChange("maritalStatus", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </FormField>

                <FormField label="Nationality">
                  <input
                    type="text"
                    placeholder="e.g., Indian"
                    value={hrForm.nationality}
                    onChange={(e) => handleFormChange("nationality", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </FormField>

                <FormField label="Emergency Contact">
                  <input
                    type="tel"
                    placeholder="+91 9876543211"
                    value={hrForm.emergencyContact}
                    onChange={(e) => handleFormChange("emergencyContact", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* SECTION 3: Employment Details */}
            <FormSection
              title="Employment Details"
              subtitle="Job and assignment information"
              icon={Briefcase}
              color="purple"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Department">
                  <select
                    value={hrForm.department}
                    onChange={(e) => handleFormChange("department", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="IT">IT</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </FormField>

                <FormField label="Designation">
                  <input
                    type="text"
                    placeholder="e.g., Senior HR Manager"
                    value={hrForm.designation}
                    onChange={(e) => handleFormChange("designation", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </FormField>

                <FormField label="Joining Date">
                  <input
                    type="date"
                    value={hrForm.joiningDate}
                    onChange={(e) => handleFormChange("joiningDate", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </FormField>

                <FormField label="Employee Type">
                  <select
                    value={hrForm.employeeType}
                    onChange={(e) => handleFormChange("employeeType", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  >
                    <option value="">Select Employee Type</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Associate</option>
                    <option value="Intern">Intern</option>
                  </select>
                </FormField>

                <FormField label="Work Location">
                  <input
                    type="text"
                    placeholder="e.g., Mumbai Office"
                    value={hrForm.workLocation}
                    onChange={(e) => handleFormChange("workLocation", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </FormField>

                <FormField label="Reporting Manager">
                  <input
                    type="text"
                    placeholder="Enter manager's name"
                    value={hrForm.reportingManager}
                    onChange={(e) => handleFormChange("reportingManager", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* SECTION 4: Account Details */}
            <FormSection
              title="Account Details"
              subtitle="System access and security settings"
              icon={Lock}
              color="orange"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Password" required hint="Minimum 8 characters">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={hrForm.password}
                        onChange={(e) => handleFormChange("password", e.target.value)}
                        required
                        minLength={8}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Confirm Password" required hint="Must match password">
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        value={hrForm.confirmPassword}
                        onChange={(e) => handleFormChange("confirmPassword", e.target.value)}
                        required
                        minLength={8}
                        className={`w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 outline-none transition pr-11 ${
                          hrForm.confirmPassword && !passwordsMatch
                            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : hrForm.confirmPassword && passwordsMatch
                            ? "border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                            : "border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </FormField>
                </div>

                <FormField label="Account Status">
                  <select
                    value={hrForm.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </FormField>
              </div>
            </FormSection>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-8 py-4 flex gap-3 justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createHRLoading || (hrForm.confirmPassword && !passwordsMatch)}
            onClick={handleCreateHR}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-emerald-500/30"
          >
            {createHRLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Staff Member
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Reusable Form Section Component
function FormSection({ title, subtitle, icon: Icon, color, children }) {
  const colorMap = {
    emerald: "from-emerald-50 to-teal-50 border-emerald-200",
    blue: "from-blue-50 to-cyan-50 border-blue-200",
    purple: "from-purple-50 to-indigo-50 border-purple-200",
    orange: "from-orange-50 to-amber-50 border-orange-200",
  };

  const iconColorMap = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
  };

  return (
    <div className={`rounded-2xl border-2 bg-gradient-to-br ${colorMap[color]} p-6`}>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 ${iconColorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// Reusable Form Field Component
function FormField({ label, required, hint, children, error }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function HRMeetingModal({ onClose, onSuccess, hrTeam }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "discussion",
    date: "",
    time: "",
    attendees: [],
    location: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await api.post("/admin/hr-team/meetings", formData);

      toast({
        title: "Meeting scheduled",
        message: "Meeting scheduled successfully",
        type: "success",
      });

      onSuccess();
    } catch (err) {
      toast({
        title: "Failed to schedule meeting",
        message: err?.response?.data?.message || "Please try again",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendee = (id, checked) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        attendees: [...prev.attendees, id],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        attendees: prev.attendees.filter((item) => item !== id),
      }));
    }
  };

  return (
    <PremiumModalShell
      title="Schedule HR Meeting"
      subtitle="Create a new HR discussion, video call, or onsite meeting"
      icon={Calendar}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField label="Meeting Title">
              <input
                type="text"
                placeholder="Weekly HR Sync"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className={inputClass()}
                required
              />
            </InputField>

            <InputField label="Meeting Type">
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className={inputClass()}
              >
                <option value="discussion" className="bg-slate-900">Discussion</option>
                <option value="video-call" className="bg-slate-900">Video Call</option>
                <option value="onsite" className="bg-slate-900">On-site Meeting</option>
              </select>
            </InputField>
          </div>

          <InputField label="Description">
            <textarea
              placeholder="Write the meeting agenda..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={`${inputClass()} min-h-[110px] resize-none`}
            />
          </InputField>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField label="Date">
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className={inputClass()}
                required
              />
            </InputField>

            <InputField label="Time">
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className={inputClass()}
                required
              />
            </InputField>
          </div>

          {formData.type === "onsite" && (
            <InputField label="Location">
              <input
                type="text"
                placeholder="Conference Room A"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className={inputClass()}
              />
            </InputField>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
            <label className="block mb-3 text-sm font-semibold text-slate-200">
              Select Attendees
            </label>

            <div className="grid grid-cols-1 gap-2 pr-1 overflow-y-auto max-h-56 sm:grid-cols-2">
              {hrTeam.map((member) => (
                <label
                  key={member._id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.05]"
                >
                  <input
                    type="checkbox"
                    checked={formData.attendees.includes(member._id)}
                    onChange={(e) => toggleAttendee(member._id, e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />

                  <div className="flex items-center justify-center text-sm font-bold text-white h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                    {member?.name?.charAt(0)?.toUpperCase() || "H"}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-white/10">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border rounded-2xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-white shadow-[0_10px_30px_rgba(59,130,246,0.30)] disabled:opacity-50"
            >
              {loading ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </div>
      </form>
    </PremiumModalShell>
  );
}