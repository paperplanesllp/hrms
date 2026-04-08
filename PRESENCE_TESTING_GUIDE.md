# Real-Time Presence System - Testing Guide

## Pre-Test Setup

1. **Backend running:**
   ```bash
   npm run dev
   # or
   node server/src/server.js
   ```

2. **Frontend running:**
   ```bash
   npm run dev   # should be on port 5173 or 5174
   ```

3. **Database:** MongoDB connection working (check server logs)

4. **Socket.IO:** Should see "Socket connected" message in browser console

## Test Scope

This guide covers unit and integration testing for the presence system.

---

## Test Group 1: Socket Connection & Initialization

### Test 1.1: Socket Connects on App Load

**Steps:**
1. Open http://localhost:5174 (or 5173)
2. Log in with your credentials
3. Open browser DevTools → Console

**Expected:**
```
✅ Socket connected
```

**Verification:**
- Check Network tab → WS filter → Should see WebSocket connection to backend
- Should see socket.id in console or Network > Headers

**Failure Debug:**
```javascript
// In browser console
console.log(window.socket.connected);  // Should be true
console.log(window.socket.id);         // Should show socket ID
```

---

### Test 1.2: Presence:Init Event Received

**Steps:**
1. Keep app open from Test 1.1
2. Open DevTools → Console
3. Run:
```javascript
window.addEventListener('socket:presence:init', (event) => {
  console.log('🟢 Presence Init received:', event.detail);
});
```

4. Open another browser window/tab

**Expected:**
- In first window, when second opens: `🟢 Presence Init received: {onlineUsers: [...]}`
- Should list currently logged-in users

**Failure Debug:**
```javascript
// Check if listener exists
console.log('Listeners:', getEventListeners(window));

// Check if socket is receiving events
window.socket.on('presence:init', (data) => {
  console.log('Raw socket event:', data);
});
```

---

## Test Group 2: Multi-Device/Tab Scenario

### Test 2.1: Open Same User in 2 Tabs

**Precondition:** Already logged in from Test 1.1

