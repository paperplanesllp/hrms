# Getting Started with the ERP Chat System

## 🚀 Quick Start Guide

### Step 1: Start the Backend Server
```bash
# Navigate to server directory
cd server

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

**Expected Output:**
```
✅ Connected to MongoDB
✅ Server running on port 5000
⚡ Listening on port 5000
```

### Step 2: Start the Frontend
```bash
# In a new terminal, navigate to client directory
cd erp-dashboard

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
  Local:   http://localhost:5173
  ➜ Network: (available at network URL)
```

### Step 3: Login
1. Open http://localhost:5173
2. Click "Login" (or already on login page)
3. Enter credentials:

**Test User:**
```
Email: john@example.com
Password: password123
```

**Admin User:**
```
Email: admin@example.com
Password: admin123
```

### Step 4: Access Chat
1. After login, navigate to Dashboard
2. Click on "Messages" or go to `/dashboard/chat`
3. ✅ WebSocket should connect immediately!
4. ✅ Chat should load! 

---

## 🔍 Verify Everything is Working

### Frontend Check
**Browser Console (F12):**
```
✅ Connected to real-time notifications
✅ No 401 Unauthorized errors
✅ No WebSocket connection failed errors
```

### Backend Check
**Server Terminal:**
```
✅ User john connected (USER)
✅ No "Authentication error" messages
```

### Browser DevTools Check
1. **Local Storage** → Should have `erp_auth` key with token
2. **Network** → Chat API calls should return 200
3. **WebSocket** → Connection should show `101 Switching Protocols`

---

## 🆘 Troubleshooting

### ❌ "WebSocket connection failed"
**Cause:** User not logged in  
**Fix:** Go to `/login` and enter valid credentials

### ❌ "401 Unauthorized"
**Cause:** No authentication token  
**Fix:** Clear localStorage and login again
```javascript
// Browser Console:
localStorage.clear();
location.reload();
```

### ❌ "Cannot GET /chat"
**Cause:** Not logged in, redirected to login  
**Fix:** Login first, then navigate to chat

### ❌ "Server connection refused"
**Cause:** Backend server not running  
**Fix:** 
```bash
cd server
npm start
```

### ❌ "Port 5000 already in use"
**Cause:** Another process using port  
**Fix:**
```powershell
# Find process using port 5000
netstat -ano | findstr "5000"

# Kill the process (replace PID)
taskkill /PID <process_id> /F

# Restart server
npm start
```

---

## 📋 Complete Setup Checklist

### Backend Setup
- [ ] Node.js installed
- [ ] MongoDB running (local or cloud)
- [ ] `.env` file configured with:
  - `MONGO_URI=mongodb://localhost:27017/erp` (or your MongoDB URL)
  - `ACCESS_TOKEN_SECRET=your_secret_key`
  - `REFRESH_TOKEN_SECRET=your_secret_key`
  - `CLIENT_ORIGIN=http://localhost:5173`
  - `PORT=5000`
- [ ] Dependencies installed: `npm install`
- [ ] Server starts without errors: `npm start`
- [ ] Port 5000 is listening

### Frontend Setup
- [ ] Node.js installed
- [ ] `.env` file configured with:
  - `VITE_API_BASE_URL=http://localhost:5000`
- [ ] Dependencies installed: `npm install`
- [ ] Dev server starts: `npm run dev`
- [ ] Port 5173 is accessible: `http://localhost:5173`

### Application Flow
- [ ] Can navigate to login page
- [ ] Can enter credentials and login
- [ ] Token appears in localStorage (check with F12)
- [ ] Redirected to dashboard after login
- [ ] Can navigate to chat page without errors
- [ ] WebSocket shows "Connected" in console
- [ ] Chat messages load successfully
- [ ] Can send messages in real-time
- [ ] User status shows as Online/Offline

---

## 🔐 Default Test Credentials

If these don't work, run the seed script:

```bash
cd server
npm run seed
```

**Standard Users:**
| Email | Password | Role |
|-------|----------|------|
| john@example.com | password123 | USER |
| sarah@example.com | password123 | USER |
| admin@example.com | admin123 | ADMIN |
| hr@example.com | hr123 | HR |

---

## 🔄 Reset Everything

If you want a fresh start:

### Clear Frontend
```bash
# Clear local storage
rm -r erp-dashboard/node_modules
npm install
npm run dev
```

### Clear Backend
```bash
# Clear MongoDB
# Option 1: Clear specific database
# In MongoDB (mongosh or Compass): db.dropDatabase()

# Option 2: Reinstall dependencies
rm -r server/node_modules
npm install
npm run seed  # Seeds fresh data
npm start
```

---

## 📊 Services Status

### Check All Services Are Running

