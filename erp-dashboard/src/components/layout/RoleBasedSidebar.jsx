import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Clock3, User,
  Megaphone, FileText, ClipboardList, BadgeDollarSign,
  Users, Shield, Settings, BookOpen, MessageCircle, ChevronRight, TrendingUp, AlertCircle, Building2, File, CheckCircle2, Headphones
} from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import SidebarProfile from "../ui/SidebarProfile.jsx";
import { useSpotifyWellnessSettings } from "../../services/spotify/spotifyService.js";

const base = "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm theme-sidebar-text transition-all duration-300 ease-smooth select-none cursor-pointer group border border-transparent";
const active = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 shadow-[0_12px_28px_rgba(16,185,129,0.18)] border-emerald-300/45 dark:border-emerald-300/25";
const inactive = "text-slate-600 dark:text-slate-300 hover:bg-white/45 dark:hover:bg-white/10 hover:text-emerald-700 dark:hover:text-emerald-200 hover:border-white/45 dark:hover:border-white/10 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]";

function Item({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
    >
      <span className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-all duration-300 rounded-xl bg-white/55 dark:bg-white/10 border border-white/45 dark:border-white/10 ease-smooth group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-400/15">
        {React.cloneElement(icon, { 
          className: "w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-200 transition-colors duration-300" 
        })}
      </span>
      <span className="flex-1 truncate theme-sidebar-text">{label}</span>
      <ChevronRight className="w-3 h-3 transition-all duration-300 opacity-0 group-hover:opacity-100" />
    </NavLink>
  );
}

function NavSection({ title, items }) {
  return (
    <div>
      {title && (
        <div className="px-4 py-3 mt-4 first:mt-0">
          <p className="text-xs theme-label uppercase">
            {title}
          </p>
        </div>
      )}
      <nav className="space-y-1">
        {items.map((l) => <Item key={l.to} {...l} />)}
      </nav>
    </div>
  );
}

export default function RoleBasedSidebar({ open, setOpen }) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isHR = user?.role === ROLES.HR;
  const { spotifyWellnessEnabled } = useSpotifyWellnessSettings();

  const mainLinks = [
    { to: isAdmin || isHR ? "/admin/analytics" : "/analytics", icon: <TrendingUp className="w-4 h-4" />, label: "Analytics", end: true },
    { to: "/", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
    { to: "/profile", icon: <User className="w-4 h-4" />, label: "Profile" },
    { to: "/chat", icon: <MessageCircle className="w-4 h-4" />, label: "Messages" },
  ];

  const workLinks = [
    { to: "/attendance", icon: <Clock3 className="w-4 h-4" />, label: "Attendance" },
    { to: "/calendar", icon: <CalendarDays className="w-4 h-4" />, label: "Calendar" },
    { to: "/leave", icon: <ClipboardList className="w-4 h-4" />, label: "Leave" },
    { to: "/tasks", icon: <CheckCircle2 className="w-4 h-4" />, label: "Tasks" },
    { to: "/payroll", icon: <BadgeDollarSign className="w-4 h-4" />, label: "Payroll" },
    ...(isAdmin ? [] : [{ to: "/documents", icon: <File className="w-4 h-4" />, label: "Documents" }]),
  ];

  const companyLinks = [
    { to: "/news", icon: <Megaphone className="w-4 h-4" />, label: "News" },
    { to: "/policy", icon: <Shield className="w-4 h-4" />, label: "Policies" },
    ...(spotifyWellnessEnabled ? [{ to: "/spotify-wellness", icon: <Headphones className="w-4 h-4" />, label: "Spotify Wellness" }] : []),
    { to: "/complaints", icon: <AlertCircle className="w-4 h-4" />, label: "Raise Ticket" },
  ];

  const adminLinks = isAdmin ? [
    { to: "/admin/documents", icon: <File className="w-4 h-4" />, label: "Manage Documents" },
    { to: "/admin/department", icon: <Building2 className="w-4 h-4" />, label: "Departments" },
    { to: "/admin/attendance", icon: <Clock3 className="w-4 h-4" />, label: "Logs" },
    { to: "/admin/attendance-management", icon: <Clock3 className="w-4 h-4" />, label: "Attendance Management" },
    { to: "/admin/users", icon: <Users className="w-4 h-4" />, label: "All Staff" },
    { to: "/admin/hr", icon: <Users className="w-4 h-4" />, label: "HR Group" },
    { to: "/admin/company-settings", icon: <Settings className="w-4 h-4" />, label: "Company Settings" },
    { to: "/admin/complaints", icon: <AlertCircle className="w-4 h-4" />, label: "Complaints" },
    { to: "/leave/types", icon: <Settings className="w-4 h-4" />, label: "Leave Types" }
  ] : [];

  const hrLinks = isHR ? [
    { to: "/leave/manage", icon: <Settings className="w-4 h-4" />, label: "Manage Leave" },
    { to: "/payroll/manage", icon: <Settings className="w-4 h-4" />, label: "Manage Payroll" },
    { to: "/hr/documents", icon: <File className="w-4 h-4" />, label: "Manage Documents" },
    { to: "/hr/attendance-management", icon: <Clock3 className="w-4 h-4" />, label: "Attendance Management" },
    { to: "/admin/department", icon: <Building2 className="w-4 h-4" />, label: "Departments" },
    { to: "/admin/attendance", icon: <Clock3 className="w-4 h-4" />, label: "Logs" },
    { to: "/admin/users", icon: <Users className="w-4 h-4" />, label: "Team" },
  ] : [];

  const hrManagementLinks = [...adminLinks, ...hrLinks];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300 ease-smooth ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`glass-sidebar fixed z-50 lg:sticky top-0 left-0 h-dvh w-[min(18rem,calc(100vw-1rem))] max-w-full border-y-0 border-l-0 rounded-none transition-all duration-300 ease-smooth flex flex-col lg:h-dvh lg:w-72 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header - Profile */}
        <div className="border-b theme-border p-4 sm:p-5 lg:p-6">
          <SidebarProfile />
        </div>

        {/* Navigation - Scrollable */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3 sm:py-4">
          <NavSection items={mainLinks} />
          <div className="my-2 border-t theme-border" />
          <NavSection title="Work" items={workLinks} />
          <div className="my-2 border-t theme-border" />
          <NavSection title="Company" items={companyLinks} />
          
          {hrManagementLinks.length > 0 && (
            <>
              <div className="my-2 border-t theme-border" />
              <NavSection title="Management" items={hrManagementLinks} />
            </>
          )}
        </nav>

        {/* Footer - Optional */}
       
      </aside>
    </>
  );
}