**Steps:**
1. Tab A: Keep app open (http://localhost:5174)
2. Tab B: Open new tab, go to http://localhost:5174 (same user already logged in)
3. Check browser console in both tabs

**Expected in both tabs:**
```
✅ Socket connected  (2 different socket IDs)
```

**Data verification:**
```javascript
// In browser console, both tabs
window.socket.id;  // Tab A: "abc123"
                   // Tab B: "xyz789" (DIFFERENT)
```

---

### Test 2.2: User Stays Online When One Tab Closes

**Setup:** Both tabs open from Test 2.1

**For Tab A:**
1. Right-click on UserListWithPresence or check `/users` page
2. Look for your username in the list
3. Status should show: "🟢 Online"

**For Tab B:**
1. Same location, verify you see "🟢 Online"

**Action:**
1. Close Tab A completely

**Expected (Tab B):**
- Your username still shows: "🟢 Online"
- Your status does NOT change to Offline

**Database verification:**
```bash
# Terminal: Check user in database
mongosh
> use erp-db
> db.users.findOne({email: "your@email.com"})
> // Should show: isOnline: true
```

---

### Test 2.3: User Goes Offline When All Tabs Close

**Setup:** Only Tab B open (Tab A closed from Test 2.2)

**Action:**
1. Close Tab B (last remaining tab)

**Expected (Other windows):**
- In any other logged-in window, your profile shows: "🔘 Offline"
- Shows "Last seen: just now"

**Database verification:**
```bash
mongosh
> db.users.findOne({email: "your@email.com"})
> // Should show: isOnline: false, lastSeen: <recent timestamp>
```

---

## Test Group 3: Activity Tracking

### Test 3.1: Heartbeat is Sent

**Setup:** App open in one tab

**Steps:**
1. Open DevTools → Network → WS (WebSocket) tab
2. Keep watching for 30+ seconds
3. Look for periodic messages sent to server

**Expected:**
- See "heartbeat" message sent approximately every 25 seconds
- Server responds with status OK

**Console verification:**
```javascript
// Add logging to socket.js frontend
// Or check: Go to backend terminal, should see heartbeat logs
```

**Failure Debug:**
```javascript
// In browser console
const socket = window.socket;
// Manually check heartbeat interval
setInterval(() => {
  console.log('Sending heartbeat...');
}, 25000);
socket.emit('heartbeat');
```

---

### Test 3.2: Activity Changes Status from Offline to Online

**Setup:** User currently marked Offline

**Steps:**
1. Open app in a new tab (logs in again)
2. In another user's view (or check database):
   - You should show "🟢 Online"

**Expected:**
- Instant change from Offline → Online
- All other users see this in real-time

**Verification:**
- Open UserListWithPresence in another user's app
- See your name move to "Online" section

---

### Test 3.3: Activity Updates LastActivityAt

**Setup:** User online

**Steps:**
1. Get user ID:
```bash
mongosh
> db.users.findOne({email: "your@email.com"})._id
> // Remember this ID
```

2. Record initial timestamp:
```bash
> db.users.findOne({_id: ObjectId("...")}).lastActivityAt
> // Example: 2024-01-15T10:30:00Z
```

3. In browser: Click on something, type something
4. Wait 2 seconds
5. Check database again:
```bash
> db.users.findOne({_id: ObjectId("...")}).lastActivityAt
> // Should be NEWER than step 2
```

**Expected:**
- lastActivityAt gets updated with every user interaction
- Timestamp is newer with each activity

---

## Test Group 4: Status Determination

### Test 4.1: Active Now Status (< 1 minute)

**Setup:** UserListWithPresence displaying users

**Steps:**
1. Click in the app (interact with UI)
2. Look at your own user card in the list
3. You should see: "🟢 Active now" (with animated pulse)

**Expected:**
- Green dot
- Badge shows "Active now"  
- Pulse animation visible

---

### Test 4.2: Active Recently Status (1-5 minutes)

**Setup:** UserListWithPresence displaying users

**Steps:**
1. Wait 1+ minute without interacting
2. Look at your own user card
3. Should change to: "🟢 Active 2 minutes ago"

**Expected:**
- Still green dot
- Badge shows "Active 2 minutes ago"
- Animation stops

---

### Test 4.3: Away Status (5+ minutes inactive)

**Setup:** UserListWithPresence displaying users

**Steps:**
1. Wait 5+ minutes without any interaction
2. Look at your user card
3. Should change to: "🟡 Away"

**Expected:**
- Yellow dot (not green)
- Badge shows "Away"
- No animation

**Time verification:**
```bash
mongosh
> db.users.findOne({email: "your@email.com"}).lastActivityAt
> // Should be 5+ minutes old
```

---

### Test 4.4: Offline Status

**Setup:** UserListWithPresence displaying users in another user's app

**Steps:**
1. Close all tabs/windows (user now offline)
2. In another user's app, look at UserListWithPresence
3. Switch to "Offline" filter tab
4. Should see your name with: "🔘 Offline"
5. Shows "last seen: just now" (or specific time)

**Expected:**
- Gray dot
- Badge shows "Offline"
- Last seen time formatted correctly

---

## Test Group 5: Search & Filter

### Test 5.1: Search Real-Time

**Setup:** UserListWithPresence displaying

**Steps:**
1. Type in search box: "john"
2. Results should filter instantly
3. Maintain presence order (online first)

**Expected:**
- Results show only users matching "john"
- Order: Online/Active → Away → Offline
- Search is instant, no delay

---

### Test 5.2: Filter by Online Only

**Setup:** UserListWithPresence displaying, multiple users with different statuses

**Steps:**
1. Click "Online" filter tab
2. List should show only online users
3. Sorted by: Active now → Active recently → Away

**Expected:**
- Only users with isOnline=true shown
- Offline users hidden
- Sorted by activity level

---

### Test 5.3: Filter by Offline Only

**Setup:** Same as Test 5.2

**Steps:**
1. Click "Offline" filter tab
2. List shows only offline users
3. Sorted by: Most recently offline first

**Expected:**
- Only users with isOnline=false shown
- Online users hidden
- Sorted by lastSeen (newest first)

---

### Test 5.4: Filter All

**Steps:**
1. Click "All" filter tab
2. List shows everyone
3. Sorted by: Online/Active → Away → Offline

**Expected:**
- All users shown regardless of status
- Sorted by presence priority

---

## Test Group 6: Time Formatting

### Test 6.1: "Just Now" Format

**Setup:** User just came online

**Steps:**
1. Refresh page
2. Open UserListWithPresence immediately
3. Look at another user who just logged in
4. Should show: "just now"

**Expected:**
- "just now" for user who came online in last minute

**Verification:**
```bash
mongosh
> db.users.findOne({name: "Other User"}).lastSeen
> // Should be within last 60 seconds
```

---

### Test 6.2: "Minutes Ago" Format

**Setup:** User offline for 3-5 minutes

**Steps:**
1. User closes all tabs/windows
2. In another user's app view, look up the offline user
3. Should show: "5 minutes ago" (for example)

**Expected:**
- Shows number of minutes: "8 minutes ago", "3 minutes ago"
- Updates every minute

---

### Test 6.3: "Today At" Format

**Setup:** User last seen earlier today

**Steps:**
1. User goes offline
2. Check status 2+ hours later
3. Last seen should show: "today at 3:45 PM" (12-hour format, Indian TZ)

**Expected:**
- Format: "today at {time AM/PM}"
- Uses 12-hour format (not 24-hour)
- Correct Indian timezone

---

### Test 6.4: "Yesterday At" Format

**Setup:** User last seen yesterday

**Steps:**
1. Change system date back 1 day
2. Or check database for older lastSeen
3. Should show: "yesterday at 10:30 AM"

**Expected:**
- Format: "yesterday at {time AM/PM}"

---

### Test 6.5: Date Format (Older)

**Setup:** User last seen 10+ days ago

**Steps:**
1. Find older lastSeen in database
2. Should show: "08 Apr 2024 at 11:20 AM"

**Expected:**
- Format: "{DATE} Apr {YEAR} at {time AM/PM}"
- Shows full date and time

---

## Test Group 7: Browser DevTools Verification

### Test 7.1: Check Socket.IO Events

**Steps:**
1. Open DevTools → Network → WS tab
2. Speak to socket server for 30+ seconds
3. Look for messages

**Expected messages:**
```
↑ {"type":2,"nsp":"/","data":["heartbeat"]}
↑ {"type":2,"nsp":"/","data":["user:activity"]}
↑ {"type":2,"nsp":"/","data":["typing",{...}]}
↓ {"type":4,"nsp":"/","data":["presence:update",{...}]}
↓ {"type":4,"nsp":"/","data":["presence:init",{...}]}
```

---

### Test 7.2: Check Local Storage

**Steps:**
1. Open DevTools → Application → Local Storage
2. Look for: `erp_auth`

**Expected:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "...",
    "email": "..."
  },
  "refreshToken": "..."
}
```

---

### Test 7.3: Check Database State

**Steps:**
```bash
mongosh
> db.users.findOne({email: "test@example.com"})
```

**Expected fields:**
```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "test@example.com",
  image: "...",
  isOnline: true,                          // ← Presence field
  lastActivityAt: ISODate("2024-01-15..."), // ← Presence field
  lastSeen: ISODate("2024-01-15..."),       // ← Presence field
  // ... other user fields
}
```

---

## Test Group 8: Error Scenarios

### Test 8.1: Handle Socket Disconnect/Reconnect

**Steps:**
1. Open app
2. Unplug internet (or use DevTools Network throttling)
3. Wait for socket to disconnect
4. Reconnect internet
5. Socket should automatically reconnect

**Expected:**
- Console shows: "Socket disconnected"
- After reconnect: "Socket reconnected"
- User stays online (no offline ping)

---

### Test 8.2: Handle Invalid Token

**Steps:**
1. Login and get token
2. Open DevTools → Application → Local Storage
3. Delete erp_auth
4. Refresh page
5. Try to access presence features

**Expected:**
- Cannot access protected areas
- Socket connection fails with auth error
- Prompts to login again

---

### Test 8.3: Handle Concurrent Logins

**Steps:**
1. Login in Tab A
2. Login in Tab B with SAME user
3. Both tabs should work
4. Both show "Online" status

**Expected:**
- Both tabs have different socket IDs
- Both sockets in presenceManager Set
- User stays online if either tab open

---

## Test Group 9: Performance

### Test 9.1: Presence Updates are Instant

**Setup:** 2 users in different windows

**Steps:**
1. User A opens app
2. User B opens app
3. User B should see User A "Online" within 1 second

**Expected:**
- No lag or delay
- Status update instantly via socket event

---

### Test 9.2: Search Doesn't Block UI

**Setup:** UserListWithPresence with 100+ users

**Steps:**
1. Type in search box
2. Keep typing rapidly
3. UI should remain responsive

**Expected:**
- No freezing or lag
- Results filter smoothly
- No jank

---

### Test 9.3: Memory Usage

**Steps:**
1. Open DevTools → Memory
2. Take heap snapshot before presence
3. Load UserListWithPresence
4. Take heap snapshot after
5. Size difference should be < 5MB

**Expected:**
- Reasonable memory usage
- No big memory leaks
- Cleanup on component unmount

---

## Test Checklist (Copy/Paste Ready)

```
□ Test 1.1: Socket connects on load
□ Test 1.2: Presence:init event received
□ Test 2.1: Open same user in 2 tabs
□ Test 2.2: User stays online when 1 tab closes  
□ Test 2.3: User goes offline when all tabs close
□ Test 3.1: Heartbeat is sent every 25s
□ Test 3.2: Activity changes offline → online
□ Test 3.3: LastActivityAt updates with interaction
□ Test 4.1: "Active now" status (< 1 min)
□ Test 4.2: "Active recently" status (1-5 min)
□ Test 4.3: "Away" status (5+ min inactive)
□ Test 4.4: "Offline" status and last seen time
□ Test 5.1: Search real-time
□ Test 5.2: Filter by Online only
□ Test 5.3: Filter by Offline only
□ Test 5.4: Filter All
□ Test 6.1: "just now" format
□ Test 6.2: "5 minutes ago" format
□ Test 6.3: "today at 3:45 PM" format
□ Test 6.4: "yesterday at 10:30 AM" format
□ Test 6.5: "08 Apr 2024 at 11:20 AM" format
□ Test 7.1: Socket.IO events in DevTools
□ Test 7.2: Token in local storage
□ Test 7.3: Database fields updated correctly
□ Test 8.1: Socket disconnect/reconnect handled
□ Test 8.2: Invalid token handled
□ Test 8.3: Concurrent logins work
□ Test 9.1: Presence updates instant
□ Test 9.2: Search doesn't block UI
□ Test 9.3: Memory usage reasonable
```

---

## Quick Debug Commands

```javascript
// In browser console

