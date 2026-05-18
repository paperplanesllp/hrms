import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, Sun, Moon } from "lucide-react";
import NotificationCenter from "../ui/NotificationCenter.jsx";
import DigitalClock from "../ui/DigitalClock.jsx";
import CompactWeatherWidget from "../ui/CompactWeatherWidget.jsx";
import api from "../../lib/api.js";
import { useAuthStore, logout } from "../../store/authStore.js";
import { toast } from "../../store/toastStore.js";
import Button from "../ui/Button.jsx";
import { useTheme } from "../providers/ThemeProvider.jsx";
import { ROLES } from "../../app/constants.js";

export default function HeaderBar({ onMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isDark, toggleTheme } = useTheme();
  const showDashboardWeather =
    location.pathname === "/" &&
    (user?.role === ROLES.ADMIN || user?.role === ROLES.USER);

  const onLogout = () => {
    const currentRole = user?.role;
    const redirectTo = currentRole === ROLES.SUPERADMIN ? "/superadmin" : "/login";

    sessionStorage.removeItem("logoutRedirect");

    // background logout API
    api.post("/auth/logout").catch((e) => console.error(e));

    logout();

    toast({
      title: "Logged out",
      type: "success",
    });

    // Force a hard redirect so no other guards can override it.
    window.location.replace(redirectTo);
  };
  return (
    <header className="glass-navbar sticky top-0 z-30 border-x-0 border-t-0 rounded-none transition-all duration-300 ease-smooth">    
      <div className="flex items-center justify-between h-16 px-4 md:px-8 lg:px-10">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">         
          {/* Mobile Menu Button */}
          <button
            onClick={onMenu}
            className="glass-icon-btn inline-flex items-center justify-center w-10 h-10 transition-all duration-300 ease-smooth lg:hidden text-slate-600 dark:text-slate-300 hover:text-brand-accent dark:hover:text-brand-accent active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Digital Clock */}
          <DigitalClock />

          {/* Dashboard-only compact weather */}
          {showDashboardWeather && <CompactWeatherWidget />}

        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4 md:gap-6">

          {/* Divider */}
          <div className="hidden w-px h-6 md:block bg-slate-300/70 dark:bg-white/10" />

          {/* Notifications */}
          <NotificationCenter />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="glass-theme-toggle"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="glass-theme-toggle-icon" /> : <Moon className="glass-theme-toggle-icon" />}
          </button>

          {/* Logout Button (Desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="hidden sm:flex"
          >
            Logout
          </Button>

          {/* Logout Icon (Mobile) */}
          <button
            onClick={onLogout}
            className="glass-icon-btn inline-flex sm:hidden items-center justify-center w-10 h-10 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-300 transition-all duration-300 ease-smooth"
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
