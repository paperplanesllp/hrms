# Error Debugging Checklist

## 🔴 Error 1: `net::ERR_CONNECTION_REFUSED`

### Quick Fix Steps:
```bash
# 1. Navigate to server folder
cd server

# 2. Start the backend
npm start
# Should show: ✅ Server running on http://localhost:5000

# 3. Check in browser console
console.log(import.meta.env.VITE_API_BASE_URL)
# Should show: http://localhost:5000 or your backend URL
```

### Verify Connection:
```javascript
// Run this in browser console
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Connected:', d))
  .catch(e => console.error('❌ Failed:', e.message))
```

### If Still Failing:
- [ ] Backend running? Check terminal
- [ ] Correct port? (Default: 5000)
- [ ] Firewall blocking? Check Windows Defender
- [ ] Wrong API URL? Check `.env` file
- [ ] Try `http://localhost:5000` instead of just `/api`

---

## 🔴 Error 2: `401 (Unauthorized)` 

### Root Cause Diagnostic:
```javascript
// Run in browser console
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log('Auth data:', auth);

if (!auth) {
  console.log('❌ NOT LOGGED IN - User must login first');
} else if (!auth.accessToken) {
  console.log('❌ MISSING TOKEN - Token not saved');
} else {
  // Check if token expired
  const tokenPayload = JSON.parse(atob(auth.accessToken.split('.')[1]));
  const isExpired = tokenPayload.exp * 1000 < Date.now();
  console.log('Token expired?', isExpired);
  if (isExpired) console.log('❌ TOKEN EXPIRED - Must login again');
}
```

### Fix Steps:

**Option A: Not Logged In**
1. Go to http://localhost:5174 (or 5173)
2. Click "Login"
3. Enter credentials: `admin@gmail.com` + password
4. Refresh page (F5)
5. Try again

**Option B: Token Expired**
1. Clear browser data: Ctrl+Shift+Delete
2. Login again with fresh token
3. Should work for 30 days

**Option C: API Interceptor Not Working**
File: `erp-dashboard/src/lib/api.js` (line 12-16)
```javascript
// Add auth header to all requests
interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});
```

### Common 401 Sources:
- [ ] Not logged in? Login now
- [ ] Token expired? Clear cache + login
- [ ] API interceptor broken? Check `lib/api.js`
- [ ] Backend not validating token? Check server logs
- [ ] Wrong JWT secret? Check `.env` JWT_ACCESS_SECRET

---

## 🔴 Error 3: Google Maps Loaded Multiple Times

### Find Duplicate Scripts:
```javascript
// Run in browser console
const scripts = Array.from(document.scripts);
const googleMaps = scripts.filter(s => s.src.includes('maps.googleapis.com'));
console.log('Google Maps scripts found:', googleMaps.length);
googleMaps.forEach((s, i) => console.log(`${i+1}:`, s.src));
```

### Fix: Remove Duplicate Load

**Search files for Google Maps script:**
```bash
# Find all files loading Google Maps
grep -r "maps.googleapis.com" erp-dashboard/src/
grep -r "google-map" erp-dashboard/src/
```

**Common culprits:**
1. `index.html` - Has script tag
2. Multiple component files - Each loading script
3. NPM package loading it

**Solution:**
```javascript
// Only load ONCE in index.html or one component
// NOT in multiple places

// ❌ Wrong: Loading in multiple components
// Component1.jsx: <script src="...maps.googleapis.com...">
// Component2.jsx: <script src="...maps.googleapis.com...">

// ✅ Correct: Load once globally
// index.html OR SocketProvider.jsx (loads once)
```

### Fix Invalid Key Error:
Check your Google Maps API key in `.env`:
```bash
# .env or .env.local
VITE_GOOGLE_MAPS_API_KEY=AIzaSand_all_tgyD3MPnSnyWwNmpnVEFkaddVvy_GWtxSejs

# Make sure:
# 1. Key is valid and not truncated
# 2. Billing enabled on Google Cloud
# 3. Maps JavaScript API enabled
# 4. API restrictions set correctly
```

---

## 📋 Debugging Commands

### Start Fresh:
```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend
cd erp-dashboard && npm run dev

# Terminal 3: Check processes
# Windows PowerShell
Get-NetTCPConnection -LocalPort 5000,5173,5174 # See what's running
```

### Test API Connection:
```bash
# PowerShell
curl http://localhost:5000/api/health
# Should return: { status: "ok" }

# Or in browser console:
fetch('http://localhost:5000/api/health').then(r => r.json()).then(console.log)
```

### Check Auth Token:
```javascript
// Browser console
localStorage.getItem('erp_auth') // See full auth object
localStorage.clear() // Clear if corrupted
```

---

## ✅ Complete Startup Sequence

**This is what SHOULD happen:**

1. **Backend starts**
   ```
   ✅ Server running on http://localhost:5000
   ✅ MongoDB connected
   ✅ Socket.io listening on ws://localhost:5000
   ```

2. **Frontend starts**
   ```
   ✅ VITE app running on http://localhost:5173
   ✅ API Base URL: http://localhost:5000
   ```

3. **Browser opens**
   ```
   ✅ http://localhost:5174 loads
   ✅ No connection errors
   ✅ Login page shows
   ```

4. **User logs in**
   ```
   ✅ GET /api/auth/login (200 OK)
   ✅ Token saved to localStorage
   ✅ Dashboard loads
   ✅ All 401 errors gone
   ```

---

## 🔧 If All Else Fails

### Nuclear Option:
```bash
# Clear everything and restart
1. Kill all Node processes
2. rm -r node_modules (both server and erp-dashboard)
3. npm install (both folders)
4. Clear browser cache: Ctrl+Shift+Delete
5. npm start (backend)
6. npm run dev (frontend)
7. Clear localStorage in console: localStorage.clear()
8. Login fresh
```

### Check Logs:
- **Backend logs**: Terminal where `npm start` runs
- **Frontend logs**: Browser DevTools (F12 → Console)
- **Network logs**: Browser DevTools (F12 → Network tab)

---

## 📊 Error Priority to Fix

1. **ERR_CONNECTION_REFUSED** (FIRST) - Backend not running
2. **401 Unauthorized** (SECOND) - Not logged in or token expired  
3. **Google Maps** (THIRD) - Only if using maps features

**Fix #1, then #2, then #3 in that order!**