// Check socket status
window.socket.connected;        // true/false
window.socket.id;               // socket ID

// Force heartbeat
window.socket.emit('heartbeat');

// Force activity report
window.socket.emit('user:activity');

// Check presence store
import { usePresenceStore } from './store/presenceStore.js';
const store = usePresenceStore.getState();
console.log('All users:', store.users);
console.log('Online count:', store.getOnlineCount());

// Manually trigger presence update
window.dispatchEvent(new CustomEvent('socket:presence:update', {
  detail: { userId: '...', isOnline: true, ... }
}));

// Monitor socket events
window.socket.on('connect', () => console.log('Connected'));
window.socket.on('disconnect', () => console.log('Disconnected'));
window.socket.on('presence:init', (data) => console.log('Init:', data));
window.socket.on('presence:update', (data) => console.log('Update:', data));
```

```bash
# In backend terminal

# Check stale session cleanup runs
tail -f server-logs.txt | grep "cleanup\|stale"

# Monitor heartbeat events
tail -f server-logs.txt | grep "heartbeat"

# Check database state
mongosh
> db.users.find({isOnline: true}).pretty()
> db.users.find({isOnline: false}).limit(5).pretty()
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Offline" when actually online | Socket connection failed | Check token in localStorage, refresh page |
| Wrong timezone on last seen | Locale not set to Indian | Verify `Intl.DateTimeFormat('en-IN')` in presenceUtils.js |
| User count wrong | Stale objects in presenceManager | Restart server, wait 2 min for cleanup |
| Search broken | State not updating | Check setupPresenceListeners() called |
| Multi-tab issues | Disconnect logic broken | Verify PresenceManager removes only that socket |
| Heartbeat not sending | Activity tracking disabled | Check triggerUserActivity imported and called |
| Lag/freezing | Too many re-renders | Check Zustand subscriptions are minimal |

---

## Success Criteria

All tests pass when:

✅ Users see each other online/offline in real-time  
✅ Multi-tab support works (user stays online with 1+ tabs)  
✅ Status updates automatically (Active → Away → Offline)  
✅ Time formatting is correct (Indian 12-hour)  
✅ Search and filter work smoothly  
✅ No console errors  
✅ Socket events flow correctly  
✅ Database updates reflect status changes  
