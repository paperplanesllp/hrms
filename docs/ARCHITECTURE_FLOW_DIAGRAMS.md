# ERP Chat System - Architecture & Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    BROWSER (Frontend)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React App                                                │  │
│  │  ├── Login Page                                           │  │
│  │  ├── Dashboard                                            │  │
│  │  ├── Chat Page (with real-time status)                   │  │
│  │  └── SocketProvider (manages connections)                │  │
│  └───────────────────────────────────────────────────────────┘  │
│          │                              │                       │
│          │ HTTP/HTTPS                   │ WebSocket            │
│          ▼                              ▼                       │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          │                              │
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              SERVER (Node.js + Express)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Routes                    Socket.IO Server           │  │
│  │  ├── /auth/login               ├── User Online Map       │  │
│  │  ├── /chat                     ├── Status Events         │  │
│  │  ├── /chat/:id/messages        ├── Chat Rooms            │  │
│  │  └── Middleware (JWT verify)   └── Real-time Events      │  │
│  └───────────────────────────────────────────────────────────┘  │
│          │                              │                       │
│          │                              │                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MongoDB (Database)                                       │  │
│  │  ├── Users collection                                     │  │
│  │  ├── Chats collection                                     │  │
│  │  ├── Messages collection                                  │  │
│  │  └── Notification logs                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Connection Flow

### Complete Flow from Login to Chat

```
STEP 1: LOGIN
┌──────────────────────────────────────────────────────────┐
│ User navigates to http://localhost:5173/login            │
│ Enters email & password                                  │
│ Clicks "Login" button                                    │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ Frontend: Calls /auth/login    │
        │ POST with email & password    │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ Backend: Validates credentials │
        │ Hashes password, checks DB    │
        └───────────────────────────────┘
                        │
                   ✅ Valid?
                  /        \
                Yes         No
                 │           │
                 ▼           ▼
        ┌─────────────┐  ┌──────────────┐
        │✅ Success   │  │❌ 401 Error   │
        │ Returns JWT │  │ "Invalid      │
        │ tokens      │  │  credentials" │
        └─────────────┘  └──────────────┘
                 │
                 ▼ (if success)
        ┌───────────────────────────────┐
        │ Frontend: Save tokens          │
        │ localStorage.erp_auth = {      │
        │   accessToken: "...",          │
        │   user: {...}                  │
        │ }                              │
        └───────────────────────────────┘
                 │
                 ▼
        ┌───────────────────────────────┐
        │ Frontend: Redirect to          │
        │ /dashboard                    │
        │ (App notices: user exists)    │
        └───────────────────────────────┘
                 │
                 ▼

STEP 2: INITIALIZE SOCKET
┌──────────────────────────────────────────────────────────┐
│ SocketProvider detects user login (user state change)    │
│ Calls: initializeSocket()                                │
└──────────────────────────────────────────────────────────┘
                 │
                 ▼
        ┌───────────────────────────────┐
        │ Get token from localStorage   │
        │ if (!token) return;           │
        │ (Must have token to connect!) │
        └───────────────────────────────┘
                 │
                 ▼
        ┌───────────────────────────────┐
        │ Create Socket connection:     │
        │ io(URL, {                     │
        │   auth: {                     │
        │     token: accessToken        │
        │   }                           │
        │ })                            │
        └───────────────────────────────┘
                 │
                 ▼ WebSocket Request

STEP 3: SOCKET AUTHENTICATION
┌──────────────────────────────────────────────────────────┐
│ Server receives connection with token in handshake       │
│ Middleware: Verifies JWT token                           │
└──────────────────────────────────────────────────────────┘
                 │
              ✅ Valid?
              /        \
            Yes         No
             │           │
             ▼           ▼
    ┌─────────────┐  ┌──────────────┐
    │✅ Success   │  │❌ Auth error  │
    │ Store user  │  │ Close socket  │
    │ Add to      │  │ Socket fails  │
    │ onlineUsers │  │ Display error │
    │ map         │  │ in console    │
    └─────────────┘  └──────────────┘
         │                 │
         ▼                 ▼
    ┌─────────────┐  ┌──────────────────────────┐
    │Broadcast    │  │❌ ERROR IN CONSOLE:      │
    │user_online  │  │"WebSocket is closed      │
    │to all       │  │before connection..."     │
    │clients      │  └──────────────────────────┘
    └─────────────┘

    (if success) Send online_users_list
            │
            ▼
    ┌─────────────────────────────────┐
    │ Frontend: Receive online_users   │
    │ List and populate               │
    │ userOnlineStatus state          │
    │ React re-renders UI             │
    │ Shows green dots for online     │
    │ users!                          │
    └─────────────────────────────────┘

STEP 4: ACCESS CHAT
┌──────────────────────────────────────────────────────────┐
│ User navigates to /dashboard/chat                        │
│ ChatPage component loads                                 │
└──────────────────────────────────────────────────────────┘
                 │
                 ▼
        ┌───────────────────────────────┐
        │ useEffect runs:               │
        │ loadChats()                   │
        │ socket.on("new_message", ...) │
        └───────────────────────────────┘
                 │
                 ▼
        ┌───────────────────────────────┐
        │ API call with token:          │
        │ GET /chat                     │
        │ Headers: {                    │
        │   Authorization:              │
        │   "Bearer <token>"            │
        │ }                             │
        └───────────────────────────────┘
                 │
              ✅ Valid Token?
              /              \
            Yes              No
             │                │
             ▼                ▼
    ┌──────────────┐  ┌────────────────┐
    │✅ 200 OK     │  │❌ 401 Error     │
    │ Returns list │  │ "Unauthorized"  │
    │ of chats     │  │ Try refresh or  │
    │ React renders│  │ login again     │
    │ chat list    │  └────────────────┘
    └──────────────┘
         │
         ▼
    ✅ CHAT READY! 🎉
    All functions work:
    ├── Load messages
    ├── Send messages
    ├── Real-time updates
    ├── Typing indicators
    ├── User status (Online/Offline)
    └── Message delivery ticks
```

