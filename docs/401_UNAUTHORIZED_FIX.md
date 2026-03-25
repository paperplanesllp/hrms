# 🔑 401 UNAUTHORIZED ERROR - Complete Fix Guide

## 🚨 What You See
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)

Affected endpoints:
- :5000/api/attendance
- :5000/api/news
- :5000/api/notifications
```

---

## 🎯 Root Cause: 3 Possible Issues

### **Issue 1: You're Not Logged In** (MOST COMMON)
```
Symptom: 401 errors right after opening the page
Cause: No auth token in localStorage
Solution: LOGIN FIRST ↓
```

### **Issue 2: Token Expired** 
```
Symptom: 401 errors after being logged in for a while
Cause: JWT token has expired (usually after 30 days)
Solution: Re-login ↓
```

### **Issue 3: Token Not Being Sent**
```
Symptom: 401 errors even though you're logged in
Cause: Axios interceptor not adding token to requests
Solution: Check API.js configuration ↓
```

---

## ✅ FIX #1: Check If You're Logged In (RIGHT NOW)

### Step 1: Open Browser DevTools
```
Press: F12 (or right-click → Inspect)
```

### Step 2: Go to Console Tab
```
Click: Console tab (bottom of DevTools)
```

### Step 3: Paste This Command
```javascript
JSON.parse(localStorage.getItem('erp_auth'))
```

### What You Should See

**✅ GOOD - You're logged in:**
```javascript
{
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "69a6c3cf24b59e1b1966df8b",
    email: "admin@gmail.com",
    role: "ADMIN",
    name: "Admin User"
  },
  refreshToken: "..."
}
```

**❌ BAD - Not logged in:**
```javascript
null
// or empty object {}
// or undefined
```

---

## 🔐 FIX #2: Login If Token Missing

### Step 1: Navigate to Login Page
```
URL: http://localhost:5174/login
(or http://localhost:5173/login if port 5173 is available)
```

### Step 2: Enter Credentials
```
Email: admin@gmail.com
Password: [your admin password]
```

### Step 3: Click Login
```
Wait 1-2 seconds for redirect
```

### Step 4: Verify Token Exists
```javascript
// In console (F12), paste:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log('Logged in as:', auth?.user?.email);
console.log('Token received:', !!auth?.accessToken);
```

**Expected output:**
```
Logged in as: admin@gmail.com
Token received: true
```

### Step 5: Refresh Page
```
Press: F5 or Ctrl+R
Wait for page to fully load
```

---

## 🧪 FIX #3: Test API Calls Manually

### Test 1: Verify Token
```javascript
// Paste in console (F12):
const auth = JSON.parse(localStorage.getItem('erp_auth'));
const token = auth?.accessToken;

console.log('Token exists:', !!token);
console.log('Token length:', token?.length);
console.log('Token starts with "eyJ":', token?.startsWith('eyJ'));

// Expected:
// Token exists: true
// Token length: 600+ (should be long JWT string)
// Token starts with "eyJ": true
```

### Test 2: Manual API Call to /news
```javascript
// Paste in console (F12):
const auth = JSON.parse(localStorage.getItem('erp_auth'));
const token = auth?.accessToken;

fetch('http://localhost:5000/api/news', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
})
.then(r => {
  console.log('Status:', r.status, r.statusText);
  return r.json();
})
.then(d => {
  if (d.length > 0) {
    console.log('✅ Success! Got', d.length, 'news items');
  } else {
    console.log('✅ Success! (Empty list)');
  }
  console.log('Data:', d);
})
.catch(e => console.error('❌ Error:', e.message));
```

**Expected results:**
```
Status: 200 OK  ✅
Got X news items
Data: [...]

OR (if 401 still):
Status: 401 Unauthorized  ❌
→ Token is NOT being sent correctly
```

### Test 3: Manual API Call to /notifications
```javascript
// Same as above but change URL to:
fetch('http://localhost:5000/api/notifications', {
  // ...rest same
})
```

### Test 4: Manual API Call to /attendance
```javascript
// Paste in console (F12):
const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const to = new Date().toISOString().split('T')[0];
const auth = JSON.parse(localStorage.getItem('erp_auth'));
const token = auth?.accessToken;

