# Real-Time Presence System - Implementation Summary

## What Was Built

A complete real-time user presence and status system for the HRMS with professional chat-app style UI.

## Files Created (8 new files)

### Backend (2 files)

1. **server/src/utils/presenceManager.js** (150 lines)
   - Manages multi-device presence tracking
   - Uses Map<userId, Set<socketId>> for multiple connections per user
   - Auto-cleanup of stale sessions (15 min timeout)

### Frontend - Utilities (3 files)

2. **erp-dashboard/src/store/presenceStore.js** (250 lines)
   - Zustand state store for user presence data
   - Methods: initializeUsers, handlePresenceInit, handlePresenceUpdate
   - Sorting by: typing → online/active → away → offline
   - Search and filter support

3. **erp-dashboard/src/lib/presenceUtils.js** (280 lines)
   - Status formatting and determination
   - Last seen time formatting (Indian timezone)
   - Color and icon mappings
   - Utility functions for status checks

4. **erp-dashboard/src/lib/socket.js** (UPDATED - frontend version)
   - Heartbeat mechanism (25s interval)
   - Activity tracking
   - Presence event listeners (presence:init, presence:update)
   - Backward compatibility with legacy events

### Frontend - Components (3 files)

5. **erp-dashboard/src/components/users/UserListItem.jsx** (80 lines)
   - Individual user card component
   - Avatar with animated status dot
   - Status badge (Active now / Online / Away / Offline)
   - Email and last seen text
   - Message button (hover action)

6. **erp-dashboard/src/components/users/UserListWithPresence.jsx** (210 lines)
   - Complete user list component
   - Search bar (real-time)
   - Filter tabs (All / Online / Offline)
   - Online count header
   - API initialization
   - Socket listener setup

### Backend (UPDATED)

7. **server/src/utils/socket.js** (790 lines - REFACTORED)
   - Integrated presenceManager throughout
   - Handles heartbeat events
   - Tracks user activity
   - Smart disconnect logic (only count true offline when NO sockets remain)
   - Broadcasts presence updates to all clients

8. **server/src/modules/users/User.model.js** (UPDATED)
   - Added isOnline field (Boolean, indexed)
   - Added lastSeen field (Date, when user went offline)
   - Added lastActivityAt field (Date, last user activity)

## How It Works

### 1. User Comes Online

```
User opens app
    ↓
Socket connects & authenticates
    ↓
PresenceManager adds socket to Map<userId, Set<socketId>>
    ↓
Database: isOnline = true, lastActivityAt = now
    ↓
Server broadcasts: presence:update event to all clients
    ↓
Frontend: Zustand store updates
    ↓
UI: Shows user as "Online" in real-time
```

### 2. User Interacts (typing, clicking, etc)

```
Client detects activity
    ↓
socket.emit('user:activity')
    ↓
Server updates database: lastActivityAt = now
    ↓
Server broadcasts: presence:update (if status changed)
    ↓
Frontend: Zustand updates
    ↓
UI: Shows "Active now" (if activity < 1 min)
```

### 3. User Closes Tab (but has another tab open)

```
Socket disconnects
    ↓
PresenceManager removes socket from Set<socketId>
    ↓
Set still has other sockets ✅
    ↓
User stays ONLINE (no broadcast)
```

### 4. User Closes All Tabs

```
Last socket disconnects
    ↓
PresenceManager removes socket from Set<socketId>
    ↓
Set is empty, user still online in DB ❌
    ↓
Server marks: isOnline = false, lastSeen = now
    ↓
Server broadcasts: presence:update to all clients
    ↓
Frontend: Zustand updates
    ↓
UI: Shows "Offline" with "last seen 5 minutes ago"
```

### 5. Heartbeat Mechanism

```
Client sends heartbeat every 25 seconds
    ↓
Server updates lastActivityAt in database
    ↓
Prevents stale timeout (15 minute inactivity)
```

## Status Display Logic

| Condition | Display | Color |
|-----------|---------|-------|
| isOnline=true AND lastActivityAt < 1min ago | Active now 🟢 | Green, animated pulse |
| isOnline=true AND lastActivityAt < 5min ago | Active now / {time} ago 🟢 | Green |
| isOnline=true AND lastActivityAt > 5min ago | Away 🟡 | Yellow |
| isOnline=false | Offline 🔘 | Gray |

## Integration Checklist

### Phase 1: Verify Setup ✅

- [x] User.model.js updated with presence fields
- [x] PresenceManager.js created
- [x] socket.js (backend) refactored
- [x] socket.js (frontend) updated
- [x] presenceStore.js created  
- [x] presenceUtils.js created
- [x] UserListItem.jsx created
- [x] UserListWithPresence.jsx created

### Phase 2: Integration (TODO)

- [ ] Import UserListWithPresence in UsersPage.jsx or HRPage.jsx
- [ ] Add activity tracking to App.jsx
- [ ] Test socket connection with multiple tabs
- [ ] Verify database updates (isOnline, lastSeen, lastActivityAt)
- [ ] Test search and filter functionality
- [ ] Verify time formatting with Indian timezone

### Phase 3: Testing (TODO)

**Multi-tab scenario:**
- [ ] Open app in Tab 1 → see "Online"
- [ ] Open same user in Tab 2 → still "Online"
- [ ] Close Tab 1 → still "Online"
- [ ] Close Tab 2 → see "Offline"

**Activity scenario:**
- [ ] User types → shows "Active now"
- [ ] Stop typing for 1 min → shows "Active 1 minute ago"
- [ ] Idle for 5 mins → shows "Away"
- [ ] No activity for 15 mins → shows "Offline"

