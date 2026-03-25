# WebSocket & 401 Authorization Errors - Complete Solution

## ⚠️ **The Problem**

You're seeing these errors:
```
1. WebSocket connection to 'ws://localhost:5000/socket.io/...' failed
   WebSocket is closed before the connection is established.

2. Failed to load resource: /api/chat/...
   Status: 401 (Unauthorized)
```

---

## ✅ **The Solution (TL;DR)**

### **YOU ARE NOT LOGGED IN**

**Fix:** Go to `http://localhost:5173/login` and login first.

That's it! Once you're logged in with valid credentials, everything will work.

---

## 🔍 **Why This Happens**

The system requires authentication for security. Here's what's happening:

### Without Login (Current State) ❌
```
You: Try to access chat without logging in
        ↓
System: No token found in localStorage
        ↓
WebSocket: Skips connection (needs token)
        ↓
API: Rejects requests (needs token)
        ↓
Result: 401 Unauthorized + WebSocket Failed errors
```

### With Login (What Should Happen) ✅
```
You: Go to /login → Enter credentials → Click Login
        ↓
System: Verifies credentials, creates JWT token
        ↓
Token: Saved in localStorage
        ↓
WebSocket: Connects with token
        ↓
API: Requests succeed (token included)
        ↓
Result: Chat works perfectly! 🎉
```

---

## 🚀 **Quick Fix Steps**

### **Step 1: Start Backend** (if not running)
```bash
cd server
npm start
```
Expected: "Server running on port 5000"

### **Step 2: Open Frontend**
```
http://localhost:5173
```

### **Step 3: Click Login** (or navigate to /login)

### **Step 4: Enter Credentials**
```
Email: john@example.com
Password: password123
```

OR use admin credentials:
```
Email: admin@example.com
Password: admin123
```

### **Step 5: Click Login Button**

### **Step 6: Access Chat**
After redirect to dashboard:
- Navigate to Chat section, OR
- Go directly to: `http://localhost:5173/dashboard/chat`

### **Step 7: Verify Success** ✅
You should see:
- ✅ Chat list loads
- ✅ No 401 errors in console
- ✅ WebSocket connects (check console: "Connected to real-time notifications")
- ✅ User avatars show green/gray dots
- ✅ Can send/receive messages

---

## 🔐 **How Authentication Works**

### **Login Process (Frontend)**
```javascript
1. User enters email + password
2. Frontend sends to POST /auth/login
3. Backend validates against MongoDB
4. If valid: Returns JWT token
5. Frontend saves token in localStorage
6. Frontend redirects to dashboard
```

### **Token Usage (Automatic)**
```javascript
1. When you make any API request:
   Headers: { Authorization: "Bearer <token>" }

2. When WebSocket connects:
   auth: { token: "<token>" }

3. Server validates token on every request
4. If valid: Allow access
5. If invalid/missing: Return 401

Frontend automatically includes token!
You don't need to do anything manually!
```

---

## 📋 **Verification Checklist**

### **In Browser Console (F12)**

**Check 1: Token exists?**
```javascript
// Type in console:
localStorage.getItem('erp_auth')

// Should show:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}

// If shows null or empty: NOT LOGGED IN ❌
```

**Check 2: WebSocket connected?**
```
Console output should show:
✅ Connected to real-time notifications

OR errors:
❌ WebSocket is closed before connection
❌ Authentication error
```

**Check 3: Network requests**
```
DevTools → Network → XHR
Look for GET /chat request:
- Status 200 = Good ✅
- Status 401 = Not authenticated ❌
- Status 500 = Server error ❌
```

---

## 🧪 **Test Credentials**

### **Standard Users**
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| john@example.com | password123 | USER | Regular user |
| sarah@example.com | password123 | USER | Regular user |
| admin@example.com | admin123 | ADMIN | Full access |
| hr@example.com | hr123 | HR | HR operations |

### **If credentials don't work:**

**Option 1: Create new account**
```
Go to /register
Fill in form
Choose role: USER
Complete registration
Auto-login after registration
```

**Option 2: Seed database**
```bash
cd server
npm run seed
# This creates fresh test users
```

**Option 3: Check backend logs**
```
Server terminal should show:
✅ Connected to MongoDB
✅ Server running on port 5000

If not, MongoDB might not be running!
```

---

## 🛠️ **Troubleshooting**

### **Problem: Still getting 401 after login**

**Cause:** Token might be corrupted or localStorage issue

**Fix:**
```javascript
// In browser console:
localStorage.clear()
location.reload()
// Then login again
```

### **Problem: WebSocket still fails after login**

**Cause:** 
- Server not running, OR
- Server restarted (old client token invalid)

**Fix:**
```bash
# Restart server:
cd server
npm start

# Then in browser:
localStorage.clear()
location.reload()
# Login again
```

### **Problem: Port 5000 already in use**

**Cause:** Another process using port

**Fix:**
```powershell
# Find process:
netstat -ano | findstr ":5000"

# Kill it (replace PID):
taskkill /PID <process_id> /F

# Restart server:
npm start
```

### **Problem: Cannot connect to MongoDB**

**Cause:** MongoDB not running

**Fix:**
```bash
# Option 1: Start local MongoDB
mongod

# Option 2: Check .env has MONGO_URI:
MONGO_URI=mongodb://localhost:27017/erp
# or cloud database URL
```

---

## 📊 **What Each Error Means**

