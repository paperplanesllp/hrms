# Real-Time User Status System - Implementation Guide

## 📊 Overview

The ERP chat interface now includes a **real-time user online/offline status system** using Socket.IO for live updates. Users will see accurate, live status indicators instead of hardcoded "Online" tags.

## 🔄 How It Works

### Server-Side (socket.js)

The server maintains an in-memory map of online users and broadcasts status changes:

```javascript
const onlineUsers = new Map(); // userId -> user data
```

**On User Connection:**
1. User authenticates via JWT token
2. User data is stored in `onlineUsers` map
3. `user_online` event is broadcast to all connected clients
4. `online_users_list` event sends current online users to the newly connected user

**On User Disconnection:**
1. User is removed from `onlineUsers` map
2. `user_offline` event is broadcast to all connected clients

### Client-Side (ChatPage.jsx)

The React component listens for status events and updates UI in real-time:

```javascript
const [userOnlineStatus, setUserOnlineStatus] = useState({}); // userId -> "online" | "offline"
```

**Socket Events Listened:**
- `user_online`: Another user came online
- `user_offline`: Another user went offline
- `online_users_list`: Received on connection, contains all currently online users

## 🎯 Features

### Real-Time Status Updates
- ✅ Instant status change when user connects/disconnects
- ✅ Green pulsing indicator for online users
- ✅ Gray static indicator for offline users
- ✅ Status shown in:
  - Chat list (avatar indicator)
  - Chat header (status text + indicator)
  - Profile modal

### Status Indicators

**Online Status:**
- Color: Green (#10b981)
- Animation: Pulsing/bouncing
- Indicator: `bg-green-500 animate-pulse`

**Offline Status:**
- Color: Gray (#71717A)
- Animation: Static
- Indicator: `bg-slate-400`

## 📱 UI Components Affected

### 1. Chat List Items
```jsx
// Shows online status dot on each chat avatar
<div className={`
  absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white 
  ${isUserOnline(userId) ? "bg-green-500 animate-pulse" : "bg-slate-400"}
`}></div>
```

### 2. Chat Header
```jsx
// Shows status text and indicator
{!typing && activeChat && !activeChat.isGroupChat && (
  <div className="flex items-center gap-2 text-sm text-blue-100">
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
      isUserOnline(userId) ? "bg-green-400 animate-pulse" : "bg-slate-400"
    }`}></span>
    <span className="font-medium">
      {isUserOnline(userId) ? "Online" : "Offline"}
    </span>
  </div>
)}
```

### 3. Avatar Indicator
```jsx
// Updated to show real status
<div className={`
  absolute bottom-0 right-0 w-4 h-4 rounded-full border-3 border-slate-800 shadow-lg 
  ${isUserOnline(userId) ? "bg-green-500 animate-pulse" : "bg-slate-400"}
`}></div>
```

## 🔧 Helper Functions

### `isUserOnline(userId)`
Returns `true` if user is online, `false` otherwise.

```javascript
const isUserOnline = (userId) => {
  return userOnlineStatus[userId] === "online";
};
```

### `getUserStatus(userId)`
Returns the status string: "online" or "offline"

```javascript
const getUserStatus = (userId) => {
  return userOnlineStatus[userId] === "online" ? "online" : "offline";
};
```

## 📡 Socket Events Reference

### From Server to Client

#### `user_online`
Emitted when a user connects.
```javascript
{
  userId: "user_id",
  userName: "John Developer",
  userEmail: "john@example.com",
  userImage: "path/to/image.jpg",
  status: "online"
}
```

#### `user_offline`
Emitted when a user disconnects.
```javascript
{
  userId: "user_id",
  userName: "John Developer",
  status: "offline"
}
```

#### `online_users_list`
Emitted to newly connected user with all currently online users.
```javascript
[
  {
    userId: "user_id_1",
    userName: "User 1",
    userEmail: "user1@example.com",
    userImage: "image_url",
    status: "online"
  },
  // ... more users
]
```

## 🔐 Security Considerations

1. **Token-based Authentication**: Users must authenticate with valid JWT
2. **User Isolation**: Only user IDs and basic info are broadcast
3. **Room-based Events**: Chat messages still isolated in chat rooms
4. **Server Tracking**: Online users stored server-side, unreliable on client

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SERVER (socket.js)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │         onlineUsers Map                          │   │
│  │  userId_1 → { socketId, name, role, ... }       │   │
│  │  userId_2 → { socketId, name, role, ... }       │   │
│  └──────────────────────────────────────────────────┘   │
│                         ↓                                 │
│               Broadcasts events to all                   │
│            connected Socket.IO clients                  │
└─────────────────────────────────────────────────────────┘
                         ↓
      ┌─────────────────┼─────────────────┐
      ↓                 ↓                 ↓
  Client 1        Client 2         Client 3
  ┌────────┐      ┌────────┐      ┌────────┐
  │ChatPage│      │ChatPage│      │ChatPage│
  │ State: │      │ State: │      │ State: │
  │online_ │      │online_ │      │online_ │
  │Status  │      │Status  │      │Status  │
  └────────┘      └────────┘      └────────┘
```

