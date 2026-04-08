# Real-Time User Presence System - Integration Guide

## Overview

A complete real-time user presence and status system for the HRMS has been implemented with Socket.IO as the source of truth for online/offline presence.

## Architecture

### Backend (Node.js + Socket.IO)

**Key Files:**
- `server/src/utils/presenceManager.js` - Presence state management with Map<userId, Set<socketId>>
- `server/src/utils/socket.js` - Refactored socket event handlers with presence tracking
- `server/src/modules/users/User.model.js` - Updated schema with isOnline, lastSeen, lastActivityAt

**Features:**
- Multi-device/tab support (one user can have multiple active sockets)
- Heartbeat mechanism (client sends heartbeat every 25s)
- Activity tracking (lastActivityAt updated on events)
- Stale session cleanup (15 min timeout for inactive users)
- User stays online if ANY socket exists
- User marked offline only when ALL sockets disconnect

### Frontend (React + Zustand)

**Key Files:**
- `erp-dashboard/src/lib/socket.js` - Enhanced with heartbeat and presence events
- `erp-dashboard/src/store/presenceStore.js` - Zustand store for presence state
- `erp-dashboard/src/lib/presenceUtils.js` - Status formatting utilities
- `erp-dashboard/src/components/users/UserListItem.jsx` - User card with status dot
- `erp-dashboard/src/components/users/UserListWithPresence.jsx` - Full user list component

**Features:**
- Real-time presence updates via Socket.IO events
- Search and filter (All, Online, Offline)
- Smart sorting (typing > online/active > away > offline)
- Human-readable last seen times with Indian timezone
- Status indicators (green online, yellow away, gray offline)
- Animated status dots
- Online count display

## Database Schema Updates

### User Model Fields Added

```javascript
// Real-time presence tracking
isOnline: { type: Boolean, default: false, index: true },
lastSeen: { type: Date, default: null },
lastActivityAt: { type: Date, default: null }
```

## Socket Events

### Client → Server

```javascript
// Heartbeat (every 25 seconds)
socket.emit('heartbeat');

// User activity (on interaction)
socket.emit('user:activity');

// Chat typing
socket.emit('typing', { chatId, userName, isGroupChat });
socket.emit('stop_typing', { chatId, isGroupChat });

// Other existing events...
```

### Server → Client

```javascript
// Initial presence data
socket.on('presence:init', ({ onlineUsers }) => {
  // { userId, name, email, image, isOnline, lastActivityAt }
});

// Presence update (user came online/offline)
socket.on('presence:update', (presenceData) => {
  // { userId, isOnline, lastSeen, userName, userEmail, userImage, statusChangedAt }
});

// Legacy events (still supported)
socket.on('user_online', {});
socket.on('user_offline', {});
socket.on('online_users_list', []);
```

## Integration Steps

### 1. Initialize Presence in Main App

In your main App.jsx or root component:

```jsx
import { usePresenceStore, setupPresenceListeners } from './store/presenceStore.js';
import { triggerUserActivity } from './lib/socket.js';

function App() {
  useEffect(() => {
    // Setup socket listeners once
    setupPresenceListeners();
    
    // Track user activity
    const handleActivity = () => triggerUserActivity();
    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);
    
    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, []);

  return (
    // Your app...
  );
}
```

### 2. Use User Presence Store

```jsx
import { usePresenceStore } from './store/presenceStore.js';

function MyComponent() {
  const { users, getOnlineCount, getSortedUsers, searchUsers } = usePresenceStore();
  
  // Get online count
  const onlineCount = getOnlineCount();
  
  // Get sorted users (by presence)
  const sortedUsers = getSortedUsers('online'); // 'all', 'online', 'offline'
  
  // Search users
  const results = searchUsers('john', 'online');
}
```

### 3. Display User List with Presence

```jsx
import UserListWithPresence from './components/users/UserListWithPresence.jsx';

function MyPage() {
  return (
    <UserListWithPresence
      showMessageAction={true}
      onUserSelect={(user) => console.log('Selected:', user)}
      onMessage={(user) => startChat(user)}
      maxHeight="max-h-[600px]"
    />
  );
}
```

### 4. Get Presence Info for a User

```jsx
import { getCompletePresenceInfo, formatLastSeen } from './lib/presenceUtils.js';

function UserCard({ user }) {
  const info = getCompletePresenceInfo(user);
  
  return (
    <div>
      <h3>{user.name}</h3>
      <span className={info.statusColor}>{info.statusLabel}</span>
      <p>{info.lastSeenText}</p>
    </div>
  );
}
```

## Status Definitions

### Online Status Hierarchy

