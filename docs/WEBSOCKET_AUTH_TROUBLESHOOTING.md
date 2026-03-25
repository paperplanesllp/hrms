# WebSocket & API Connection Troubleshooting Guide

## 🔴 **Errors You're Seeing**

```
1. WebSocket connection to 'ws://localhost:5000/socket.io/?EIO=4&transport=websocket' failed
   Error: WebSocket is closed before the connection is established.

2. Failed to load resource: /api/chat/...
   Status: 401 (Unauthorized)
```

---

## 🔍 **Root Cause: Not Logged In**

These errors occur because **you are not authenticated**. The system cannot connect without a valid JWT token.

### Authentication Flow
```
1. User logs in with credentials
         ↓
2. Server validates and issues JWT access token
         ↓
3. Token saved in localStorage
         ↓
4. API requests include token in Authorization header
         ↓
5. Socket.IO connection includes token in handshake
         ↓
6. Server validates token and allows connection
         ↓
7. Chat, WebSocket, and all API calls work! ✅
```

---

## ✅ **Solution: Complete Login Process**

### **Step 1: Navigate to Login**
```
http://localhost:5173/login
```

### **Step 2: Use Test Credentials**
Create a test account or use existing credentials:

**Test User 1:**
```
Email: john@example.com
Password: password123
```

**Test User 2:**
```
Email: sarah@example.com
Password: password123
```

**Admin:**
```
Email: admin@example.com
Password: admin123
```

### **Step 3: Verify Login Success**
✅ You should be redirected to dashboard  
✅ Token should appear in browser DevTools → Application → Local Storage → `erp_auth`

### **Step 4: Now Try Chat**
```
http://localhost:5173/dashboard/chat
```

✅ WebSocket should connect successfully  
✅ Chat messages should load  
✅ No more 401 errors!

---

## 🔐 **Authentication Flow - Behind the Scenes**

### **1. Login Request**
```
POST /auth/login
Body: { email, password }
Response: { accessToken, refreshToken, user }
```

### **2. Token Storage**
```javascript
// Saved in localStorage
localStorage.erp_auth = {
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { id, name, email, role }
}
```

### **3. API Headers**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

### **4. Socket.IO Auth**
```javascript
socket = io(serverUrl, {
  auth: {
    token: accessToken  // ← Sent in handshake
  }
})
```

---

## 🧪 **Verification Checklist**

### **Browser DevTools Check**

**Step 1: Open DevTools (F12)**

**Step 2: Go to Application → Local Storage**

**Step 3: Look for `erp_auth` key**

If you see:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "123...",
    "name": "John Developer",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

✅ **Good!** You are authenticated

If you see:
- Nothing (empty)
- `null`
- Error

❌ **Problem!** You are not logged in. Go to `/login` first.

---

## 🔧 **Debugging Steps**

### **Step 1: Console Logs**
Open browser console (F12) and check for:

**Good Signs:**
```
✅ Connected to real-time notifications
✅ Socket: 'online_users_list' received
✅ Chat messages loaded
```

**Bad Signs:**
```
❌ WebSocket is closed before connection established
❌ Failed to load resource: 401 Unauthorized
❌ Authentication error
```

### **Step 2: Network Tab**
1. Open DevTools → Network
2. Filter by "XHR" (API requests)
3. Look for GET `/api/chat` request
4. Check response status:
   - ✅ 200 = Good, you're authenticated
   - ❌ 401 = Not authenticated, need to login
   - ❌ 403 = Forbidden (permission issue)

### **Step 3: Socket Tab (if available)**
Some browsers show WebSocket connections:
1. DevTools → Network
2. Filter by "WS" (WebSocket)
3. Should see: `ws://localhost:5000/socket.io/...`
4. Status should be "101 Switching Protocols" (success)

---

## 🚀 **Quick Fix Checklist**

### **For 401 Unauthorized Errors**

- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] See redirect to dashboard
- [ ] Check `erp_auth` in localStorage
- [ ] Navigate to chat page
- [ ] Verify WebSocket connects (no errors in console)

### **For WebSocket Connection Failed**

- [ ] Clear localStorage: `localStorage.clear()`
- [ ] Refresh page: F5
- [ ] Log back in
- [ ] Try chat again

