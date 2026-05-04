/**
 * Presence Status Utilities
 * Determines and formats user presence status for display
 *
 * Priority order: typing > active-now > online > away > offline
 * Locale: en-IN, hour12: true
 */

const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Derive the full presence status for a user.
 * Typing has highest priority, then active-now, online, away, offline.
 *
 * @param {Object} user - { isOnline, lastActivityAt, lastSeen, isTyping? }
 * @returns {Object} { status, label, color, icon, tooltip, lastSeen? }
 */
export const getDerivedPresenceStatus = (user) => {
  if (!user) {
    return { status: 'unknown', label: 'Unknown', color: 'gray', icon: '⚪', tooltip: 'User status unknown' };
  }

  // Typing has highest priority
  if (user.isTyping) {
    return { status: 'typing', label: 'Typing...', color: 'green', icon: '🟢', tooltip: 'Typing a message' };
  }

  if (!user.isOnline) {
    const lastSeenText = formatLastSeen(user.lastSeen);
    return { status: 'offline', label: 'Offline', color: 'gray', icon: '⚫', lastSeen: lastSeenText, tooltip: `Last seen ${lastSeenText}` };
  }

  // User is online — check activity recency
  const lastActivityAt = user.lastActivityAt ? new Date(user.lastActivityAt) : null;
  if (!lastActivityAt) {
    return { status: 'online', label: 'Online', color: 'green', icon: '🟢', tooltip: 'Online' };
  }

  const inactiveMs = Date.now() - lastActivityAt;

  if (inactiveMs < ONE_MINUTE) {
    return { status: 'active-now', label: 'Active now', color: 'green', icon: '🟢', tooltip: 'Active right now' };
  }

  if (inactiveMs < FIVE_MINUTES) {
    const mins = Math.round(inactiveMs / ONE_MINUTE);
    return { status: 'active-recently', label: 'Active recently', color: 'green', icon: '🟢', tooltip: `Last active ${mins} minute${mins > 1 ? 's' : ''} ago` };
  }

  return { status: 'away', label: 'Away', color: 'yellow', icon: '🟡', lastActivity: formatLastSeen(lastActivityAt), tooltip: `Last active ${formatLastSeen(lastActivityAt)}` };
};

/**
 * Format "last seen" time in human-readable format
 * Examples:
 * - just now
 * - 5 minutes ago
 * - today at 8:45 PM
 * - yesterday at 10:12 AM
 * - 08 Apr 2026 at 11:20 AM
 * 
 * Uses Indian time format (12-hour with AM/PM)
 * 
 * @param {Date|string} lastSeenDate
 * @returns {string}
 */
export const formatLastSeen = (lastSeenDate) => {
  if (!lastSeenDate) return 'never';

  const lastSeen = new Date(lastSeenDate);
  const now = new Date();

  // Reset to midnight for day comparisons
  const lastSeenMidnight = new Date(lastSeen);
  lastSeenMidnight.setHours(0, 0, 0, 0);

  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);

  const diffMs = now - lastSeen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor((nowMidnight - lastSeenMidnight) / (24 * 3600000));

  // Just now
  if (diffMins < 1) {
    return 'just now';
  }

  // Minutes ago
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }

  // Hours ago (today)
  if (diffHours < 24 && diffDays === 0) {
    const time = formatTimeInIndianTZ(lastSeen);
    return `today at ${time}`;
  }

  // Yesterday
  if (diffDays === 1) {
    const time = formatTimeInIndianTZ(lastSeen);
    return `yesterday at ${time}`;
  }

  // Multiple days ago
  if (diffDays < 7) {
    const dayName = getDayName(lastSeen);
    const time = formatTimeInIndianTZ(lastSeen);
    return `${dayName} at ${time}`;
  }

  // Older than a week - show full date
  const dateStr = formatDateInIndianTZ(lastSeen);
  const time = formatTimeInIndianTZ(lastSeen);
  return `${dateStr} at ${time}`;
};

/**
 * Format "last active" time (when user was actively using the app)
 * Similar to formatLastSeen but for lastActivityAt
 */
export const formatLastActive = (lastActivityDate) => {
  if (!lastActivityDate) return 'not recently';
  return formatLastSeen(lastActivityDate);
};

/**
 * Format time in Indian time format (12-hour with AM/PM)
 * @param {Date} date
 * @returns {string} e.g., "8:45 PM"
 */
export const formatTimeInIndianTZ = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(date);
};

/**
 * Format date in Indian format
 * @param {Date} date
 * @returns {string} e.g., "08 Apr 2026"
 */
export const formatDateInIndianTZ = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(date);
};

/**
 * Get day name (Monday, Tuesday, etc.)
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

/**
 * Get status dot background color for CSS/Tailwind
 */
export const getStatusDotColor = (status) => {
  switch (status) {
    case 'typing':
      return 'bg-blue-500';
    case 'active-now':
    case 'active-recently':
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'offline':
    default:
      return 'bg-gray-400';
  }
};

/** Alias matching the requested API name */
export const getPresenceDotColor = getStatusDotColor;

/**
 * Get the full Tailwind classes for a premium avatar status dot.
 * Includes background, ring-glow, and optional pulse.
 *
 * @param {string} status - typing | active-now | active-recently | online | away | offline
 * @returns {{ bg: string, ring: string, pulse: boolean }}
 */
