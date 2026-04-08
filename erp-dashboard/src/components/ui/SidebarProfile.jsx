import React from "react";
import { useAuthStore } from "../../store/authStore.js";

export default function SidebarProfile() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4 bg-white border-b dark:bg-brand-card border-slate-200 dark:border-slate-800">
      
      <div className="flex items-center gap-3">

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white border rounded-lg shadow-md bg-gradient-to-br from-brand-accent to-brand-accent/60 border-brand-accent/30">
            {(user?.name || user?.firstName || "U").charAt(0).toUpperCase()}
          </div>

          {/* Online status — current user is always online while viewing */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white dark:border-brand-card bg-green-500 ring-2 ring-green-400/30 transition-colors duration-300" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          
          {/* Name */}
          <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
            {user?.firstName || user?.name || "User"}
          </p>

          {/* Email */}
          <p className="text-xs truncate text-slate-500 dark:text-slate-400">
            {user?.email || "user@example.com"}
          </p>

          {/* Optional subtle role (premium style instead of badge) */}
          <p className="text-[10px] mt-0.5 uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {user?.role || "Employee"}
          </p>

        </div>
      </div>
    </div>
  );
}