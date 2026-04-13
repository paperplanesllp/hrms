import React, { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Users, Loader2 } from "lucide-react";
import api from "../../lib/api.js";
import { usePresenceMap } from "../../hooks/usePresence.js";
import { getInitials } from "./chatUtils.js";
import { toast } from "../../store/toastStore.js";

function PresenceDot({ isOnline }) {
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 absolute bottom-0 right-0 ${
        isOnline ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    />
  );
}

function UserAvatar({ user, size = "md" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (user.avatar) {
    return (
      <div className={`relative flex-shrink-0 ${sizeClass} rounded-full overflow-hidden`}>
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`relative flex-shrink-0 ${sizeClass} rounded-full flex items-center justify-center font-bold text-white`}
      style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)" }}
    >
      {getInitials(user.name)}
    </div>
  );
}

export default function NewChatModal({ onClose, onSelectUser, onCreateGroup, currentUserId }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("new"); // "new" | "group"
  const [groupName, setGroupName] = useState("");
  const inputRef = useRef(null);

  const presenceMap = usePresenceMap(users.map((u) => u._id));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/users");
        const allUsers = Array.isArray(res.data) ? res.data : res.data?.users || [];
        const employees = allUsers.filter((u) => {
          if (!u?._id) return false;
          if (u._id === currentUserId) return false;
          return ["USER", "HR"].includes(String(u.role || ""));
        });
        setUsers(employees);
      } catch (err) {
        setError("Failed to load employees. Please try again.");
        setUsers([]);
        toast({ title: "Unable to fetch employees", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [currentUserId]);

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(u.name || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q)
    );
  });

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleAction = () => {
    if (mode === "group" && selected.length >= 2 && groupName.trim()) {
      onCreateGroup?.(selected, groupName.trim());
    } else {
      toast({ title: "Select at least two members and add group name", type: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white text-base">
            {mode === "group" ? "New Group" : "New Conversation"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode((m) => (m === "new" ? "group" : "new"))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100 transition-colors"
            >
              {mode === "new" ? (
                <><Users className="w-3.5 h-3.5" /> Group</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> Direct</>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Group name input */}
        {mode === "group" && (
          <div className="px-5 pt-3">
            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 border-0 focus:ring-2 focus:ring-amber-400/50 outline-none text-sm"
            />
          </div>
        )}

        {/* Search input */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
            />
            {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          </div>
        </div>

        {/* Selected users chips */}
        {selected.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {selected.map((u) => (
              <span
                key={u._id}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium"
              >
                {u.name}
                <button onClick={() => toggleSelect(u)} className="hover:text-amber-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* User list */}
        <div className="overflow-y-auto max-h-64 divide-y divide-slate-100 dark:divide-slate-800">
          {loading && (
            <p className="text-center text-sm text-slate-400 py-8">Loading employees...</p>
          )}
          {!loading && error && (
            <p className="text-center text-sm text-red-500 py-8">{error}</p>
          )}
          {!loading && !error && filteredUsers.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No employees found</p>
          )}
          {!loading && !error && filteredUsers.map((user) => {
            const presence = presenceMap[user._id];
            const isOnline = presence?.isOnline ?? false;
            const isSelected = selected.some((u) => u._id === user._id);

            return (
              <button
                key={user._id}
                onClick={() => {
                  if (mode === "group") {
                    toggleSelect(user);
                    return;
                  }
                  onSelectUser?.(user);
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left ${
                  isSelected ? "bg-amber-50/60 dark:bg-amber-900/10" : ""
                }`}
              >
                <div className="relative">
                  <UserAvatar user={user} />
                  <PresenceDot isOnline={isOnline} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {isOnline ? "Online" : user.email}
                  </p>
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer action */}
        {mode === "group" && (
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleAction}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60"
            >
              {`Create Group · ${selected.length} members`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