fetch(`http://localhost:5000/api/attendance?from=${from}&to=${to}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
})
.then(r => {
  console.log('Status:', r.status, r.statusText);
  return r.json();
})
.then(d => console.log('Data:', d))
.catch(e => console.error('Error:', e.message));
```

---

## 🔧 FIX #4: Check Axios Interceptor (If Tests Fail)

If manual tests work BUT page still shows 401, the interceptor needs checking.

### File: erp-dashboard/src/lib/api.js

**It should look like this:**
```javascript
import axios from "axios";
import { getAuth, saveAuth, clearAuth } from "./auth.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// ✅ THIS IS CRITICAL - adds token to EVERY request
api.interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
    // This header is added automatically to all requests
  }
  
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Handles 401 by refreshing token
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err?.response?.status === 401 && !original?._retry) {
      original._retry = true;
      try {
        const r = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const auth = getAuth() || {};
        const next = { ...auth, accessToken: r.data?.accessToken };
        saveAuth(next);

        original.headers.Authorization = `Bearer ${r.data?.accessToken}`;
        return api(original);
      } catch {
        clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

**Key parts:**
- Line 12-16: Adds `Authorization: Bearer <token>` to every request ✅
- Line 27-45: If 401, tries to refresh token automatically ✅
- If refresh fails: Clears auth and redirects to login ✅

---

## 📊 Understanding 401 vs Other Errors

```
401 UNAUTHORIZED
├─ Meaning: Authentication failed
├─ Causes:
│  ├─ Missing Authorization header
│  ├─ Token not provided
│  ├─ Token invalid/malformed
│  ├─ Token expired (after 30 days)
│  └─ Wrong token format
└─ Solution: Re-login to get fresh token

403 FORBIDDEN
├─ Meaning: Authentication OK, but no permission
├─ Causes:
│  ├─ User role lacks access
│  ├─ Admin-only resource
│  └─ Resource belongs to different user
└─ Solution: Contact admin for permission

500 SERVER ERROR
├─ Meaning: Backend crash/bug
├─ Causes:
│  ├─ Server not running
│  ├─ Database error
│  └─ Code bug
└─ Solution: Check backend terminal for errors
```

---

## 🧹 NUCLEAR FIX - If Nothing Above Works

### Step 1: Logout Completely
```javascript
// In console (F12):
localStorage.clear();
```

### Step 2: Close Browser Tab
```
Close the tab completely
```

### Step 3: Restart Servers
```bash
# PowerShell - Stop all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 2 seconds
Start-Sleep -Seconds 2

# Restart backend
cd C:\Users\HP\OneDrive\Desktop\erp-project\server
npm run dev

# In new terminal - restart frontend
cd C:\Users\HP\OneDrive\Desktop\erp-project\erp-dashboard
npm run dev
```

### Step 4: Open Fresh Browser Window
```
Go to: http://localhost:5174 (or 5173)
```

### Step 5: Login
```
Email: admin@gmail.com
Password: [your password]
```

### Step 6: Check Console
```
F12 → Console
Should see: "🔌 Connected to real-time notifications" (green message)
```

### Step 7: Navigate to Pages
```
Sidebar → Dashboard → Works?
Sidebar → News → Works?
Sidebar → Attendance → Works?
```

---

## 🔍 What The Token Contains

Every JWT token has 3 parts:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IjY5YTZjM2NmMjRiNTllMWIxOTY2ZGY4YiIsInJvbGUiOiJBRE1JTiJ9.
[signature]

          ↓              ↓               ↓
      Header         Payload       Signature
```

**Payload contains:**
```
{
  id: "69a6c3cf24b59e1b1966df8b",
  role: "ADMIN",
  iat: 1746000000,
  exp: 1748678400
}
```

- `id` = User ID in database
- `role` = User role (ADMIN, HR, EMPLOYEE, etc.)
- `iat` = Issued at (timestamp)
- `exp` = Expires at (timestamp) ← This is why tokens expire

---

## 📋 DIAGNOSTIC CHECKLIST

Before contacting support, verify:

- [ ] Backend running? (`npm run dev` in server folder, shows "Server running on port 5000")
- [ ] Frontend running? (`npm run dev` in erp-dashboard folder, shows "Local: http://localhost:5174")
- [ ] Logged in? (`localStorage.getItem('erp_auth')` in console returns data)
- [ ] Token not expired? (Check if token refresh works)
- [ ] API interceptor correct? (Bearer token in Authorization header)
- [ ] Browser DevTools Network tab shows `Authorization: Bearer...` header?
- [ ] Manual fetch test works? (Copy/paste code above in console)
- [ ] Clear cache & reload? (Ctrl+Shift+R for hard refresh)
- [ ] Clear localStorage & re-login? (localStorage.clear() then login again)

---

## 🎯 QUICK REFERENCE

| Error | Cause | Fix |
|-------|-------|-----|
| 401 when NOT logged in | Missing token | Login at /login |
| 401 after being logged in | Token expired | Re-login |
| 401 even after login | Interceptor issue | Refresh page (F5) |
| 403 | No permission | Contact admin |
| 500 | Server error | Check backend terminal |
| Network error | Can't reach backend | Check port 5000 running |

---

## 💡 REMEMBER

**APIs require 3 things:**
1. ✅ **Server running** (listen on port 5000)
2. ✅ **Valid auth token** (from successful login)
3. ✅ **Correct header** (`Authorization: Bearer <token>`)

**401 = Missing any of the above**

It's NOT that your code is broken - you just need to be logged in first!

---

## 🚀 After Fixing 401

Once 401 errors are gone, you should:

1. See data loading on dashboard
2. See "🔌 Connected to real-time notifications" in console
3. Be able to navigate all pages without auth errors
4. See real-time updates when socketIO connection works

If you still see errors → Collect:
- Screenshot of console (F12)
- Backend terminal output
- Network tab request/response headers
- Tell us which page is failing
