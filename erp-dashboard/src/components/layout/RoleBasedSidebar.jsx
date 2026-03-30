import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Clock3, User,
  Megaphone, FileText, ClipboardList, BadgeDollarSign,
  Users, Shield, Settings, BookOpen, MessageCircle, ChevronRight, TrendingUp, AlertCircle, Building2, File, CheckCircle2
} from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import SidebarProfile from "../ui/SidebarProfile.jsx";

const base = "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-smooth select-none cursor-pointer group";
const active = "bg-brand-accent/15 text-brand-accent shadow-accent-glow/20 border border-brand-accent/40 dark:bg-brand-accent/20 dark:text-brand-accent dark:border-brand-accent/50";
const inactive = "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-accent dark:hover:text-brand-accent hover:border border-slate-200 dark:border-slate-700 hover:shadow-accent-glow/10";

function Item({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
    >
      <span className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-all duration-300 rounded-lg bg-slate-100 dark:bg-slate-700 ease-smooth group-hover:bg-brand-accent/10 dark:group-hover:bg-brand-accent/20">
        {React.cloneElement(icon, { 
          className: "w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-brand-accent transition-colors duration-300" 
        })}
      </span>
      <span className="flex-1 tracking-tight truncate text-slate-900 dark:text-slate-100">{label}</span>
      <ChevronRight className="w-3 h-3 transition-all duration-300 opacity-0 group-hover:opacity-100" />
    </NavLink>
  );
}

function NavSection({ title, items }) {
  return (
    <div>
      {title && (
        <div className="px-4 py-3 mt-4 first:mt-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-500">
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
    { to: "/worksheet", icon: <FileText className="w-4 h-4" />, label: "Worksheet" },
    ...(isAdmin ? [] : [{ to: "/documents", icon: <File className="w-4 h-4" />, label: "Documents" }]),
  ];

  const companyLinks = [
    { to: "/news", icon: <Megaphone className="w-4 h-4" />, label: "News" },
    { to: "/policy", icon: <Shield className="w-4 h-4" />, label: "Policies" },
    { to: "/complaints", icon: <AlertCircle className="w-4 h-4" />, label: "Complaints" },
  ];

  const adminLinks = isAdmin ? [
    { to: "/admin/documents", icon: <File className="w-4 h-4" />, label: "Manage Documents" },
    { to: "/admin/department", icon: <Building2 className="w-4 h-4" />, label: "Departments" },
    { to: "/admin/attendance", icon: <Clock3 className="w-4 h-4" />, label: "Logs" },
    { to: "/admin/users", icon: <Users className="w-4 h-4" />, label: "All Staff" },
    { to: "/admin/hr", icon: <Users className="w-4 h-4" />, label: "HR Group" },
    { to: "/admin/company-settings", icon: <Settings className="w-4 h-4" />, label: "Company Settings" },
    { to: "/admin/complaints", icon: <AlertCircle className="w-4 h-4" />, label: "Complaints" },
    { to: "/leave/types", icon: <Settings className="w-4 h-4" />, label: "Leave Types" }
  ] : [];

  const hrLinks = isHR ? [
    { to: "/tasks/manage", icon: <CheckCircle2 className="w-4 h-4" />, label: "Manage Tasks" },
    { to: "/leave/manage", icon: <Settings className="w-4 h-4" />, label: "Manage Leave" },
    { to: "/payroll/manage", icon: <Settings className="w-4 h-4" />, label: "Manage Payroll" },
    { to: "/hr/documents", icon: <File className="w-4 h-4" />, label: "Manage Documents" },
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
        className={`fixed z-50 lg:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 backdrop-blur-md transition-all duration-300 ease-smooth flex flex-col lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header - Profile */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <SidebarProfile />
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <NavSection items={mainLinks} />
          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
          <NavSection title="Work" items={workLinks} />
          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
          <NavSection title="Company" items={companyLinks} />
          
          {hrManagementLinks.length > 0 && (
            <>
              <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
              <NavSection title="Management" items={hrManagementLinks} />
            </>
          )}
        </nav>

        {/* Footer - Optional */}
       
      </aside>
    </>
  );
}