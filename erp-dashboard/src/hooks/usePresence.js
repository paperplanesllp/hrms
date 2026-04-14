import { useEffect, useMemo, useState } from 'react';
import { usePresenceStore } from '../store/presenceStore.js';
import { getDerivedPresenceStatus, getAvatarDotStyle, formatExactTimestamp } from '../lib/presenceUtils.js';

const PRESENCE_TICK_MS = 30000;

/**
 * Hook to get real-time presence data for a single user.
 * Reads from the global presenceStore (kept in sync by SocketProvider).
 *
 * @param {string} userId
 * @returns {{ isOnline, isTyping, lastActivityAt, lastSeen, status, label, dotStyle, tooltip }}
 */
export const useUserPresence = (userId) => {
  const [, setTick] = useState(0);
  const userData = usePresenceStore(s => s.users[userId]);
  const isTyping = usePresenceStore(s => {
    const entry = s.typingUsers[userId];
    return entry ? entry.expiresAt > Date.now() : false;
  });

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), PRESENCE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const data = userData
    ? { ...userData, isTyping }
    : { isOnline: false, lastSeen: null, lastActivityAt: null, isTyping: false };

  const presence = getDerivedPresenceStatus(data);
  const dotStyle = getAvatarDotStyle(presence.status);

  const rawDate = presence.status === 'offline' ? data?.lastSeen
    : presence.status === 'away' ? data?.lastActivityAt
    : null;

  const tooltip = rawDate ? `Last active on ${formatExactTimestamp(rawDate)}` : presence.tooltip;

  let label = presence.label;
  if (presence.status === 'offline' && presence.lastSeen && presence.lastSeen !== 'never') {
    label = `Last seen ${presence.lastSeen}`;
  }

  return {
    isOnline: data.isOnline,
    isTyping,
    lastActivityAt: data.lastActivityAt,
    lastSeen: data.lastSeen,
    status: presence.status,
    label,
    dotBg: dotStyle.bg,
    dotRing: dotStyle.ring,
    dotPulse: dotStyle.pulse,
    tooltip
  };
};

/**
 * Hook to get a presence map for multiple user IDs.
 * Returns { [userId]: { isOnline, lastActivityAt, lastSeen, isTyping } }.
 * Useful for chat pages that need presence for many participants.
 *
 * @param {string[]} userIds
 * @returns {Object}
 */
export const usePresenceMap = (userIds) => {
  const users = usePresenceStore(s => s.users);
  const typingUsers = usePresenceStore(s => s.typingUsers);

  return useMemo(() => {
    const map = {};
    (userIds || []).forEach(uid => {
      const user = users[uid];
      const typingEntry = typingUsers[uid];
      const isTyping = Boolean(typingEntry);
      if (user) {
        map[uid] = {
          isOnline: user.isOnline,
          lastActivityAt: user.lastActivityAt,
          lastSeen: user.lastSeen,
          isTyping
        };
      }
    });
    return map;
  }, [users, typingUsers, userIds]);
};

/**
 * Hook to get the online user count.
 */
export const useOnlineCount = () => {
  return usePresenceStore(s =>
    Object.values(s.users).filter(u => u.isOnline).length
  );
};