---

## ❌ Error Scenarios & Why They Happen

### Scenario 1: Not Logged In

```
User tries to access chat WITHOUT logging in first
                │
                ▼
        ┌───────────────────────────┐
        │ localStorage has NO token  │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │ initializeSocket():        │
        │ if (!auth?.token)          │
        │   return null; ❌          │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │ getSocket() returns null   │
        │ No WebSocket connection    │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │ API call without token:    │
        │ GET /chat                  │
        │ No Authorization header    │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │ Server rejects:            │
        │ ❌ 401 Unauthorized        │
        │ (No token provided)        │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │ Browser Console shows:     │
        │ ❌ Failed to load chat     │
        │ Status: 401               │
        │ WebSocket failed           │
        └───────────────────────────┘

        ✅ SOLUTION: LOGIN FIRST!
```

### Scenario 2: Expired Token

```
User was logged in, token expired (15 min)
        │
        ▼
API interceptor detects 401
        │
        ▼
Automatically sends refresh token
    ├── Success? → Get new token, retry request ✅
    └── Failure? → Redirect to /login ❌
```

### Scenario 3: Server Not Running

```
User logged in, tries to access chat
        │
        ▼
WebSocket tries to connect to localhost:5000
        │
        ▼
Server not listening (not running)
        │
        ▼
Connection refused
        │
        ▼
❌ WebSocket connection failed
Browser Console: Connection refused

✅ SOLUTION: Start server!
npm start (in server folder)
```

---

## 🔄 Real-Time Status Update Flow

```
User A comes online
        │
        ▼
User A connects WebSocket with token
        │
        ▼
Server validates token, adds to onlineUsers map
        │
        ▼
Server broadcasts "user_online" event
        │
        ├─────────────────────────────────────┐
        │                                     │
        ▼                                     ▼
To all connected clients          To User A (send back list)
        │                                     │
        ▼                                     ▼
Broadcast: {                          Send: online_users_list
  userId: "user_a_id",                [
  status: "online",                     { userId, status: "online" },
  userName: "User A",                   { userId, status: "online" },
  ...                                   ...
}                                     ]
        │                                     │
        ▼ (User B receives)                  ▼ (User A receives)
        │                                     │
Update state:                         Initialize full map:
userOnlineStatus["user_a_id"]       userOnlineStatus = {
  = "online"                          "user_a": "online",
        │                             "user_b": "online",
        ▼                             ...
Re-render UI:                       }
Avatar dot turns green   ✅        │
"Online" text appears              ▼
Status updates real-time           Re-render chat list
                                   All users show correct status ✅


User A goes offline
        │
        ▼
User A closes browser or loses connection
        │
        ▼
Socket disconnect event
        │
        ▼
Server removes from onlineUsers map
        │
        ▼
Server broadcasts "user_offline" event
        │
        ▼
To all connected clients
        │
        ▼
Broadcast: {
  userId: "user_a_id",
  status: "offline"
}
        │
        ▼ (User B receives)
        │
Update state:
userOnlineStatus["user_a_id"]
  = "offline"
        │
        ▼
Re-render UI:
Avatar dot turns gray  ✅
"Offline" text appears
Status updates in real-time
```

---

## 🔐 Token Refresh Flow