**Backend Running?**
```powershell
# Should show Process ID and LISTENING
netstat -ano | findstr "5000"
```

**MongoDB Running?**
```powershell
# If local MongoDB
netstat -ano | findstr "27017"

# Or check with MongoDB Compass (GUI)
```

**Frontend Running?**
```powershell
# Should show something like:
# Local: http://localhost:5173
netstat -ano | findstr "5173"
```

---

## 🎯 Common Workflows

### Send a Message
```
1. Open chat → Select user/group → Type message → Press Enter
2. Should appear immediately in chat
3. Should show deliver ticks (✓✓)
4. Should show timestamp
```

### Create a Group Chat
```
1. Click "Create Group" button (+ Users icon)
2. Enter group name
3. Search and select members
4. Click "Create Group"
5. Group appears in chat list
```

### Call Someone
```
1. Open 1-on-1 chat
2. User should show as Online (green dot)
3. Click phone or video icon
4. Feature shows "Coming Soon" message (placeholder)
```

### Check Online Status
```
1. Open chat
2. Look at user avatar - green dot = online, gray = offline
3. Header shows "Online" or "Offline"
4. Status updates in real-time when they connect/disconnect
```

---

## 🚀 Performance Tips

### For Faster Development
```bash
# Use npm run dev (with hot reload)
npm run dev

# NOT npm start (requires full restart)
npm start
```

### For Testing Production Build
```bash
# Build frontend
npm run build

# Preview build
npm run preview

# Backend should still be: npm start
```

### Enable DevTools
Install React DevTools browser extension for better debugging:
- Chrome: https://react.dev/link/react-devtools
- Firefox: https://react.dev/link/react-devtools-firefox

---

## 📞 Need Help?

### Check Error Messages
1. **Browser Console** (F12) - Frontend errors
2. **Server Terminal** - Backend errors
3. **Network Tab** (F12) - API response errors

### Common Error Solutions

| Error | Solution |
|-------|----------|
| "Port already in use" | Kill process or change port |
| "Cannot connect to MongoDB" | Start MongoDB or check URI |
| "404 Cannot GET" | Check route in server |
| "401 Unauthorized" | Login with valid credentials |
| "WebSocket Failed" | Build backend with updated socket code |

### Debug Commands

**Check if services running:**
```powershell
# Port 5000 (Backend)
netstat -ano | findstr ":5000"

# Port 5173 (Frontend)
netstat -ano | findstr ":5173"

# Port 27017 (MongoDB)
netstat -ano | findstr ":27017"
```

**Check Node processes:**
```powershell
tasklist | findstr "node"
```

**View server logs:**
```powershell
# If terminal is still visible, check output
# If running in background, check logs folder
dir server/logs  # if logs are saved
```

---

## 🎓 Key Concepts

### Authentication Flow
```
User enters email/password
        ↓
Backend validates
        ↓
Creates JWT token (valid 15 min)
        ↓
Sends token to frontend
        ↓
Frontend saves in localStorage
        ↓
All requests include token
        ↓
Access granted! ✅
```

### WebSocket Connection Flow
```
User logged in (has token)
        ↓
Frontend loads SocketProvider
        ↓
Calls initializeSocket()
        ↓
Socket connects with token
        ↓
Backend validates token
        ↓
User joins rooms (personal + chats)
        ↓
Real-time communication ready! ✅
```

### Message Flow
```
User types & sends message
        ↓
Frontend sends to API
        ↓
Backend validates & saves to DB
        ↓
Backend broadcasts via WebSocket
        ↓
Both users receive instantly
        ↓
Message shows with double ticks ✓✓
```

---

## ✨ Features Checklist

### Chat Features
- [x] 1-on-1 messaging
- [x] Group chats
- [x] Real-time message delivery
- [x] Message read receipts
- [x] Edit messages
- [x] Delete messages
- [x] Voice messages
- [x] Emoji support
- [x] Typing indicators
- [x] User online/offline status

### Premium Chat Features (Implemented)
- [x] Professional gradient header
- [x] Real-time user status
- [x] End-to-end encrypted badge
- [x] Phone call button
- [x] Video call button (placeholder)
- [x] Enhanced message bubbles
- [x] Smooth animations
- [x] Double-tick delivery system

---

## 🎉 Success!

When everything is working:
- ✅ Can login
- ✅ WebSocket connects (no errors)
- ✅ Chat loads instantly
- ✅ Messages send/receive in real-time
- ✅ User status shows accurately
- ✅ Typing indicators work
- ✅ End-to-end encrypted badge visible
- ✅ Professional UI with gradients

**You're ready to use the premium ERP chat system!** 🚀

---

**Version**: 1.0  
**Last Updated**: March 5, 2026  
**Status**: Complete & Ready ✨