### **For Chat Not Loading**

- [ ] Check Network tab for 401 errors
- [ ] If 401, clear auth and re-login
- [ ] If 500, check server logs
- [ ] Try opening another chat

---

## 🔄 **Token Refresh Mechanism**

If your access token expires (15 minutes by default):

```
1. API request fails with 401
         ↓
2. Automatically sends refresh token
         ↓
3. Server issues new access token
         ↓
4. Request retried with new token
         ↓
5. You don't need to login again! ✅
```

If refresh also fails:
```
1. User redirected to /login
2. Need to login again
```

---

## 📋 **Test Credentials Setup**

If test credentials don't exist, create them:

### **Option 1: API Direct**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123",
    "role": "USER"
  }'
```

### **Option 2: Database Seed**
```bash
cd server
npm run seed
```

### **Option 3: UI Registration**
1. Go to `/register`
2. Fill in form (name, email, password)
3. Choose role (USER, HR, ADMIN)
4. Submit
5. Auto-login and redirected to dashboard

---

## 🆘 **Still Getting Errors?**

### **Check Server Status**

**Is the server running?**
```powershell
netstat -ano | findstr "5000"
```

Should show:
```
TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING
```

**If not, start it:**
```bash
cd server
npm start
```

### **Check Server Logs**
Look for:
```
✅ Connected to MongoDB
✅ Server running on port 5000
✅ JWT secrets configured
```

If you see errors, screenshot the logs and check:
1. MongoDB connection
2. Environment variables (.env)
3. Port conflicts (another process using 5000?)

---

## 📊 **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Not logged in | Go to /login, enter credentials |
| WebSocket failed | No auth token | Login first, whitelist 5173 if CORS |
| Chat not loading | Server not running | `npm start` in server folder |
| 500 Server Error | Server crash | Check server logs, restart |
| CORS error | Frontend/backend mismatch | Check VITE_API_BASE_URL in .env |
| Token expired | Session timeout | Automatic refresh, or re-login |

---

## 🔐 **Security Reminder**

✅ **Secure:**
- Tokens expire after 15 minutes
- Tokens only sent to authenticated users
- Socket.IO validates JWT on connection
- API endpoints require valid token
- Passwords hashed in database

❌ **Not Secure:**
- Storing passwords in browser
- Sharing tokens across users
- Token with wrong expiry time
- Missing HTTPS in production

---

## 🎓 **Understanding the Stack**

### **Frontend (React)**
```
Login Page → Get Token → Store in localStorage → 
Send in API/Socket requests → Access protected pages
```

### **Backend (Node.js)**
```
Receive Request → Validate JWT Token → Check permissions → 
Send response or deny with 401 → Emit socket events
```

### **WebSocket (Socket.IO)**
```
Client connects → Handshake with token → 
Server validates → Allow connection → 
Two-way real-time communication ✅
```

---

## 📞 **Quick Reference Commands**

### **Check if logged in (Browser Console)**
```javascript
console.log(localStorage.getItem('erp_auth'));
```

### **Logout (Browser Console)**
```javascript
localStorage.removeItem('erp_auth');
location.reload();
```

### **Check server port (Terminal)**
```powershell
netstat -ano | findstr "5000"
```

### **Check Node processes**
```powershell
tasklist | findstr "node"
```

### **Kill process on port 5000**
```powershell
taskkill /PID <process_id> /F
```

---

## ✅ **Success Indicators**

When everything is working correctly:

✅ Can log in and access dashboard  
✅ No 401 errors in console  
✅ WebSocket connects (no failed connection)  
✅ Chat loads messages instantly  
✅ Real-time updates work  
✅ User status shows online/offline  
✅ Messages send and receive  
✅ Typing indicators appear  

---

## 🎯 **Next Steps**

1. **Login First**: Go to http://localhost:5173/login
2. **Use Valid Credentials**: Enter email and password
3. **Verify Token**: Check localStorage has `erp_auth`
4. **Access Chat**: Navigate to chat page
5. **Confirm Working**: Check for WebSocket connection success

---

**Document Version**: 1.0  
**Last Updated**: March 5, 2026  
**Status**: Ready for Reference ✨
