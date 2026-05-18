import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/enterpriseNotificationStore.js";
import { Bell, X, AlertCircle, CheckCircle2, Info, Shield, Clock, Trash2 } from "lucide-react";
import Button from "./Button.jsx";

/**
 * Notification Center Component
 * Displays notification badge and expandable notification list
 * Shows persistent policy update notifications prominently
 */
export default function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, getUnreadCount, getPolicyNotifications } = useNotificationStore();
  const [open, setOpen] = useState(false);

  const unreadCount = getUnreadCount();
  const policyNotifications = getPolicyNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (notif) => {
    navigate(notif.targetUrl);
    markAsRead(notif._id);
    setOpen(false);
  };

  const handleDismiss = (e, notifId) => {
    e.stopPropagation();
    markAsRead(notifId);
  };

  const handleClearAll = () => {
    markAllAsRead();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-300" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-300" />;
      case "policy":
        return <Shield className="w-5 h-5 text-rose-600 dark:text-rose-300" />;
      default:
        return <Info className="w-5 h-5 text-teal-600 dark:text-teal-300" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-200/40 bg-white/65 text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/60 hover:bg-white/85 hover:text-teal-700 hover:shadow-[0_16px_36px_rgba(20,184,166,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-teal-300/30 dark:hover:bg-white/15 dark:hover:text-teal-100"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_8px_18px_rgba(225,29,72,0.34)] dark:border-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-3xl border border-teal-200/50 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/82 dark:shadow-[0_28px_80px_rgba(0,0,0,0.48)] sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[22rem] sm:max-w-[calc(100vw-2rem)]">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-teal-100/80 bg-white/88 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">Notifications</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50/80 text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_22px_rgba(15,23,42,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 dark:border-white/10 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/14 dark:hover:text-white"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-8 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-teal-200/70 bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-600 shadow-[0_16px_36px_rgba(20,184,166,0.16)] dark:border-teal-300/15 dark:from-teal-400/10 dark:to-emerald-400/10 dark:text-teal-200">
                <Bell className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">No notifications yet</p>
              <p className="mt-1 max-w-48 text-xs leading-5 text-slate-500 dark:text-slate-400">
                New updates, reminders, and approvals will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto sm:max-h-96">
              {/* Clear All Button */}
              <div className="border-b border-teal-100/70 bg-teal-50/35 p-4 dark:border-white/10 dark:bg-white/5">
                <Button
                  onClick={handleClearAll}
                  variant="ghost"
                  className="w-full gap-2 rounded-2xl border-teal-200/60 bg-white/65 text-teal-700 hover:text-teal-800 dark:border-white/10 dark:bg-white/8 dark:text-teal-200 dark:hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>

              {/* Policy Notifications First */}
              {policyNotifications.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className="cursor-pointer border-b border-rose-100/80 bg-rose-50/80 p-4 transition-all duration-200 hover:bg-rose-50 hover:shadow-[inset_3px_0_0_rgba(225,29,72,0.52)] dark:border-rose-300/10 dark:bg-rose-950/22 dark:hover:bg-rose-950/32"
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-rose-200/70 bg-white/75 text-rose-600 shadow-sm dark:border-rose-300/15 dark:bg-white/8 dark:text-rose-200">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-rose-950 dark:text-rose-50">{notif.title}</p>
                      <p className="mt-1 text-xs leading-5 text-rose-700 dark:text-rose-200/90">{notif.message}</p>
                      <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-200">Requires acknowledgment</p>
                    </div>
                    <button
                      onClick={(e) => handleDismiss(e, notif._id)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-rose-500 transition hover:bg-white/75 hover:text-rose-800 dark:text-rose-200 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Dismiss notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Other Notifications */}
              {notifications
                .filter(notif => !notif.isPolicyUpdate)
                .map(notif => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className="cursor-pointer border-b border-slate-200/70 bg-white/40 p-4 transition-all duration-200 hover:bg-teal-50/70 hover:shadow-[inset_3px_0_0_rgba(20,184,166,0.5)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-teal-400/10"
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-white/80 shadow-sm dark:border-teal-300/10 dark:bg-white/8">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-950 dark:text-white">{notif.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{notif.message}</p>
                        <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                          {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(e, notif._id)}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
