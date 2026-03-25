import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import RoleBasedSidebar from "./RoleBasedSidebar.jsx";
import HeaderBar from "./HeaderBar.jsx";
import { useNewsNotifications } from "../../lib/useNewsNotifications.js";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  
  // Load news notifications on app start
  useNewsNotifications();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-800 flex flex-col lg:flex-row transition-colors duration-300 ease-smooth">
      {/* Sidebar */}
      <RoleBasedSidebar open={open} setOpen={setOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <HeaderBar onMenu={() => setOpen(true)} />

        {/* Content Wrapper - Only this scrolls, not the sidebar */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 ease-smooth">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}