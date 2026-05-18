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
    <div className="app-shell-premium flex min-h-dvh w-full flex-col overflow-hidden lg:h-dvh lg:flex-row transition-colors duration-300 ease-smooth">
      {/* Sidebar */}
      <RoleBasedSidebar open={open} setOpen={setOpen} />

      {/* Main Content Area */}
      <main className="flex min-h-0 flex-1 flex-col min-w-0">
        {/* Header */}
        <HeaderBar onMenu={() => setOpen(true)} />

        {/* Content Wrapper - Only this scrolls, not the sidebar */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full bg-transparent p-3 transition-colors duration-300 ease-smooth sm:p-4 md:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-[1800px] min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