1. **Active Now** (🟢 Green)
   - User is online AND active within last 1 minute
   - Shows "Active now"

2. **Active Recently** (🟢 Green)
   - User is online AND active within last 5 minutes
   - Shows "Active {n} minutes ago"

3. **Away** (🟡 Yellow)
   - User is online BUT no activity for 5+ minutes
   - Shows "Away", last activity time on hover

4. **Offline** (⚫ Gray)
   - User not connected (all sockets disconnected)
   - Shows "Offline", last seen time

## Last Seen Time Format

Examples with Indian timezone (12-hour format):

- `just now` - Less than 1 minute ago
- `5 minutes ago` - Within 5 minutes
- `today at 8:45 PM` - Earlier today
- `yesterday at 10:12 AM` - Yesterday
- `Friday at 3:20 PM` - Within last 7 days
- `08 Apr 2026 at 11:20 AM` - Older than 7 days

## Presence Events Flow

### User Comes Online

1. Socket connects (socket.io event)
2. Server authenticates token
3. PresenceManager adds socket to user's set
4. Database updated: `isOnline = true, lastActivityAt = now`
5. **All clients emit `presence:update`**
6. Frontend updates store
7. UI reflects "Online" status instantly

### User Sends Message/Types

1. Client emits `typing` event
2. Backend updates user's `lastActivityAt`
3. Server updates database
4. User status stays "Active now" or "Active recently"

### User Closes Tab

1. Socket disconnects (socket.io event)
2. PresenceManager removes socket from user's set
3. If user has other sockets: stays online ✅
4. If user has no more sockets:
   5. Database updated: `isOnline = false, lastSeen = now`
   6. **All clients emit `presence:update`**
   7. Frontend updates store
   8. UI reflects "Offline" status with last seen time

## Best Practices

### ✅ DO

- Always initialize users from API on first load
- Let Socket.IO events be the source of truth
- Use presence store for all user presence data
- Report activity on user interactions
- Search within presence state (not via API)
- Use provided utility functions for status formatting

### ❌ DON'T

- Don't override socket updates with REST API data
- Don't re-fetch user list on presence changes
- Don't store presence data in component state
- Don't make API calls for presence status
- Don't use legacy `user_online`/`user_offline` events
- Don't hardcode offline status

## Testing Checklist

- [ ] User comes online, other clients see "Online" instantly
- [ ] User sends message, stays "Active now" for 1 minute
- [ ] User idle for 5 mins, shows "Away"
- [ ] User closes tab, shows "Offline" with last seen
- [ ] User opens second tab, still shows "Online"
- [ ] User closes one tab but has another, still "Online"
- [ ] User closes all tabs, shows "Offline"
- [ ] Search works in real-time without API calls
- [ ] Filter by Online/Offline works
- [ ] Sorting puts active users first
- [ ] Last seen time formats correctly (Indian TZ)
- [ ] Status dot animates when active now
- [ ] Mobile responsive design works
- [ ] Dark mode styles correct

## Troubleshooting

### Issue: User shows "Offline" but is actually online

**Cause:** Socket connection failed or token expired
**Fix:**
1. Check browser console for socket auth errors
2. Verify token is valid and not expired
3. Check network tab for WebSocket connection
4. Refresh page to reconnect

### Issue: Last seen time shows wrong timezone

**Cause:** Timezoner misconfiguration in presenceUtils
**Fix:**
1. Verify `Intl.DateTimeFormat('en-IN')` is used
2. Check system timezone setting
3. Ensure database stores dates in UTC

### Issue: User count shows incorrect

**Cause:** Stale socket connections not cleaned up
**Fix:**
1. Clearstale session cleanup runs every 2 min
2. Check server logs for cleanup activity
3. Restart server to reset state

### Issue: Multiple tabs cause issues

**Cause:** Incorrect socket handling
**Fix:**
1. Verify presenceManager uses Map<userId, Set<socketId>>
2. Check that user stays online if ANY socket exists
3. Confirm offline only when ALL sockets gone

## Performance Considerations

- **Heartbeat interval:** 25 seconds (configurable)
- **Stale session timeout:** 15 minutes
- **Cleanup interval:** 2 minutes
- **Database indexes:** `isOnline` field indexed for queries
- **State management:** Zustand (lightweight, no Redux overhead)

## Future Enhancements

- [ ] Typing indicator in chat lists (not just chat rooms)
- [ ] "Read" status for messages
- [ ] Voice/video call presence status
- [ ] User availability (do not disturb, focus mode)
- [ ] Cross-tab communication for local state sync
- [ ] Persistent presence history
- [ ] Analytics on user activity patterns
