import { create } from 'zustand';
import { triggerUserActivity } from '../lib/socket.js';

/**
 * User Presence Store - Manages real-time presence data for all users
 * 
 * Key principles:
 * - SocketProvider bridges socket events into this store
 * - Socket events are the source of truth for online/offline
 * - REST API data is used as initial load, never overrides socket updates
 * - Presence status is computed from lastActivityAt and isOnline
 * - Typing state tracked per-user with auto-expiry
 */
export const usePresenceStore = create((set, get) => ({
  // State
  users: {}, // Map<userId, UserPresenceData>
  typingUsers: {}, // Map<userId, { userName, expiresAt }>
  onlineCount: 0,
  lastUpdateTime: null,
  filteredStatus: 'all', // 'all', 'online', 'offline'

  // ========== INITIALIZATION ==========

  /**
   * Initialize presence store with user list from API
   */
  initializeUsers: (users) => {
    const existingUsers = get().users;
    const presenceMap = {};

    users.forEach(user => {
      const existing = existingUsers[user._id];
      presenceMap[user._id] = {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        // Preserve socket-driven truth if already available.
        isOnline: (existing?.isOnline ?? user.isOnline) || false,
        lastSeen: existing?.lastSeen ?? (user.lastSeen ? new Date(user.lastSeen) : null),
        lastActivityAt: existing?.lastActivityAt ?? (user.lastActivityAt ? new Date(user.lastActivityAt) : null),
        lastSeenLocally: new Date(),
        connectionTimestamp: existing?.isOnline ? (existing?.connectionTimestamp || new Date()) : null
      };
    });

    // Keep any user records already inserted by realtime events.
    Object.entries(existingUsers).forEach(([uid, record]) => {
      if (!presenceMap[uid]) {
        presenceMap[uid] = record;
      }
    });

    const onlineCount = Object.values(presenceMap).filter(u => u.isOnline).length;
    set({ users: presenceMap, onlineCount, lastUpdateTime: new Date() });
  },

  /**
   * Handle presence:init event from socket (initial list of online users)
   */
  handlePresenceInit: (onlineUsers) => {
    const state = get();
    const updatedUsers = { ...state.users };

    // Make presence:init authoritative: reset to offline first.
    Object.keys(updatedUsers).forEach(uid => {
      const prev = updatedUsers[uid];
      updatedUsers[uid] = {
        ...prev,
        isOnline: false,
        connectionTimestamp: null,
        lastSeen: prev?.lastSeen || (prev?.isOnline ? new Date() : prev?.lastSeen)
      };
    });

    onlineUsers.forEach(onlineUser => {
      const uid = onlineUser.userId;
      if (updatedUsers[uid]) {
        updatedUsers[uid] = {
          ...updatedUsers[uid],
          isOnline: true,
          lastActivityAt: new Date(onlineUser.lastActivityAt),
          connectionTimestamp: new Date(),
          lastSeenLocally: new Date()
        };
      } else {
        // User from socket not yet in store (rare — API fetch may still be pending)
        updatedUsers[uid] = {
          _id: uid,
          name: onlineUser.name || 'Unknown',
          email: onlineUser.email || '',
          profileImageUrl: onlineUser.image || '',
          isOnline: true,
          lastSeen: null,
          lastActivityAt: new Date(onlineUser.lastActivityAt),
          lastSeenLocally: new Date(),
          connectionTimestamp: new Date()
        };
      }
    });

    const onlineCount = Object.values(updatedUsers).filter(u => u.isOnline).length;
    set({ users: updatedUsers, onlineCount, lastUpdateTime: new Date() });
  },

  // ========== PRESENCE UPDATES (from socket) ==========

  /**
   * Handle presence:update event from socket
   */
  handlePresenceUpdate: (presenceData) => {
    const state = get();
    const updatedUsers = { ...state.users };
    const uid = presenceData.userId;

    if (updatedUsers[uid]) {
      updatedUsers[uid] = {
        ...updatedUsers[uid],
        isOnline: presenceData.isOnline,
        lastActivityAt: presenceData.isOnline 
          ? new Date(presenceData.lastActivityAt) 
          : updatedUsers[uid].lastActivityAt,
        lastSeen: presenceData.isOnline 
          ? null 
          : new Date(presenceData.lastSeen || presenceData.statusChangedAt),
        lastSeenLocally: new Date(),
        connectionTimestamp: presenceData.isOnline ? new Date() : null
      };
    } else {
      // Unknown user appeared via socket
      updatedUsers[uid] = {
        _id: uid,
        name: presenceData.userName || 'Unknown',
        email: presenceData.userEmail || '',
        profileImageUrl: presenceData.userImage || '',
        isOnline: presenceData.isOnline,
        lastSeen: presenceData.isOnline ? null : new Date(presenceData.lastSeen || presenceData.statusChangedAt),
        lastActivityAt: new Date(presenceData.lastActivityAt || Date.now()),
        lastSeenLocally: new Date(),
        connectionTimestamp: presenceData.isOnline ? new Date() : null
      };
    }

    const onlineCount = Object.values(updatedUsers).filter(u => u.isOnline).length;
    set({ users: updatedUsers, onlineCount, lastUpdateTime: new Date() });
  },

  // ========== TYPING ==========

  /**
   * Set a user as typing (auto-expires after 3s)
   */
  setUserTyping: (userId, userName) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: { userName, expiresAt: Date.now() + 3000 }
      }
    }));
    // Auto-clear after 3 seconds
    setTimeout(() => {
      const current = get().typingUsers[userId];
      if (current && current.expiresAt <= Date.now()) {
        get().clearUserTyping(userId);
      }
    }, 3100);
  },

  /**
   * Clear typing status for a user
   */
  clearUserTyping: (userId) => {
    set(state => {
      const next = { ...state.typingUsers };
      delete next[userId];
      return { typingUsers: next };
    });
  },

  /**
   * Check if a user is currently typing
   */
  isUserTyping: (userId) => {
    const entry = get().typingUsers[userId];
    return entry ? entry.expiresAt > Date.now() : false;
  },

  // ========== QUERIES ==========

  /**
   * Get user presence data (includes typing state)
   */
  getUser: (userId) => {
    const state = get();
    const user = state.users[userId];
    if (!user) return null;
    return {
      ...user,
      isTyping: state.isUserTyping(userId)
    };
  },

  /**
   * Get presence data map for a set of user IDs (for components that track local status)
   * Returns a simple object: { [userId]: { isOnline, lastActivityAt, lastSeen, isTyping } }
   */
  getPresenceMap: (userIds) => {
    const state = get();
    const map = {};
    (userIds || []).forEach(uid => {
      const user = state.users[uid];
      if (user) {
        map[uid] = {
          isOnline: user.isOnline,
          lastActivityAt: user.lastActivityAt,
          lastSeen: user.lastSeen,
          isTyping: state.isUserTyping(uid)
        };
      }
    });
    return map;
  },

  /**
   * Get all users sorted by presence status
   */
  getSortedUsers: (filterStatus = 'all') => {
    const state = get();
    const users = Object.values(state.users);

    let filtered = users;
    if (filterStatus === 'online') {
      filtered = users.filter(u => u.isOnline);
    } else if (filterStatus === 'offline') {
      filtered = users.filter(u => !u.isOnline);
    }

    const now = new Date();
    const oneMinute = 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;

    return filtered.sort((a, b) => {
      const getStatusPriority = (user) => {
        if (state.isUserTyping(user._id)) return -1; // typing first
        if (!user.isOnline) return 3;
        if (!user.lastActivityAt) return 3;
        const inactiveTime = now - new Date(user.lastActivityAt);
        if (inactiveTime < oneMinute) return 0;
        if (inactiveTime < fiveMinutes) return 1;
        return 2;
      };

      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Get online count
   */
  getOnlineCount: () => {
    const state = get();
    return Object.values(state.users).filter(u => u.isOnline).length;
  },

  /**
   * Set filter status
   */
  setFilterStatus: (status) => {
    set({ filteredStatus: status });
  },

  // ========== SEARCH & FILTER ==========

  searchUsers: (query, filterStatus = 'all') => {
    const state = get();
    const lowerQuery = query.toLowerCase();

    const users = Object.values(state.users).filter(user => {
      const matchesQuery = 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery);

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'online' && user.isOnline) ||
        (filterStatus === 'offline' && !user.isOnline);

      return matchesQuery && matchesFilter;
    });

    const now = new Date();
    const oneMinute = 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;

    return users.sort((a, b) => {
      const getStatusPriority = (user) => {
        if (state.isUserTyping(user._id)) return -1;
        if (!user.isOnline) return 3;
        if (!user.lastActivityAt) return 3;
        const inactiveTime = now - new Date(user.lastActivityAt);
        if (inactiveTime < oneMinute) return 0;
        if (inactiveTime < fiveMinutes) return 1;
        return 2;
      };

      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  },

  // ========== ACTIVITY TRACKING ==========

  reportActivity: () => {
    triggerUserActivity();
  },

  // ========== CLEANUP ==========

  clearPresence: () => {
    set({
      users: {},
      typingUsers: {},
      onlineCount: 0,
      lastUpdateTime: null,
      filteredStatus: 'all'
    });
  }
}));