export const getAvatarDotStyle = (status) => {
  switch (status) {
    case 'typing':
      return { bg: 'bg-blue-500', ring: 'ring-blue-400/40', pulse: true };
    case 'active-now':
      return { bg: 'bg-green-500', ring: 'ring-green-400/40', pulse: true };
    case 'active-recently':
    case 'online':
      return { bg: 'bg-green-500', ring: 'ring-green-400/30', pulse: false };
    case 'away':
      return { bg: 'bg-amber-400', ring: 'ring-amber-300/30', pulse: false };
    case 'offline':
    default:
      return { bg: 'bg-gray-400', ring: 'ring-transparent', pulse: false };
  }
};

/**
 * Get status text for display
 */
export const getStatusText = (user) => {
  const status = getPresenceStatus(user);
  return status.label;
};

/**
 * Check if user is online
 */
export const isUserOnline = (user) => {
  return user?.isOnline === true;
};

/**
 * Check if user is active right now (within 1 minute)
 */
export const isUserActiveNow = (user) => {
  if (!user?.isOnline || !user?.lastActivityAt) return false;
  const inactiveMs = Date.now() - new Date(user.lastActivityAt);
  return inactiveMs < 60 * 1000; // 60 seconds
};

/**
 * Check if user is away (online but inactive for 5+ minutes)
 */
export const isUserAway = (user) => {
  if (!user?.isOnline || !user?.lastActivityAt) return false;
  const inactiveMs = Date.now() - new Date(user.lastActivityAt);
  return inactiveMs >= 5 * 60 * 1000; // 5 minutes
};

/**
 * Get complete status info for UI display
 * @param {Object} user
 * @returns {Object} { isOnline, isAway, isActiveNow, statusLabel, statusColor, lastSeenText, icon }
 */
export const getCompletePresenceInfo = (user) => {
  const status = getDerivedPresenceStatus(user);
  const online = isUserOnline(user);
  const away = isUserAway(user);
  const activeNow = isUserActiveNow(user);

  const dotStyle = getAvatarDotStyle(status.status);

  // Build exact timestamp tooltip for offline/away states
  const rawDate = !online ? user?.lastSeen : away ? user?.lastActivityAt : null;
  const exactTooltip = rawDate
    ? `Last active on ${formatExactTimestamp(rawDate)}`
    : status.tooltip;

  return {
    isOnline: online,
    isAway: away,
    isActiveNow: activeNow,
    isTyping: Boolean(user?.isTyping),
    statusLabel: status.label,
    statusColor: dotStyle.bg,
    statusRing: dotStyle.ring,
    statusPulse: dotStyle.pulse,
    statusIconEmoji: status.icon,
    lastSeenText: status.lastSeen || status.lastActivity || status.tooltip,
    fullTooltip: exactTooltip,
    status: status.status
  };
};

/**
 * Format a date as a full exact timestamp in Indian locale.
 * e.g. "08 Apr 2026 at 11:20 AM"
 *
 * @param {Date|string} date
 * @returns {string}
 */
export const formatExactTimestamp = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${formatDateInIndianTZ(d)} at ${formatTimeInIndianTZ(d)}`;
};

/**
 * Sort users by presence priority.
 * Order: typing → active-now → active-recently → online → away → offline
 * Within each group, sort alphabetically by name.
 *
 * @param {Array} users - Array of user objects
 * @returns {Array} Sorted copy (does not mutate original)
 */
export const sortUsersByPresence = (users) => {
  if (!Array.isArray(users)) return [];

  const STATUS_PRIORITY = {
    typing: 0,
    'active-now': 1,
    'active-recently': 2,
    online: 3,
    away: 4,
    offline: 5,
    unknown: 6
  };

  return [...users].sort((a, b) => {
    const statusA = getDerivedPresenceStatus(a).status;
    const statusB = getDerivedPresenceStatus(b).status;
    const priorityA = STATUS_PRIORITY[statusA] ?? 6;
    const priorityB = STATUS_PRIORITY[statusB] ?? 6;

    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.name || '').localeCompare(b.name || '');
  });
};

/**
 * Sort any array by the presence status of each item.
 * Uses a callback to extract presence data from each item.
 *
 * @param {Array} items - Array of any objects (chats, members, etc.)
 * @param {Function} getPresenceData - (item) => presence object { isOnline, lastActivityAt, lastSeen }
 * @returns {Array} Sorted copy (does not mutate original)
 */
export const sortItemsByPresence = (items, getPresenceData) => {
  if (!Array.isArray(items) || !getPresenceData) return items || [];

  const STATUS_PRIORITY = {
    typing: 0,
    'active-now': 1,
    'active-recently': 2,
    online: 3,
    away: 4,
    offline: 5,
    unknown: 6
  };

  return [...items].sort((a, b) => {
    const dataA = getPresenceData(a);
    const dataB = getPresenceData(b);
    const statusA = getDerivedPresenceStatus(dataA).status;
    const statusB = getDerivedPresenceStatus(dataB).status;
    const priorityA = STATUS_PRIORITY[statusA] ?? 6;
    const priorityB = STATUS_PRIORITY[statusB] ?? 6;

    return priorityA - priorityB; // stable sort preserves original order within same priority
  });
};

/** Backward-compatible alias — older components import getPresenceStatus */
export const getPresenceStatus = getDerivedPresenceStatus;
