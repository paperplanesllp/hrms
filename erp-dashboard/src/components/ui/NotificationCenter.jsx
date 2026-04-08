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
  const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead, getUnreadCount, getPolicyNotifications } = useNotificationStore();
  const [open, setOpen] = useState(false);

  const unreadCount = getUnreadCount();
  const policyNotifications = getPolicyNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

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
        return <CheckCircle2 className="w-5 h-5 text-[var(--text-success)]" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-[var(--text-error)]" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "policy":
        return <Shield className="w-5 h-5 text-[var(--text-error)]" />;
      default:
        return <Info className="w-5 h-5 text-[var(--text-light-blue)]" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "success":
        return "bg-[#E6F4EA] border-[#137333]";
      case "error":
        return "bg-[#FCE8E6] border-[#C5221F]";
      case "warning":
        return "bg-orange-50 border-orange-400";
      case "policy":
        return "bg-red-50 border-red-400";
      default:
        return "bg-[#F6FAFD] border-[#B3CFE5]";
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[#F6FAFD] transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-[var(--text-light-blue)]" />
        
        {/* Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#B3CFE5] z-50">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-[#B3CFE5] p-4 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-main)]">Notifications</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-[var(--text-light)] hover:text-[var(--text-main)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-[var(--text-ultra-light)] mb-3 opacity-50" />
              <p className="text-sm text-[var(--text-light)]">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Clear All Button */}
              <div className="p-4 border-b border-[#B3CFE5]">
                <Button
                  onClick={handleClearAll}
                  variant="ghost"
                  className="w-full text-[var(--text-light-blue)] hover:text-[#3a5f87] gap-2"
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
                  className="border-b border-[#B3CFE5]/30 p-4 hover:bg-[#F6FAFD] transition-colors cursor-pointer bg-red-50 border-b-2 border-red-200"
                >
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-[var(--text-error)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-900">{notif.title}</p>
                      <p className="text-xs text-[var(--text-error)] mt-0.5">{notif.message}</p>
                      <p className="text-xs text-[var(--text-error)] font-medium mt-2">⚠️ Requires acknowledgment</p>
                    </div>
                    <button
                      onClick={(e) => handleDismiss(e, notif._id)}
                      className="text-[var(--text-error)] hover:text-red-800 flex-shrink-0"
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
                    className="border-b border-[#B3CFE5]/30 p-4 hover:bg-[#F6FAFD] transition-colors cursor-pointer"
                  >
                    <div className="flex gap-3">
                      {getNotificationIcon(notif.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-main)] text-sm">{notif.title}</p>
                        <p className="text-xs text-[var(--text-light)] mt-0.5">{notif.message}</p>
                        <p className="text-xs text-[var(--text-ultra-light)] mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(e, notif._id)}
                        className="text-[var(--text-light)] hover:text-[var(--text-main)] flex-shrink-0"
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
