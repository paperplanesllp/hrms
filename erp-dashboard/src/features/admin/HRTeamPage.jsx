import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getSocket } from "../../lib/socket.js";
import { usePresenceStore } from "../../store/presenceStore.js";
import api from "../../lib/api.js";
import {
  getDerivedPresenceStatus,
  getAvatarDotStyle,
  sortItemsByPresence,
  formatExactTimestamp,
} from "../../lib/presenceUtils.js";
import { toast } from "../../store/toastStore.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import RefreshStatus from "../../components/common/RefreshStatus.jsx";
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
  Mail,
  UserPlus,
  Sparkles,
  Heart,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  Activity,
  Layers,
  ShieldCheck,
  MoreHorizontal,
  UploadCloud,
  CheckCircle,
} from "lucide-react";
import HRDiscussionPanel from "./HRDiscussionPanel.jsx";
import HRMeetingPanel from "./HRMeetingPanel.jsx";
import HRActivityFeed from "./HRActivityFeed.jsx";
import HRTimelineFeed from "./HRTimelineFeed.jsx";
import { useAutoRefresh } from "../../hooks/useAutoRefresh.js";

const initialHRForm = {
  name: "",
  email: "",
  phone: "",
  gender: "",
  address: "",
  bloodGroup: "",
  dateOfBirth: "",
  maritalStatus: "",
  nationality: "",
  emergencyContact: "",
  department: "",
  designation: "",
  joiningDate: "",
  employeeType: "",
  workLocation: "",
  reportingManager: "",
  password: "",
  confirmPassword: "",
  status: "Active",
};

const hrTheme = {
  glass: "border-white/55 bg-white/70 text-slate-950 shadow-slate-900/10 dark:border-white/10 dark:bg-slate-950/62 dark:text-white",
  glassSoft: "border-white/55 bg-white/60 text-slate-950 shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.07] dark:text-white",
  textMain: "text-slate-950 dark:text-white",
  textSoft: "text-slate-700 dark:text-slate-300",
  textMuted: "text-slate-600 dark:text-slate-400",
  textFaint: "text-slate-500 dark:text-slate-400",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-violet-300/60 dark:focus-visible:ring-offset-slate-950",
};

