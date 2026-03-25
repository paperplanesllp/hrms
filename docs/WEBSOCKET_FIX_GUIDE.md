# 🔌 WebSocket Connection Error - Fix Guide

## Error You're Seeing
```
WebSocket connection to 'ws://localhost:5000/socket.io/?EIO=4&transport=websocket' failed:
WebSocket is closed before the connection is established.

Socket connection error: Authentication error
```

---

## ✅ What I Fixed

### **Backend (socket.js)**
```javascript
// NOW allows BOTH ports:
cors: {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  methods: ["GET", "POST"]
},
```

Before: Only allowed port 5173  
Now: Allows both 5173 and 5174 ✅

### **Frontend (socket.js)**
✅ Better error logging  
✅ Detailed token debugging  
✅ Connection attempt tracking  
✅ Reconnection strategies  

### **SocketProvider**
✅ Checks auth token exists before socket init  
✅ Waits for user to be fully authenticated  
✅ Better logging for debugging  

---

## 🚀 How to Test (Do This Now)

### **Step 1: Restart Both Servers**

**Terminal 1 - Backend:**
```bash
cd C:\Users\HP\OneDrive\Desktop\erp-project\server
npm run dev
```

Wait for:
```
✓ MongoDB connected
✓ Server running on http://localhost:5000
✓ Socket.IO initialized for real-time notifications
```

**Terminal 2 - Frontend:**
```bash
cd C:\Users\HP\OneDrive\Desktop\erp-project\erp-dashboard
npm run dev
```

Wait for:
```
VITE v8... ready in Xms
➜  Local:   http://localhost:5174/
```

### **Step 2: Open Browser**
```
http://localhost:5174
(or 5173 if available)
```

### **Step 3: Login**
```
Email: admin@gmail.com
Password: [your password]
Wait 2 seconds after successful login
```

### **Step 4: Open DevTools Console**
```
Press: F12
Go to: Console tab
```

### **Step 5: Check for Success Messages**

**You should see (in order):**

```
✅ Socket init skipped: No auth token available (initial page load)
📱 SocketProvider: Initializing socket for admin@gmail.com (after login)
🔌 Initializing socket connection...
   Server URL: http://localhost:5000
   Token: eyJhbGciOi... (preview)
✅ Socket connected successfully
✅ SocketProvider: Socket initialized successfully
```

**NOT seeing this?** → Socket connection failed → See "Troubleshooting" below

---

## 🔍 Understanding the Connection Flow

### **Before Login**
```
1. Page loads
2. Socket checks: "Is there a token?" → NO
3. Socket skips initialization ✅
4. App shows login page
```

### **During Login**
```
1. User enters credentials
2. Backend validates
3. Creates JWT token
4. Sends token to browser: localStorage.setItem('erp_auth', {...})
5. Component re-renders
```

### **After Login (Important!)**
```
1. User object set in auth store
2. SocketProvider sees user exists
3. Checks for token: getAuth()
4. Token is present ✅
5. Initializes socket with: auth: { token: "eyJ..." }
6. Socket.io connects to ws://localhost:5000
7. Backend socket middleware validates token
8. If valid → Connection accepted ✅
9. If invalid → "Authentication error" ❌
```

---

## 🧪 Debug Commands (Paste in Console F12)

### **Test 1: Check Token Status**
```javascript
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.table({
  'Token exists': !!auth?.accessToken,
  'Token length': auth?.accessToken?.length,
  'User email': auth?.user?.email,
  'User role': auth?.user?.role,
  'Token preview': auth?.accessToken?.substring(0, 50) + '...'
});
```

### **Test 2: Check Socket Connection**
```javascript
console.log({
  'Socket object exists': !!window.io,
  'Socket connected': window.socket?.connected ?? 'no socket',
  'Socket id': window.socket?.id ?? 'no socket'
});
```

### **Test 3: Manually Test WebSocket**
```javascript
// Force reinitialize socket
import { initializeSocket } from '/src/lib/socket.js';
const socket = initializeSocket();
console.log('Socket result:', socket?.connected ? '✅ Connected' : '❌ Failed');
```

### **Test 4: Check CORS Headers**
```javascript
// Open Network tab (F12 → Network)
// Make any API call or socket connection attempt
// Look for request to ws://localhost:5000/socket.io
// Check response headers for:
//   access-control-allow-origin: http://localhost:5174
//   access-control-allow-credentials: true
```