```
API request with token
        │
        ▼
Middleware checks token expiration
        │
    ├── Valid (< 15 min)? → Process request ✅
    │
    └── Expired? → Reject with 401
            │
            ▼
    Frontend interceptor catches 401
            │
            ▼
    Send refresh token to /auth/refresh
            │
             ✅ Refresh success?
            /                \
          Yes               No
           │                 │
           ▼                 ▼
    Get new access token  Redirect to /login
           │                 │
           ▼                 ▼
    Update localStorage   Clear auth
           │                 │
           ▼                 ▼
    Retry original   User needs to
    request with     login again ❌
    new token ✅
           │
           ▼
    Continue using app
    (No manual re-login needed!)
```

---

## 📡 Message Sending Flow

```
User types message & sends
        │
        ▼
┌──────────────────────────────┐
│ Frontend:                    │
│ 1. Create message object     │
│ 2. POST to /chat/msg         │
│ 3. Include auth token        │
│ 4. Add to UI immediately     │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Backend:                     │
│ 1. Verify token & user       │
│ 2. Validate message          │
│ 3. Save to MongoDB           │
│ 4. Emit via WebSocket        │
└──────────────────────────────┘
        │
     ✅ Saved?
     /        \
   Yes        No
    │          │
    ▼          ▼
Emit to all  Error response
connected   401/400 error
clients     Frontend shows
    │       error toast
    ▼
Both users
receive in
real-time
    │
    ▼
Message shows
with ✓✓ ticks

User B sees:
├── Message content
├── Sender name
├── Timestamp
├── Delivery ticks
└── Real-time update!
```

---

## 🎯 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  User Input → State Update → Component Re-render            │
│     (Chat,    (useState,   (JSX updates                     │
│      Message, useEffect)    with new data)                  │
│      Login)                                                 │
└─────────────────────────────────────────────────────────────┘
         │                          ▲
         │ HTTP/HTTPS API           │ Response (JSON)
         │ + Token Auth             │ Socket Events
         │                          │
         ▼                          │
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  Route Handler → Middleware → Logic → DB Query/Update       │
│   (Validate      (Verify JWT) (Process) (MongoDB)           │
│    request)                                                 │
│         ↓
│    Respond + Broadcast via WebSocket
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
│  MongoDB Stores: Users, Chats, Messages, Status             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 State Management Overview

### Frontend State Hierarchy

```
useAuthStore (Global)
├── user: { id, name, email, role }
└── token: accessToken

ChatPage Component
├── chats: [] (all conversations)
├── activeChat: { _id, participants, messages }
├── messages: [] (current chat messages)
├── userOnlineStatus: { userId: "online"|"offline" }
├── typing: boolean (is someone typing?)
└── various UI states (modals, menus, etc.)

Other Store
├── toastStore (notifications)
├── notificationStore (enterprise notifications)
└── ...
```

### Backend State Hierarchy

```
onlineUsers Map (In Memory)
├── userId_1: { socketId, userName, userRole, connectedAt }
├── userId_2: { socketId, userName, userRole, connectedAt }
└── ...

MongoDB
├── Users collection
├── Chats collection
├── Messages collection
└── ...
```

---

## ✅ Success Indicators

When everything works correctly:

```
Browser Console Shows:
✅ Connected to real-time notifications
✅ User online/offline events received
✅ No 401 Unauthorized errors
✅ No WebSocket connection failed
✅ Chat API returns 200

UI Shows:
✅ Chat list with users
✅ Green dots for online users
✅ Gray dots for offline users
✅ "Online"/"Offline" text in header
✅ Messages load and send instantly
✅ Typing indicators appear
✅ Message ticks (✓✓) show delivery
✅ No error messages
```

---

## 🎓 FAQ

**Q: Why do I get 401 Unauthorized?**
A: You're not logged in or your token is expired. Log in first or refresh the page.

**Q: Why doesn't WebSocket connect?**
A: No authentication token. Must be logged in before WebSocket can connect.

**Q: Do I need to manually refresh after token expires?**
A: No! The system automatically uses your refresh token to get a new access token.

**Q: How long is a token valid?**
A: 15 minutes. After that, a new one is issued automatically using the refresh token.

**Q: What if both tokens expire?**
A: You'll be redirected to /login. This happens if you don't use the app for 7 days.

**Q: Can I have multiple users logged in on different browsers/tabs?**
A: Yes, each has their own token and WebSocket connection. They don't interfere.

**Q: Why are some users showing as offline when they're actually online?**
A: Either: (1) Their socket disconnected, (2) Server crashed, or (3) WebSocket is unstable.

---

## 🚀 Next Steps

1. **Login**: Go to /login with valid credentials
2. **Verify**: Check localStorage for `erp_auth` token
3. **Chat**: Navigate to /dashboard/chat
4. **Test**: Send messages, verify real-time delivery
5. **Monitor**: Open DevTools to watch events in real-time

**Document Version**: 1.0  
**Last Updated**: March 5, 2026  
**Status**: Complete & Ready ✨
