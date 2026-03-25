# 🚀 QUICK FIX - Do This NOW

## Step 1: Check Backend is Running (FIX ERR_CONNECTION_REFUSED)

```bash
# Open Terminal and run:
cd server
npm start

# Should show:
# ✅ Server running on http://localhost:5000
```

**Not working?**
- Is port 5000 already in use? 
  ```bash
  # Find what's using port 5000
  netstat -ano | findstr :5000
  # Kill if needed: taskkill /PID 1234 /F
  ```

---

## Step 2: Login (FIX 401 UNAUTHORIZED)

```javascript
// In browser console (F12):
JSON.parse(localStorage.getItem('erp_auth'))
// If returns null → YOU'RE NOT LOGGED IN

// Fix: Go to login page and login with:
// Email: admin@gmail.com
// Password: (your password)
```

**After login:**
- Token should appear in localStorage
- All 401 errors should vanish
- Refresh page (F5) to test

---

## Step 3: Frontend Must Redirect to Login

**If you see 401 errors still after login:**

Check `erp-dashboard/src/lib/api.js`:
```javascript
// Should have auth interceptor adding token to requests
interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});
```

---

## Step 4: Fix Google Maps (FIX MULTIPLE LOAD ERROR)

```bash
# Search for where Google Maps loads:
grep -r "maps.googleapis.com" erp-dashboard/src/

# Should find ONLY in ONE file (index.html or one component)
# If found in multiple files → DELETE from all but one
```

---

## ⚡ 5-Minute Startup

```bash
# Terminal 1: Open backend folder
cd C:\Users\HP\OneDrive\Desktop\erp-project\server
npm start
# Wait for: ✅ Server running on http://localhost:5000

# Terminal 2: Open frontend folder  
cd C:\Users\HP\OneDrive\Desktop\erp-project\erp-dashboard
npm run dev
# Wait for: ✅ VITE app running

# Browser:
# 1. Go to http://localhost:5174
# 2. Click Login
# 3. Enter admin@gmail.com + password
# 4. Should see Dashboard (no errors!)
```

---

## ❌ If You Still See Errors

### 401 Persists?
```javascript
// Browser console - clear and re-login:
localStorage.clear()  // ← Clear corrupted data
// Then login again
```

### Connection Refused Persists?
```bash
# Check if backend is really running:
curl http://localhost:5000/api/health

# If fails → Backend crashed, check terminal for errors
```

### Google Maps Still Broken?
```bash
# Find ALL Google Maps references:
grep -r "googleapis" erp-dashboard/src/
grep -r "GoogleMap" erp-dashboard/src/

# Keep ONLY one, delete others
```

---

## 🎯 Success Signs

When fixed, you'll see:
- ✅ No red errors in console
- ✅ Dashboard loads normally
- ✅ No "401 Unauthorized" messages
- ✅ API calls return 200 OK
- ✅ No "GoogleMapsJSAPIError" warnings