| Error | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized** | No token or invalid token | Login with valid credentials |
| **WebSocket Closed** | No token before connection | Login first, then access chat |
| **Cannot GET /chat** | Not authenticated | Redirects to login, you need to login |
| **500 Server Error** | Backend crashed | Check server logs, restart |
| **Cannot Connect to MongoDB** | DB not running | Start MongoDB with `mongod` |
| **Port 5000 in use** | Another app on that port | Kill process or change port |

---

## 🎯 **System Flow (End-to-End)**

```
1. START BACKEND
   npm start (in server folder)
   ↓ (Server listens on :5000)

2. START FRONTEND
   npm run dev (in erp-dashboard folder)
   ↓ (App listens on :5173)

3. BROWSER: http://localhost:5173
   ↓ (Redirects to /login if not authenticated)

4. LOGIN PAGE
   ↓ (User enters credentials)

5. POST /auth/login
   ↓ (Backend verifies, creates token)

6. SAVE TOKEN
   ↓ (localStorage.erp_auth = {...})

7. REDIRECT TO DASHBOARD
   ↓ (SocketProvider detects user is logged in)

8. INITIALIZE SOCKET
   ↓ (Connects with token in handshake)

9. SOCKET CONNECTS
   ✅ /socket.io/ establishes WebSocket connection

10. EVENT: user_online
    ✅ You receive list of all online users
    ✅ Status indicators populate

11. NAVIGATE TO CHAT
    http://localhost:5173/dashboard/chat
    ↓

12. API: GET /chat (with token)
    ✅ 200 OK - Chat list returns

13. DISPLAY CHAT
    ✅ Chats load
    ✅ Users show with status dots
    ✅ Messages load
    ✅ Real-time events work
    ✅ Everything functional! 🎉

```

---

## ✨ **Success Indicators**

When everything works:

**Console Shows:**
```
✅ Connected to real-time notifications
✅ user_online_list received
✅ No 401 errors
✅ No WebSocket failed errors
```

**UI Shows:**
```
✅ Chat list populated
✅ User avatars visible
✅ Green dots for online users
✅ Gray dots for offline users
✅ "Online"/"Offline" status text
✅ Can send/receive messages
✅ Messages appear instantly
✅ Typing indicators show
✅ Message ticks (✓✓) show delivery
```

**Network Shows:**
```
✅ GET /chat → 200 OK
✅ POST /chat/:id/messages → 201 Created
✅ WebSocket connected → 101 Switching Protocols
```

---

## 🎓 **Key Concepts**

### **JWT Token**
- Small text containing user info + signature
- Backend validates signature = proves authenticity
- Expires after 15 minutes
- Can be refreshed (no manual re-login needed)
- Stored in localStorage

### **WebSocket**
- Permanent two-way connection
- Enables real-time messaging
- Requires authentication (can't connect without token)
- Connected to server permanently until page closes

### **401 Unauthorized**
- Server saying: "I don't know who you are"
- Means: No token OR invalid token
- Solution: Provide valid token (login first)

### **Socket.IO**
- Library that manages WebSocket connections
- Enables real-time events
- Automatically reconnects if connection drops
- Requires token for authentication

---

## 📞 **Still Having Issues?**

### **Step 1: Check Basics**
- [ ] Backend running? (`npm start` in server folder)
- [ ] Frontend running? (`npm run dev` in erp-dashboard folder)
- [ ] Can navigate to http://localhost:5173? (Check browser)
- [ ] See login page? (If not authenticated)

### **Step 2: Try Login**
- [ ] Go to /login
- [ ] Enter test credentials
- [ ] See "Welcome" or redirect to dashboard?
- [ ] Check localStorage has `erp_auth` token (F12)

### **Step 3: Check Chat**
- [ ] Navigate to /dashboard/chat
- [ ] See any errors in console? (F12 → Console tab)
- [ ] See chat list or 401 error?
- [ ] Check Network tab (F12 → Network) for request status

### **Step 4: Review Logs**
- [ ] Server terminal output - any errors?
- [ ] Browser console (F12) - red errors?
- [ ] Network tab (F12) - 401 requests?

### **Step 5: Recreate Issue**
```javascript
// In browser console:
localStorage.clear()
location.reload()
// Login again
// Try chat again
```

---

## 📄 **Related Documentation**

For more detailed information, see:

1. **GETTING_STARTED_GUIDE.md** - Complete setup instructions
2. **WEBSOCKET_AUTH_TROUBLESHOOTING.md** - Detailed troubleshooting
3. **ARCHITECTURE_FLOW_DIAGRAMS.md** - Visual flow diagrams
4. **REALTIME_USER_STATUS_DOCS.md** - Real-time status system
5. **QUICK_REFERENCE_REALTIME_STATUS.md** - Quick reference

---

## 🎉 **Summary**

```
┌─────────────────────────────────────────────┐
│ The Problem:                                │
│ Getting 401 & WebSocket failed errors       │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ The Root Cause:                             │
│ You are not logged in                       │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│ The Solution:                               │
│ 1. Go to /login                             │
│ 2. Enter valid credentials                  │
│ 3. Click Login                              │
│ 4. Navigate to chat                         │
│ 5. Everything works! ✅                     │
└─────────────────────────────────────────────┘
```

---

**Document Version**: 1.0  
**Last Updated**: March 5, 2026  
**Created**: For Production Support ✨

**NEXT ACTION:** 
1. Go to http://localhost:5173/login
2. Login with valid credentials
3. Access chat
4. Enjoy real-time messaging! 🚀
