import React from "react";
import { Menu, LogOut, Sun, Moon } from "lucide-react";
import NotificationCenter from "../ui/NotificationCenter.jsx";
import DigitalClock from "../ui/DigitalClock.jsx";
import api from "../../lib/api.js";
import { useAuthStore, logout } from "../../store/authStore.js";
import { toast } from "../../store/toastStore.js";
import Button from "../ui/Button.jsx";
import { useTheme } from "../providers/ThemeProvider.jsx";

export default function HeaderBar({ onMenu }) {
  const user = useAuthStore((s) => s.user);
  const { isDark, toggleTheme } = useTheme();

  const onLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error(e);
    }
    logout();
    toast({ title: "Logged out", type: "success" });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 transition-all duration-300 bg-white border-b ease-smooth border-slate-200 dark:border-slate-700 dark:bg-slate-800 shadow-elevation-1 backdrop-blur-md">
      
      <div className="flex items-center justify-between h-16 px-4 md:px-8 lg:px-10">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">
          
          {/* Mobile Menu Button */}
          <button
            onClick={onMenu}
            className="inline-flex items-center justify-center w-10 h-10 transition-all duration-300 rounded-lg ease-smooth lg:hidden hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-brand-accent dark:hover:text-brand-accent hover:shadow-accent-glow/10 active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Digital Clock */}
          <DigitalClock />

        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4 md:gap-6">

          {/* Divider */}
          <div className="hidden w-px h-6 md:block bg-slate-200 dark:bg-slate-700" />

          {/* Notifications */}
          <NotificationCenter />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-brand-accent dark:hover:text-brand-accent transition-all duration-300 ease-smooth hover:shadow-accent-glow/10 active:scale-95"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Logout Button (Desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="hidden transition-all duration-300 border sm:flex ease-smooth text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800"
          >
            Logout
          </Button>

          {/* Logout Icon (Mobile) */}
          <button
            onClick={onLogout}
            className="inline-flex sm:hidden items-center justify-center w-10 h-10 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all duration-300 ease-smooth"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>

        </div>
      </div>
    </header>
  );
}