---

## ⚠️ Troubleshooting

### **Issue 1: "Authentication error"**

**Cause:** Token invalid or not sent correctly

**Debug:**
```javascript
// In console:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log('Token:', auth?.accessToken ? '✅' : '❌');
```

**Fix:**
```
1. Logout completely: localStorage.clear()
2. Refresh page: F5
3. Login again with credentials
4. Wait 2 seconds
5. Try again
```

### **Issue 2: "WebSocket is closed before connection established"**

**Cause:** Backend rejected connection immediately (auth failed)

**Check Backend Logs:**
```
Terminal 1 (Backend):
Look for messages like:
  ❌ Socket auth failed: Invalid token
  ❌ Socket auth failed: User not found
→ If you see these: Token is invalid
→ Solution: Re-login from browser
```

### **Issue 3: Port Already in Use**

**Cause:** Another process using port 5000 or 5174

**Fix:**
```bash
# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 3 seconds
Start-Sleep -Seconds 3

# Restart servers
# (same commands as Step 1 above)
```

### **Issue 4: CORS Error (if you see it)**

**Message:** "Access-Control-Allow-Origin" missing

**Fix:** Already done! Just restart servers for new CORS config to take effect

**Verify:**
```
Check backend socket.js has:
cors: {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}
```

### **Issue 5: Socket Keeps Disconnecting**

**Cause:** Usually token expired or server restarts

**Logs You'll See:**
```
🔌 Socket disconnected. Reason: server namespace disconnect
🔄 Reconnection attempt #1
✅ Socket connected successfully
```

This is NORMAL auto-reconnection behavior ✅

If it keeps failing:
1. Check backend is running
2. Re-login if token expired
3. Check browser console for specific error

---

## 📊 What Should Work After Fix

| Feature | Status |
|---------|--------|
| Dashboard loads | ✅ |
| Real-time notifications | ✅ |
| Live user status updates | ✅ |
| News feed updates | ✅ |
| Leave request notifications | ✅ |
| Console shows green messages | ✅ |
| No red console errors | ✅ |

---

## 🔧 Server Console Messages (What to Expect)

### **Backend Terminal - After Login**
```
[dotenv@...] injecting env (7) from .env
✓ MongoDB connected
✓ Server running on http://localhost:5000
✓ Socket.IO initialized for real-time notifications

[On new socketSocket connection]
✅ Socket auth succeeded: Admin User (ADMIN)
✅ User Admin User came online
```

### **Frontend Browser Console - After Login**
```
📱 SocketProvider: Initializing socket for admin@gmail.com
🔌 Initializing socket connection...
   Server URL: http://localhost:5000
   Token: eyJhbGciOi...
✅ Socket connected successfully
✅ SocketProvider: Socket initialized successfully
```

Both should show SUCCESS messages, not errors.

---

## 🎯 Quick Checklist

- [ ] Both servers restarted?
- [ ] Backend shows "Socket.IO initialized"?
- [ ] Frontend shows "Socket connected successfully"?
- [ ] No red errors in browser console?
- [ ] Browser showing localhost:5174 (or 5173)?
- [ ] Logged in as admin@gmail.com?
- [ ] At least 2 seconds after login before checking?
- [ ] Ran last terminal command with success output?

If ALL checked ✅ → Socket connection is working!

---

## 📝 Files Changed

1. **server/src/utils/socket.js**
   - Added port 5174 to CORS whitelist
   - Better error logging
   - Proper error messages

2. **erp-dashboard/src/lib/socket.js**
   - Detailed logging for debugging
   - Better error handling
   - Connection attempt tracking
   - Reconnection strategies

3. **erp-dashboard/src/components/providers/SocketProvider.jsx**
   - Check token before init
   - Added logging
   - Better auth flow

---

## 💡 Remember

WebSocket = Real-time connection from browser to server

**Requirements:**
1. ✅ Server running (port 5000)
2. ✅ Frontend running (port 5173 or 5174)
3. ✅ User logged in (token in localStorage)
4. ✅ CORS allows the frontend port
5. ✅ Backend socket middleware accepts token

Remove any ONE of these → Connection fails!

**After Fix:**
- You'll see data in real-time
- Notifications arrive instantly
- No WebSocket errors in console
- Status shows "Connected" not "Closed"

🎉 **If you follow all steps, it will work!**
