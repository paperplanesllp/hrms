import React from "react";
import { useAuthStore } from "../../store/authStore.js";

export default function SidebarProfile() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.firstName || user?.name || "User";
  const profileImageUrl =
    user?.profileImageUrl ||
    user?.profileImage ||
    user?.profilePhoto ||
    user?.avatar ||
    user?.photo ||
    user?.picture ||
    user?.image ||
    "";
  const avatarInitial = (displayName || "U").charAt(0).toUpperCase();

  return (
    <div className="glass-panel rounded-3xl p-4">
      
      <div className="flex items-center gap-3">

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-emerald-200/50 bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white shadow-[0_14px_32px_rgba(16,185,129,0.26)] ring-2 ring-white/65 transition-all duration-300 dark:border-emerald-300/20 dark:ring-white/10">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={`${displayName} profile`}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>

          {/* Online status — current user is always online while viewing */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18)] transition-colors duration-300 dark:border-slate-950 dark:bg-emerald-300" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          
          {/* Name */}
          <p className="text-sm font-semibold truncate theme-text-primary">
            {displayName}
          </p>

          {/* Email */}
          <p className="text-xs truncate theme-text-secondary">
            {user?.email || "user@example.com"}
          </p>

          {/* Optional subtle role (premium style instead of badge) */}
          <p className="text-[10px] mt-0.5 uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {user?.role || "Employee"}
          </p>

        </div>
      </div>
    </div>
  );
}