export default function HRTeamPage() {
  const socket = getSocket();

  const [hrTeam, setHRTeam] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const presenceUsers = usePresenceStore((s) => s.users);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showCreateHRModal, setShowCreateHRModal] = useState(false);
  const [createHRLoading, setCreateHRLoading] = useState(false);
  const [hrForm, setHRForm] = useState(initialHRForm);

  const loadHRTeamData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

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
      if (!silent) setLoading(false);
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

  const hrTeamRefresh = useAutoRefresh(
    () => loadHRTeamData({ silent: true }),
    10000,
    { enabled: !showCreateHRModal }
  );

  useEffect(() => {
    if (!socket) return;

    const handleDiscussion = (discussion) => {
      setDiscussions((prev) => [discussion, ...prev]);
      setActivity((prev) => [
        {
          type: "discussion",
          message: `${discussion?.createdBy?.name || "A member"} started discussion: "${
            discussion?.title || "Untitled"
          }"`,
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
          message: `${meeting?.organizer?.name || "A member"} scheduled a meeting: "${
            meeting?.title || "Untitled"
          }"`,
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
    () => Object.values(presenceUsers).filter((m) => m?.isOnline).length,
    [presenceUsers]
  );

  const sortedHrTeam = useMemo(
    () => sortItemsByPresence(hrTeam, (member) => presenceUsers[member._id]),
    [hrTeam, presenceUsers]
  );

  const getMemberPresence = (memberId) =>
    getDerivedPresenceStatus(presenceUsers[memberId]);

  const getMemberDotClass = (memberId) => {
    const d = getAvatarDotStyle(getMemberPresence(memberId).status);
    return `${d.bg} ring-2 ${d.ring}${d.pulse ? " animate-pulse" : ""}`;
  };

  const getMemberPresenceLabel = (memberId) => {
    const presence = getMemberPresence(memberId);
    const data = presenceUsers[memberId];
    const rawDate =
      presence.status === "offline"
        ? data?.lastSeen
        : presence.status === "away"
        ? data?.lastActivityAt
        : null;
    const tooltip = rawDate ? `Last active on ${formatExactTimestamp(rawDate)}` : "";

    if (presence.status === "offline") {
      const label =
        presence.lastSeen && presence.lastSeen !== "never"
          ? `Last seen ${presence.lastSeen}`
          : "Offline";
      return { label, tooltip };
    }

    return { label: presence.label, tooltip };
  };

  const getMemberPresenceTextColor = (memberId) => {
    const { status } = getMemberPresence(memberId);
    if (
      status === "online" ||
      status === "active-now" ||
      status === "active-recently" ||
      status === "typing"
    ) {
      return "text-teal-700 dark:text-teal-300";
    }
    if (status === "away") return "text-amber-700 dark:text-amber-300";
    return "text-slate-600 dark:text-slate-400";
  };

  const activeDiscussions = useMemo(
    () =>
      discussions
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        )
        .slice(0, 4),
    [discussions]
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((meeting) => new Date(meeting.date || meeting.scheduledFor || 0) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.date || a.scheduledFor || 0) -
            new Date(b.date || b.scheduledFor || 0)
        )
        .slice(0, 4),
    [meetings]
  );

  const activeTeam = useMemo(
    () =>
      sortedHrTeam.filter((member) => {
        const { status } = getMemberPresence(member._id);
        return ["online", "active-now", "active-recently", "typing"].includes(status);
      }),
    [sortedHrTeam, presenceUsers]
  );

  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <PageTitle
          title="HR Team Hub"
          subtitle="Premium HR management and collaboration workspace"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="h-40 border border-white/55 rounded-3xl animate-pulse bg-white/70 dark:border-white/10 dark:bg-gradient-to-br dark:from-[#111827]/80 dark:to-[#0b1020]/90"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4 -m-4 overflow-hidden text-slate-950 dark:text-white sm:-m-6 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_5%,rgba(20,184,166,0.18),transparent_28%),radial-gradient(circle_at_82%_4%,rgba(124,58,237,0.22),transparent_32%),linear-gradient(135deg,rgba(248,250,252,0.94),rgba(226,232,240,0.72))] dark:bg-[radial-gradient(circle_at_12%_5%,rgba(20,184,166,0.13),transparent_30%),radial-gradient(circle_at_82%_4%,rgba(124,58,237,0.18),transparent_34%),linear-gradient(135deg,#070b16,#0f172a_45%,#111827)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] dark:opacity-[0.08] [background-image:linear-gradient(rgba(15,23,42,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.22)_1px,transparent_1px)] [background-size:72px_72px]" />
      <motion.div
        className="absolute rounded-full pointer-events-none left-1/2 top-10 h-72 w-72 bg-violet-500/20 blur-3xl"
        animate={{ x: [-40, 30, -40], y: [0, 28, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-[1800px] space-y-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <PageTitle
            title="HR Team Hub"
            subtitle="Unified HR collaboration, team management, discussions, and meetings"
          />
          <RefreshStatus
            isRefreshing={hrTeamRefresh.isRefreshing}
            lastUpdatedAt={hrTeamRefresh.lastUpdatedAt}
            className="shadow-lg w-fit border-white/50 bg-white/75 text-slate-700 shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200"
          />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className={`relative overflow-hidden rounded-[32px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl md:p-7 ${hrTheme.glass}`}
        >
          <motion.div
            className="absolute rounded-full -right-16 -top-20 h-72 w-72 bg-gradient-to-br from-violet-500/35 to-cyan-400/25 blur-3xl"
            animate={{ rotate: [0, 18, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-r from-teal-400/10 via-transparent to-violet-500/10" />

          <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-full shadow-sm border-white/60 bg-white/65 text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-300" />
                Collaboration Control Center
              </div>

              <div>
                <h2 className={`max-w-4xl text-3xl font-black leading-tight tracking-tight md:text-5xl ${hrTheme.textMain}`}>
                  A premium HR workspace for people, conversations, and decisions.
                </h2>
                <p className={`max-w-2xl mt-4 text-sm font-medium leading-7 md:text-base ${hrTheme.textSoft}`}>
                  Coordinate the HR team, follow live presence, launch discussions, and schedule meetings from one calm collaboration surface.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <PremiumButton onClick={() => setShowCreateHRModal(true)} icon={UserPlus}>
                  Add Team Member
                </PremiumButton>
                <PremiumButton
                  onClick={() => setShowNewMeeting(true)}
                  icon={Calendar}
                  tone="teal"
                >
                  Schedule Meeting
                </PremiumButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <HeroGlassPanel
                icon={Activity}
                label="Live Team"
                value={`${activeTeam.length || onlineCount} active`}
                caption={`${hrTeam.length} total HR members`}
              />
              <div className={`rounded-3xl border p-4 shadow-xl backdrop-blur-2xl ${hrTheme.glassSoft}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${hrTheme.textMuted}`}>
                    Active Indicators
                  </p>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                </div>
                <div className="flex -space-x-3">
                  {sortedHrTeam.slice(0, 6).map((member) => (
                    <div
                      key={member._id}
                      title={member.name}
                      className="relative flex items-center justify-center w-12 h-12 text-sm font-bold text-white border-2 border-white shadow-lg rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 dark:border-slate-950"
                    >
                      {member?.name?.charAt(0)?.toUpperCase() || "H"}
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 ${getMemberDotClass(member._id)}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          <PremiumStatCard title="Team Members" value={hrTeam.length} icon={Users} from="from-indigo-500" to="to-violet-500" caption="People operations" />
          <PremiumStatCard title="Discussions" value={discussions.length} icon={MessageCircle} from="from-violet-500" to="to-fuchsia-500" caption="Open knowledge loops" />
          <PremiumStatCard title="Meetings" value={meetings.length} icon={Calendar} from="from-amber-400" to="to-orange-500" caption="Scheduled syncs" />
          <PremiumStatCard title="Online Now" value={onlineCount} icon={Zap} from="from-teal-400" to="to-emerald-500" caption="Realtime presence" />
        </motion.div>

        <div className="flex flex-wrap gap-2 rounded-3xl border border-white/55 bg-white/70 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
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
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${hrTheme.focusRing} ${
                active
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/25"
                  : "text-slate-700 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

        <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white">
                  <Users className="w-5 h-5 text-violet-400" />
                  Team Members
                </h3>

                <div className="flex gap-2">
                  <PremiumButton onClick={() => setShowCreateHRModal(true)} icon={Plus} compact>
                    Add Member
                  </PremiumButton>
                  <PremiumButton onClick={() => setShowNewMeeting(true)} icon={Calendar} tone="teal" compact>
                    Meeting
                  </PremiumButton>
                </div>
              </div>

              <motion.div
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              >
                {sortedHrTeam.map((member) => (
                  <TeamMemberCard
                    key={member._id}
                    member={member}
                    dotClass={getMemberDotClass(member._id)}
                    presenceLabel={getMemberPresenceLabel(member._id)}
                    presenceTextColor={getMemberPresenceTextColor(member._id)}
                  />
                ))}

                {hrTeam.length === 0 && (
                  <EmptyWorkspace
                    icon={Users}
                    title="No HR team members found"
                    body="Add your first HR team member to begin building the collaboration workspace."
                    action={() => setShowCreateHRModal(true)}
                    actionLabel="Add HR Member"
                  />
                )}
              </motion.div>
            </div>

            <WorkspaceSidebar
              activeDiscussions={activeDiscussions}
              upcomingMeetings={upcomingMeetings}
              activeTeam={activeTeam}
              activity={activity}
              onAddMember={() => setShowCreateHRModal(true)}
              onOpenDiscussions={() => setActiveTab("discussions")}
              onNewMeeting={() => setShowNewMeeting(true)}
            />
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
    </div>
  );
}

function PremiumButton({ children, onClick, icon: Icon, tone = "violet", compact = false }) {
  const tones = {
    violet: "from-violet-600 to-indigo-600 text-white shadow-violet-700/25",
    teal: "from-teal-400 to-cyan-500 text-slate-950 shadow-cyan-500/25",
  };

  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${tones[tone]} ${
        compact ? "px-4 py-2.5 text-sm" : "px-5 py-3"
      } font-bold shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] ${hrTheme.focusRing}`}
    >
      <Icon className="w-4 h-4 transition-transform shrink-0 group-hover:scale-110" />
      {children}
    </button>
  );
}

function HeroGlassPanel({ icon: Icon, label, value, caption }) {
  return (
    <div className={`rounded-3xl border p-4 shadow-xl backdrop-blur-2xl ${hrTheme.glassSoft}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 shadow-lg rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-cyan-500/20">
          <Icon className="w-6 h-6 text-slate-950" />
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${hrTheme.textMuted}`}>
            {label}
          </p>
          <p className={`text-2xl font-black ${hrTheme.textMain}`}>{value}</p>
          <p className={`text-xs font-medium ${hrTheme.textMuted}`}>{caption}</p>
        </div>
      </div>
    </div>
  );
}

function TeamMemberCard({ member, dotClass, presenceLabel, presenceTextColor }) {
  const status = member.status || "Active";

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -5, scale: 1.01 }}
      className={`group relative overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all duration-300 hover:border-violet-300/60 hover:shadow-[0_28px_80px_rgba(99,102,241,0.18)] dark:hover:border-violet-400/30 ${hrTheme.glass}`}
    >
      <div className="absolute transition-opacity rounded-full -right-12 -top-16 h-36 w-36 bg-violet-500/12 blur-3xl group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center min-w-0 gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xl font-black text-white shadow-xl shadow-violet-500/20">
              {member?.name?.charAt(0)?.toUpperCase() || "H"}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white dark:border-slate-950 ${dotClass}`}
            />
          </div>

          <div className="min-w-0">
            <h4 className={`truncate text-lg font-black ${hrTheme.textMain}`}>
              {member.name}
            </h4>
            <p className={`truncate text-sm font-medium ${hrTheme.textMuted}`}>
              {member.email}
            </p>
            <p className={`mt-1 text-xs font-semibold ${presenceTextColor}`} title={presenceLabel.tooltip}>
              {presenceLabel.label}
            </p>
          </div>
        </div>

        <button className={`rounded-2xl border border-slate-200/70 bg-white/70 p-2 text-slate-600 shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white ${hrTheme.focusRing}`}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="relative flex flex-wrap gap-2 mt-5">
        <Badge className="px-3 py-1 text-xs font-bold border rounded-full border-violet-300/40 bg-gradient-to-r from-violet-500/15 to-indigo-500/15 text-violet-700 dark:border-violet-400/20 dark:text-violet-200">
          {member.role || "HR"}
        </Badge>
        <Badge
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            status === "Active"
              ? "border border-teal-300/40 bg-teal-500/12 text-teal-700 dark:border-teal-400/20 dark:text-teal-200"
              : "border border-slate-300/40 bg-slate-500/10 text-slate-600 dark:border-slate-400/20 dark:text-slate-300"
          }`}
        >
          {status}
        </Badge>
      </div>

      <div className="relative grid grid-cols-3 gap-2 pt-4 mt-5 border-t border-slate-200/70 dark:border-white/10">
        <IconAction icon={MessageCircle} label="Message" color="teal" />
        <IconAction icon={Video} label="Video" color="indigo" />
        <IconAction icon={Mail} label="Mail" color="amber" />
      </div>
    </motion.article>
  );
}

function IconAction({ icon: Icon, label, color }) {
  const colors = {
    teal: "text-teal-700 hover:bg-teal-500/12 dark:text-teal-300",
    indigo: "text-indigo-700 hover:bg-indigo-500/12 dark:text-indigo-300",
    amber: "text-amber-700 hover:bg-amber-500/12 dark:text-amber-300",
  };

  return (
    <button
      title={label}
      className={`flex items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 py-3 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 ${colors[color]} ${hrTheme.focusRing}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function WorkspaceSidebar({
  activeDiscussions,
  upcomingMeetings,
  activeTeam,
  activity,
  onAddMember,
  onOpenDiscussions,
  onNewMeeting,
}) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      <SidebarPanel title="Quick Actions" icon={Zap}>
        <ActionButton onClick={onAddMember} icon={UserPlus} label="Add HR Staff" gradient="from-violet-600 to-indigo-600" />
        <ActionButton onClick={onOpenDiscussions} icon={MessageCircle} label="Open Discussions" gradient="from-indigo-600 to-blue-500" />
        <ActionButton onClick={onNewMeeting} icon={Calendar} label="Schedule Meeting" gradient="from-teal-400 to-cyan-500" textClass="text-slate-950" />
      </SidebarPanel>

      <SidebarPanel title="Active Discussions" icon={MessageCircle}>
        <CompactList
          items={activeDiscussions}
          empty="No active discussions"
          render={(discussion) => (
            <>
              <p className={`line-clamp-1 text-sm font-bold ${hrTheme.textMain}`}>
                {discussion.title || "Untitled discussion"}
              </p>
              <p className={`mt-1 text-xs font-medium ${hrTheme.textMuted}`}>
                {discussion.replies?.length || 0} replies • {discussion.category || "General"}
              </p>
            </>
          )}
        />
      </SidebarPanel>

      <SidebarPanel title="Upcoming Meetings" icon={Calendar}>
        <CompactList
          items={upcomingMeetings}
          empty="No upcoming meetings"
          render={(meeting) => (
            <>
              <p className={`line-clamp-1 text-sm font-bold ${hrTheme.textMain}`}>
                {meeting.title || "Untitled meeting"}
              </p>
              <p className={`mt-1 text-xs font-medium ${hrTheme.textMuted}`}>
                {new Date(meeting.date || meeting.scheduledFor).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "Asia/Kolkata",
                })}{" "}
                • {meeting.time || "Scheduled"}
              </p>
            </>
          )}
        />
      </SidebarPanel>

      <SidebarPanel title="Live Team Status" icon={Activity}>
        <div className="space-y-2">
          {activeTeam.slice(0, 5).map((member) => (
            <div key={member._id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 dark:bg-white/[0.04]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
              <div className="min-w-0">
                <p className={`truncate text-sm font-bold ${hrTheme.textMain}`}>{member.name}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-300">Active now</p>
              </div>
            </div>
          ))}
          {activeTeam.length === 0 && <p className={`py-2 text-sm font-medium ${hrTheme.textMuted}`}>No one is active right now</p>}
        </div>
      </SidebarPanel>

      <SidebarPanel title="Recent Activity" icon={Clock}>
        <MiniTimeline activity={activity.slice(0, 4)} />
      </SidebarPanel>
    </aside>
  );
}

function SidebarPanel({ title, icon: Icon, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-[28px] border p-4 shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${hrTheme.glass}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center text-white h-9 w-9 rounded-2xl bg-slate-950 dark:bg-white/10">
          <Icon className="w-4 h-4" />
        </div>
        <h4 className={`text-sm font-black uppercase tracking-[0.16em] ${hrTheme.textSoft}`}>
          {title}
        </h4>
      </div>
      {children}
    </motion.section>
  );
}

function CompactList({ items, empty, render }) {
  if (!items.length) return <p className={`py-2 text-sm font-medium ${hrTheme.textMuted}`}>{empty}</p>;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item._id} className="rounded-2xl border border-slate-200/70 bg-white/60 p-3 transition hover:bg-white/80 dark:border-white/5 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
          {render(item)}
        </div>
      ))}
    </div>
  );
}

function MiniTimeline({ activity }) {
  if (!activity.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/70 bg-white/35 p-5 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
        <p className={`text-sm font-medium ${hrTheme.textMuted}`}>Realtime activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-3 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gradient-to-b before:from-violet-400 before:to-transparent">
      {activity.map((item, idx) => (
        <div key={idx} className="relative flex gap-3 pl-1">
          <span className="mt-1.5 h-7 w-7 rounded-full border-4 border-white bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.45)] dark:border-slate-950" />
          <div className="min-w-0 rounded-2xl bg-white/60 p-3 dark:bg-white/[0.04]">
            <p className={`line-clamp-2 text-sm font-semibold ${hrTheme.textMain}`}>{item.message}</p>
            <p className={`mt-1 text-xs font-medium ${hrTheme.textMuted}`}>
              {new Date(item.timestamp).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyWorkspace({ icon: Icon, title, body, action, actionLabel }) {
  return (
    <div className="col-span-full rounded-[28px] border border-dashed border-slate-300/80 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
      <Icon className="w-10 h-10 mx-auto mb-4 text-slate-500 dark:text-slate-400" />
      <h4 className={`text-lg font-black ${hrTheme.textMain}`}>{title}</h4>
      <p className={`mx-auto mt-2 max-w-md text-sm font-medium ${hrTheme.textMuted}`}>{body}</p>
      <PremiumButton onClick={action} icon={Plus} compact>
        {actionLabel}
      </PremiumButton>
    </div>
  );
}

function PremiumStatCard({ title, value, icon: Icon, from, to, caption }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -4, scale: 1.015 }}
      className={`group min-h-[150px] cursor-default rounded-[26px] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all duration-300 hover:border-white/80 hover:shadow-[0_26px_80px_rgba(15,23,42,0.16)] dark:hover:border-white/20 ${hrTheme.glass}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${hrTheme.textMuted}`}>
            {title}
          </p>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 text-4xl font-black ${hrTheme.textMain}`}
          >
            {value}
          </motion.p>
          <p className={`mt-2 text-xs font-medium ${hrTheme.textMuted}`}>{caption}</p>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${from} ${to} shadow-lg transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ onClick, icon: Icon, label, gradient, textClass = "text-white" }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r ${gradient} px-5 py-4 font-semibold ${textClass} shadow-lg transition duration-200 hover:scale-[1.02] ${hrTheme.focusRing}`}
    >
      <Icon className="w-5 h-5 transition-transform shrink-0 group-hover:scale-110" />
      {label}
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

function PremiumModalShell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}) {
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
        className={`w-full ${maxWidth} overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1020] shadow-[0_30px_100px_rgba(0,0,0,0.35)]`}
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-[#111827] to-[#0b1020] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="w-6 h-6 text-violet-300" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
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
  return "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-400/20";
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
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleFormChange = (field, value) => {
    setHRForm({ ...hrForm, [field]: value });
  };

  const handleAvatarPreview = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const passwordsMatch =
    hrForm.password &&
    hrForm.confirmPassword &&
    hrForm.password === hrForm.confirmPassword;

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-hidden bg-slate-950/82 backdrop-blur-xl sm:p-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/12 bg-[#07101f]/92 shadow-[0_34px_120px_rgba(0,0,0,0.62)] ring-1 ring-violet-300/10"
      >
        <motion.div
          className="absolute rounded-full pointer-events-none -right-20 -top-24 h-80 w-80 bg-violet-500/28 blur-3xl"
          animate={{ scale: [1, 1.12, 1], x: [0, -24, 0], y: [0, 18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full pointer-events-none -left-20 top-28 h-72 w-72 bg-cyan-400/16 blur-3xl"
          animate={{ scale: [1, 1.1, 1], x: [0, 18, 0], y: [0, -12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative border-b border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-transparent px-5 py-5 backdrop-blur-2xl sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start min-w-0 gap-4">
              <motion.div
                className="relative flex items-center justify-center flex-shrink-0 shadow-2xl h-14 w-14 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-700/35"
                animate={{ y: [0, -4, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <UserPlus className="text-white h-7 w-7" />
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#07101f] bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.95)]" />
              </motion.div>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  HR Onboarding
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Add Team Member
                </h2>
                <p className="max-w-2xl mt-2 text-sm leading-6 text-slate-300">
                  Create a polished HR staff profile, set secure access, and get the employee ready for collaboration.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center flex-shrink-0 transition border h-11 w-11 rounded-2xl border-white/10 bg-white/5 text-slate-300 hover:scale-105 hover:bg-white/10 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          id="create-hr-member-form"
          onSubmit={handleCreateHR}
          className="relative flex-1 px-4 py-5 overflow-y-auto sm:px-7 sm:py-6"
        >
          <div className="max-w-5xl mx-auto space-y-7">
            <ProfilePreviewPanel
              name={hrForm.name}
              email={hrForm.email}
              role="HR"
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarPreview}
            />

            <FormSection
              title="Basic Details"
              subtitle="Essential information about the employee"
              icon={Users}
              color="violet"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField label="Full Name" required error="">
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={hrForm.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-400/20"
                  />
                </FormField>

                <FormField label="Gender" required>
                  <select
                    value={hrForm.gender}
                    onChange={(e) => handleFormChange("gender", e.target.value)}
                    required
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 [&>option]:bg-slate-900"
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-400/20"
                  />
                </FormField>

                <FormField label="Mobile Number" required>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={hrForm.phone}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-400/20"
                  />
                </FormField>

                <FormField label="Blood Group">
                  <select
                    value={hrForm.bloodGroup}
                    onChange={(e) => handleFormChange("bloodGroup", e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 [&>option]:bg-slate-900"
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
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-400/20"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection
              title="Personal Details"
              subtitle="Personal and family information"
              icon={Heart}
              color="teal"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField label="Date of Birth">
                  <input
                    type="date"
                    value={hrForm.dateOfBirth}
                    onChange={(e) => handleFormChange("dateOfBirth", e.target.value)}
                    className="w-full px-4 py-3 text-white transition border outline-none rounded-xl border-white/10 bg-white/5 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20"
                  />
                </FormField>

                <FormField label="Marital Status">
                  <select
                    value={hrForm.maritalStatus}
                    onChange={(e) => handleFormChange("maritalStatus", e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 [&>option]:bg-slate-900"
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-teal-400/20"
                  />
                </FormField>

                <FormField label="Emergency Contact">
                  <input
                    type="tel"
                    placeholder="+91 9876543211"
                    value={hrForm.emergencyContact}
                    onChange={(e) => handleFormChange("emergencyContact", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-teal-400/20"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection
              title="Employment Details"
              subtitle="Job and assignment information"
              icon={Briefcase}
              color="indigo"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField label="Department">
                  <select
                    value={hrForm.department}
                    onChange={(e) => handleFormChange("department", e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 [&>option]:bg-slate-900"
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-400/20"
                  />
                </FormField>

                <FormField label="Joining Date">
                  <input
                    type="date"
                    value={hrForm.joiningDate}
                    onChange={(e) => handleFormChange("joiningDate", e.target.value)}
                    className="w-full px-4 py-3 text-white transition border outline-none rounded-xl border-white/10 bg-white/5 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </FormField>

                <FormField label="Employee Type">
                  <select
                    value={hrForm.employeeType}
                    onChange={(e) => handleFormChange("employeeType", e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 [&>option]:bg-slate-900"
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-400/20"
                  />
                </FormField>

                <FormField label="Reporting Manager">
                  <input
                    type="text"
                    placeholder="Enter manager's name"
                    value={hrForm.reportingManager}
                    onChange={(e) => handleFormChange("reportingManager", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-400/20"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection
              title="Account Details"
              subtitle="System access and security settings"
              icon={Lock}
              color="amber"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField label="Password" required hint="Minimum 8 characters">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={hrForm.password}
                        onChange={(e) => handleFormChange("password", e.target.value)}
                        required
                        minLength={8}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormField>

                  <FormField
                    label="Confirm Password"
                    required
                    hint="Must match password"
                  >
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        value={hrForm.confirmPassword}
                        onChange={(e) =>
                          handleFormChange("confirmPassword", e.target.value)
                        }
                        required
                        minLength={8}
                        className={`w-full rounded-xl border bg-white/5 px-4 py-3 pr-11 text-white outline-none transition placeholder:text-slate-500 ${
                          hrForm.confirmPassword && !passwordsMatch
                            ? "border-red-400/50 focus:border-red-400/70 focus:ring-2 focus:ring-red-400/20"
                            : hrForm.confirmPassword && passwordsMatch
                            ? "border-teal-400/50 focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                            : "border-white/10 focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {showConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormField>
                </div>

                <FormField label="Account Status">
                  <select
                    value={hrForm.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 [&>option]:bg-slate-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </FormField>
              </div>
            </FormSection>
          </div>
        </form>

        <div className="relative flex flex-col gap-3 border-t border-white/10 bg-[#07101f]/92 px-5 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            Details are saved securely to the existing HR account workflow.
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-200 transition-all hover:scale-[1.02] hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-hr-member-form"
            disabled={createHRLoading || (hrForm.confirmPassword && !passwordsMatch)}
            className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-8 py-3 font-black text-white shadow-[0_16px_45px_rgba(99,102,241,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_20px_55px_rgba(34,211,238,0.22)] disabled:cursor-not-allowed disabled:opacity-75 disabled:saturate-75"
          >
            {createHRLoading ? (
              <>
                <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 transition-transform group-hover:scale-110" />
                Create Staff Member
              </>
            )}
          </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfilePreviewPanel({ name, email, role, avatarPreview, onAvatarChange }) {
  const initial = name?.charAt(0)?.toUpperCase() || "H";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_70px_rgba(2,6,23,0.28)] backdrop-blur-2xl"
    >
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/14 blur-3xl" />
      <div className="relative grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
        <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-violet-300/30 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-5 text-center transition hover:border-cyan-300/50 hover:from-violet-500/16 hover:to-cyan-500/10">
          <input type="file" accept="image/*" onChange={onAvatarChange} className="sr-only" />
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[30px] border border-white/15 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 text-4xl font-black text-white shadow-2xl shadow-violet-700/25">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-[#07101f] bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.95)]" />
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-100 transition group-hover:bg-white/15">
            <UploadCloud className="h-4 w-4" />
            Upload profile photo
          </div>
          <p className="mt-2 text-xs text-slate-400">PNG or JPG preview only. Profile API remains unchanged.</p>
        </label>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">
              Employee preview
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {name || "New HR team member"}
            </h3>
            <p className="mt-1 text-sm text-slate-400">{email || "email@company.com"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <p className="text-xs text-slate-500">Role</p>
              <p className="mt-1 font-bold text-white">{role}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle className="h-4 w-4" />
                Active
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <p className="text-xs text-slate-500">Workspace</p>
              <p className="mt-1 font-bold text-cyan-200">HR Hub</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FormSection({ title, subtitle, icon: Icon, color, children }) {
  const colorMap = {
    violet: "from-violet-500/14 via-indigo-500/6 to-white/[0.03] border-violet-400/24 shadow-violet-950/18",
    teal: "from-teal-500/14 via-cyan-500/6 to-white/[0.03] border-teal-400/24 shadow-teal-950/18",
    indigo: "from-indigo-500/14 via-blue-500/6 to-white/[0.03] border-indigo-400/24 shadow-indigo-950/18",
    amber: "from-amber-500/14 via-orange-500/6 to-white/[0.03] border-amber-400/24 shadow-amber-950/18",
  };

  const iconColorMap = {
    violet: "text-violet-300",
    teal: "text-teal-300",
    indigo: "text-indigo-300",
    amber: "text-amber-300",
  };

  const iconBgMap = {
    violet: "bg-violet-500/15",
    teal: "bg-teal-500/15",
    indigo: "bg-indigo-500/15",
    amber: "bg-amber-500/15",
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[30px] border bg-gradient-to-br ${colorMap[color]} p-5 shadow-[0_18px_70px_rgba(2,6,23,0.22)] backdrop-blur-2xl sm:p-6`}
    >
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/8 blur-3xl" />
      <div className="relative mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgMap[color]} ${iconColorMap[color]} ring-1 ring-white/10 shadow-lg`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-0.5 text-sm leading-5 text-slate-400">{subtitle}</p>
        </div>
      </div>
      <motion.div
        className="relative"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}

function FormField({ label, required, hint, children, error }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className="group space-y-2"
    >
      <label className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.045] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-300 transition-colors group-focus-within:border-violet-300/30 group-focus-within:text-violet-100">
        {label} {required && <span className="text-red-300">*</span>}
      </label>
      <div className="rounded-[18px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 p-px transition group-focus-within:from-violet-400/70 group-focus-within:via-cyan-300/60 group-focus-within:to-violet-400/70">
        <div className="rounded-[17px] bg-[#08111f]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {children}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </motion.div>
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
                <option value="discussion" className="bg-slate-900">
                  Discussion
                </option>
                <option value="video-call" className="bg-slate-900">
                  Video Call
                </option>
                <option value="onsite" className="bg-slate-900">
                  On-site Meeting
                </option>
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
                className={`${inputClass()} [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
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
                    className="w-4 h-4 rounded accent-violet-500"
                  />

                  <div className="flex items-center justify-center text-sm font-bold text-white h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
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
              className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-white shadow-[0_10px_30px_rgba(99,102,241,0.30)] disabled:cursor-not-allowed disabled:opacity-75 disabled:saturate-75"
            >
              {loading ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </div>
      </form>
    </PremiumModalShell>
  );
}