**Search/Filter scenario:**
- [ ] Search "john" → real-time results maintain presence order
- [ ] Click "Online" tab → shows only online users sorted by activity
- [ ] Click "Offline" tab → shows offline users with last seen
- [ ] Click "All" → all users sorted by presence

## Component Usage

### Display user list with presence:

```jsx
import UserListWithPresence from './components/users/UserListWithPresence.jsx';

export function UsersPage() {
  const handleUserSelect = (user) => {
    // Open profile, start chat, etc
  };

  const handleMessage = (user) => {
    // Navigate to chat with user
  };

  return (
    <UserListWithPresence
      onUserSelect={handleUserSelect}
      onMessage={handleMessage}
      showMessageAction={true}
      maxHeight="max-h-[600px]"
    />
  );
}
```

### Get presence info for a user:

```jsx
import { getCompletePresenceInfo } from './lib/presenceUtils.js';

const info = getCompletePresenceInfo(user);
// Returns: {
//   isOnline,
//   isAway,
//   isActiveNow,
//   statusLabel,
//   statusColor,
//   lastSeenText,
//   tooltipText
// }
```

### Track user activity:

```jsx
import { triggerUserActivity } from './lib/socket.js';

// In your App.jsx useEffect
document.addEventListener('click', () => triggerUserActivity());
document.addEventListener('keydown', () => triggerUserActivity());
```

### Subscribe to presence store:

```jsx
import { usePresenceStore } from './store/presenceStore.js';

const { users, getOnlineCount, getSortedUsers } = usePresenceStore();

// Get online users count
const onlineCount = getOnlineCount();

// Get users sorted by presence status
const sortedUsers = getSortedUsers('online');

// Search with presence maintained
const results = searchUsers('john', 'online');
```

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| server/src/utils/presenceManager.js | Multi-device socket tracking | ✅ Created |
| server/src/utils/socket.js | Socket event handlers | ✅ Refactored |
| server/src/modules/users/User.model.js | Database schema | ✅ Updated |
| erp-dashboard/src/store/presenceStore.js | State management | ✅ Created |
| erp-dashboard/src/lib/presenceUtils.js | Formatting utilities | ✅ Created |
| erp-dashboard/src/lib/socket.js | Frontend socket | ✅ Updated |
| erp-dashboard/src/components/users/UserListItem.jsx | User card | ✅ Created |
| erp-dashboard/src/components/users/UserListWithPresence.jsx | User list UI | ✅ Created |

## Socket Events Reference

### Client → Server

- `heartbeat` - Sent every 25s to keep user active
- `user:activity` - Sent on user interaction
- `typing` - When user starts typing (existing)
- `stop_typing` - When user stops typing (existing)

### Server → Client

- `presence:init` - Initial list of all online users
- `presence:update` - Real-time presence changes (user came online/offline)
- Legacy: `user_online`, `user_offline`, `online_users_list` (still supported)

## Database Fields

Added to User model:

```javascript
isOnline: {
  type: Boolean,
  default: false,
  index: true  // Indexed for fast queries
}

lastSeen: {
  type: Date,
  default: null  // Set when user goes offline
}

lastActivityAt: {
  type: Date,
  default: null  // Updated on heartbeat and activity
}
```

## Time Zone & Formatting

All display times use:
- **Locale:** India (en-IN)
- **Hour Format:** 12-hour (AM/PM)
- **Database:** UTC

Examples:
- "just now" - < 1 minute
- "5 minutes ago"
- "today at 8:45 PM"
- "yesterday at 10:12 AM"
- "08 Apr 2026 at 11:20 AM"

## Performance

- **Heartbeat interval:** 25 seconds
- **Activity timeout:** 5 minutes (marks as Away)
- **Stale cleanup:** 15 minutes
- **Cleanup run:** Every 2 minutes
- **Database indexes:** isOnline field indexed

## Translation Map

| Old Term | New Implementation |
|----------|-------------------|
| "Offline" (static) | Dynamic status based on isOnline + lastActivityAt |
| Per-user socket | Per-user Set of sockets (multi-device) |
| Simple online/offline | Active → Active Recently → Away → Offline |
| Static last seen | Real-time formatted times with timezone |

## Common Issues & Fixes

**Issue:** User shows "Offline" but is active
- Check: Is socket connected? (Network tab, WebSocket)
- Check: Is token valid? (localStorage erp_auth)
- Fix: Refresh page to reconnect

**Issue:** Last seen time is wrong timezone
- Check: Verify Intl.DateTimeFormat('en-IN') in presenceUtils.js
- Check: System timezone setting
- Fix: Ensure database stores UTC

**Issue:** User count incorrect
- Check: stale session cleanup (runs every 2 min)
- Fix: Restart server to reset state

**Issue:** Multi-tab breaks online status
- Check: PresenceManager uses Set<socketId> correctly ✅
- Check: Disconnect only offlines if Set is empty ✅
- Fix: Already implemented correctly

## Next Immediate Steps

1. **Integrate into UI** (5 min)
   - Import UserListWithPresence into UsersPage.jsx
   - Import setupPresenceListeners into App.jsx

2. **Test presence flow** (10 min)
   - Open 2 browser tabs with same user
   - Verify both show "Online"
   - Close one tab, verify still "Online"
   - Close both, verify "Offline"

3. **Verify real-time updates** (5 min)
   - Open 2 browsers with different users
   - See each other come online instantly
   - Type/interact, verify "Active now"
   - Wait 5 min idle, verify "Away"

4. **Test search/filter** (5 min)
   - Search "john" → results in real-time
   - Click "Online" → only online users
   - Click "Offline" → shows offline users with last seen

## Questions?

See **REAL_TIME_PRESENCE_GUIDE.md** for complete documentation.