## 🚀 Implementation Checklist

- [x] Add online users tracking on server
- [x] Emit `user_online` on connection
- [x] Emit `user_offline` on disconnection
- [x] Send `online_users_list` on new connection
- [x] Add `userOnlineStatus` state to ChatPage
- [x] Listen for status events on client
- [x] Update UI to show real status
- [x] Add helper functions (`isUserOnline`, `getUserStatus`)
- [x] Update chat list indicators
- [x] Update chat header status display
- [x] Update avatar indicators
- [x] Remove hardcoded "Online" status

## 🎨 Status Variants

### Online User
```
Visual: Green pulsing dot
Text: "Online"
Avatar Dot: bg-green-500 animate-pulse
Header Text Color: text-blue-100
```

### Offline User
```
Visual: Gray static dot
Text: "Offline"
Avatar Dot: bg-slate-400
Header Text Color: text-blue-100
```

### Typing User (Priority)
```
When user is typing, the status is overridden:
Text: "✓ typing..." (with animate-pulse)
Does not show Online/Offline until typing stops
```

## ⚠️ Edge Cases & Handling

1. **No Status Found**: Defaults to "offline"
   ```javascript
   isUserOnline(userId) // returns false if userId not in map
   ```

2. **Group Chats**: Status not shown (only member count)
   ```jsx
   {activeChat?.isGroupChat && (
     <p className="text-sm text-blue-100 font-medium">
       {activeChat.participants.length} members
     </p>
   )}
   ```

3. **Page Reload**: 
   - User gets full `online_users_list` on reconnection
   - Status map is properly rebuilt

4. **Network Issues**:
   - WebSocket will reconnect automatically
   - Status updates will resume after reconnection

## 📈 Performance Considerations

- **In-Memory Storage**: Uses native JavaScript Map (O(1) lookups)
- **Event Broadcasting**: Uses Socket.IO broadcast (efficient)
- **No Database Queries**: Status stored in memory only
- **Minimal State**: Only stores userId and basic user info

## 🔍 Debugging Tips

### Check Online Users on Server
```javascript
console.log("Online users:", Array.from(onlineUsers.entries()));
```

### Monitor Socket Events (Client)
```javascript
socket.onAny((eventName, ...args) => {
  console.log(`Socket event: ${eventName}`, args);
});
```

### Verify Status State
```javascript
console.log("User online status:", userOnlineStatus);
```

## 🚨 Troubleshooting

### "Still shows Online when user is offline"
- Verify socket connection is working
- Check browser console for connection errors
- Ensure `user_offline` event is being emitted
- Verify `onlineUsers.delete()` is called on disconnect

### "Status not updating in real-time"
- Check WebSocket connection (should be `ws://` not `http://`)
- Verify socket event listeners are attached
- Check that `setUserOnlineStatus` is being called
- Look for event listener conflicts

### "No indication of online users on page load"
- Wait a moment for `online_users_list` event
- Check network tab for socket connection
- Verify authentication token is valid
- Check server logs for connection errors

## 📚 Related Files

- **Server**: `server/src/utils/socket.js`
- **Client**: `erp-dashboard/src/features/chat/ChatPage.jsx`
- **Styles**: `erp-dashboard/styles/chat.css`
- **Socket Client Config**: `erp-dashboard/src/lib/socket.js`

## ✨ Future Enhancements

Potential improvements to the real-time status system:

1. **Last Seen**: Track and display "Last seen at 3:30 PM"
2. **Typing Indicators**: Enhanced with who is typing
3. **Activity Status**: Show "in a call", "in video", etc.
4. **Custom Status**: Users can set custom status messages
5. **Status Persistence**: Store in database for "last seen" after disconnect
6. **Idle Detection**: Mark as idle after X minutes of inactivity
7. **Device Info**: Show which device user is on
8. **Do Not Disturb**: User-set status override

## 📞 Support

For issues or questions about the real-time status system:
1. Check this documentation
2. Review browser console for errors
3. Check server logs for socket events
4. Verify network connectivity
5. Test with WebSocket directly if needed

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✨
