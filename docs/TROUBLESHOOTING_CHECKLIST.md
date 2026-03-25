# 🔍 Troubleshooting Checklist - WebSocket & 403 Errors

## ✅ Pre-Check: Are Your Servers Running?

### Backend Check (Terminal 1)
```
Port 5000 listening for requests?
Expected output:
  ✓ Connected to MongoDB
  ✓ Server running on port 5000
  🔌 Socket.IO initialized

If NOT present:
  ❌ STOP - Backend not running
  ❌ Go to: server/ folder
  ❌ Run: npm run dev
```

### Frontend Check (Terminal 2)
```
Port 5173 running?
Expected output:
  VITE v5... ready in Xms
  ➜  Local:   http://localhost:5173/

If NOT present:
  ❌ STOP - Frontend not running
  ❌ Go to: erp-dashboard/ folder
  ❌ Run: npm run dev
```

---

## 🔐 Checklist 1: Authentication Token

### 1.1 Is Token Stored in Browser?
```javascript
// Open browser (F12) → Console → Paste:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log('Auth data:', auth);
console.log('Token present?', !!auth?.accessToken);
```

**Expected Result:**
```javascript
Auth data: {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  user: { id: "...", role: "ADMIN", email: "admin@gmail.com" }
  refreshToken: "..."
}
Token present? true
```

**If you see:**
- `null` → You're not logged in ❌
  - Solution: Click "Logout" button, then Login again
- `undefined` → localStorage is empty ❌
  - Solution: Clear cookies, refresh page, login again
- Token present? false → Login was never clicked ❌
  - Solution: Click Login button with correct credentials

### 1.2 Test Token in API Call
```javascript
// In browser console:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
const token = auth?.accessToken;

fetch('http://localhost:5000/api/policy/company-policy', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Success:', d))
.catch(e => console.error('❌ Failed:', e));
```

**Expected Result:**
```javascript
✅ Success: { content: "...", lastUpdated: "...", updatedBy: "..." }
```

**If you see:**
- `❌ Failed: Error: Failed to fetch` → Backend not running
- `❌ Success: { message: "Unauthorized" }` → Token invalid
- `❌ Success: { message: "Forbidden" }` → Admin access required

---

## 🌐 Checklist 2: Network & CORS

### 2.1 Check API Base URL
```javascript
// In browser console:
console.log('API Base:', import.meta.env.VITE_API_BASE_URL);
console.log('Expected:', 'http://localhost:5000/api');
```

**Must match!** If not:
- Check file: `erp-dashboard/.env`
- Must have: `VITE_API_BASE_URL=http://localhost:5000/api`
- Restart frontend: `npm run dev`

### 2.2 Check CORS Headers
```javascript
// In browser console → Network tab:
1. Make any API call (e.g., navigate to Policy page)
2. Find the request in Network tab
3. Click the request, go to "Headers" tab
4. Look for "Response Headers":
   - ✅ access-control-allow-origin: http://localhost:5173
   - ✅ access-control-allow-credentials: true
```

If missing:
- Backend not properly configured
- Check `server/src/app.js` for CORS setup
- Should include: `credentials: true, origin: "http://localhost:5173"`

### 2.3 Ports Are Available
```bash
# PowerShell - Check if ports are free
Get-NetTCPConnection -State Listen | Select-Object LocalPort | Sort-Object LocalPort -Unique
```

**Look for:**
- If 5000 is used by different process → ❌
- If 5173 is used by different process → ❌

**Solution:**
```bash
# Kill process on port 5000
fuser -k 5000/tcp

# Or in PowerShell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
```

---

## 🔌 Checklist 3: WebSocket Connection

### 3.1 Is Socket Connecting?
```javascript
// In browser console:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for message like:
   ✅ "🔌 Connected to real-time notifications"

If you see error like:
❌ "Socket connection error: Authentication error"
```

### 3.2 Debug Socket Connection
```javascript
// In browser console:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log({
  'Step 1: Token exists?': !!auth?.accessToken,
  'Step 2: Token format valid?': auth?.accessToken?.startsWith('eyJ'),
  'Step 3: Socket created?': typeof io !== 'undefined',
  'Step 4: Connection state': socket?.connected ?? 'no socket'
});
```

**Expected:**
```
Step 1: Token exists? true
Step 2: Token format valid? true
Step 3: Socket created? true
Step 4: Connection state? true
```

### 3.3 Check Backend Socket Logs
```
Backend Terminal 1:
Look for lines like:
  ✅ 🔌 Socket.IO initialized
  ✅ Socket connected: user-123
  ✅ User came online: admin@gmail.com

If you see:
  ❌ Socket authentication failed
  ❌ User not found
→ Go to Checklist 1 (token issues)
```

---

## 🚨 Checklist 4: 403 Forbidden Errors

### 4.1 What is 403?
```
403 = User authenticated (logged in) but NOT authorized
      (doesn't have permission to access this resource)

Common causes:
- User role doesn't have access
- Admin-only endpoint, user is not admin
- Resource belongs to different user/department
```

### 4.2 Check User Role
```javascript
// In browser console:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log({
  'User role': auth?.user?.role,
  'User email': auth?.user?.email,
  'Is admin?': auth?.user?.role === 'ADMIN'
});
```

**For Policy endpoint - you MUST be:**
- ✅ ADMIN role
- ✅ Or HR role (if that's configured)

If not → Contact admin to grant permissions

### 4.3 Check What Backend Says
```
Backend Terminal 1:
Look for entries like:
  GET /api/policy/company-policy 403 15ms ← FORBIDDEN
  GET /api/policy/company-policy 200 12ms ← OK

If you see 403:
  1. User role check failed
  2. Or endpoint requires specific role
  3. Check policy.routes.js for role requirements
```

---

## 🔧 Checklist 5: Common Issues & Solutions

### Issue: "403 Forbidden"
```
Symptom: Policy page shows error "Access Denied"
Cause: User doesn't have admin role
Solution:
  1. Make sure you're logged in as admin
  2. Email: admin@gmail.com
  3. Clear localStorage: localStorage.clear()
  4. Refresh page
  5. Login again with correct credentials
```

### Issue: "WebSocket closed before connection established"
```
Symptom: Console shows WebSocket error
Cause: Auth token not available when socket initializes
Solution:
  1. Clear localStorage: localStorage.clear()
  2. Refresh page
  3. Login - wait 2 seconds after login completes
  4. Then navigate to pages
  5. Check console for "🔌 Connected"
```

### Issue: "Network Error" when API call fails
```
Symptom: Console shows fetch error
Cause: Backend not running or wrong port
Solution:
  1. Open Terminal 1
  2. Press Ctrl+C to stop
  3. Run: npm run dev
  4. Wait for: "Server running on port 5000"
  5. Refresh browser
```

### Issue: "Cannot read property 'accessToken' of null"
```
Symptom: Console shows localStorage error
Cause: Trying to access token before login
Solution:
  1. This is normal on first page load
  2. Login with credentials
  3. Wait for page to redirect
  4. Then navigate to pages
```

### Issue: Socket reconnects every few seconds
```
Symptom: Console shows repeated "Disconnected" "Connected"
Cause: Token expired or backend rejecting connection
Solution:
  1. Logout completely (clear localStorage)
  2. Close browser tab
  3. Open new tab to localhost:5173
  4. Login again
  5. Check console every 5 seconds
```

---

## 📊 Full Connection Flow (What Should Happen)

```
1. USER LOADS PAGE
   ↓
   "GET http://localhost:5173/" 
   ↓
   Checks: localStorage.getItem('erp_auth')
   ├─ If null: Show login page
   └─ If exists: Load dashboard

2. USER LOGS IN
   ↓
   POST /api/auth/login with email + password
   ↓
   Backend: Creates JWT token
   ↓
   Frontend: Saves to localStorage
   ↓
   initializeSocket() is called
   ↓
   Socket.io auth = { token: ... }

3. SOCKET INITIALIZATION
   ↓
   WebSocket connection to ws://localhost:5000
   ↓
   Sends token in handshake
   ↓
   Backend validates token ← KEY STEP
   ├─ If valid: Accept connection
   │  └─ Console: "🔌 Connected to real-time notifications"
   ├─ If invalid: Reject connection
   │  └─ Console: "Socket connection error: Authentication error"

4. POLICY PAGE LOAD
   ↓
   GET /api/policy/company-policy
   ↓
   Headers: "Authorization: Bearer xyz..."
   ↓
   Backend middleware (requireAuth):
   ├─ Checks Bearer token present ← KEY STEP
   ├─ Verifies JWT signature
   ├─ Checks user still exists in DB
   ├─ If all OK: Call handler
   │  └─ Returns policy content (200 OK)
   ├─ If token missing: Return 401 UNAUTHORIZED
   ├─ If token invalid: Return 401 UNAUTHORIZED
   └─ If user not authorized: Return 403 FORBIDDEN

5. RESULT IN BROWSER
   ├─ If 200: Policy page shows content + "Edit" button
   ├─ If 401: Page shows "Session expired, login again"
   └─ If 403: Page shows "Access Denied, need admin role"
```

---

## 🎯 Quick Debug Script

Copy and paste THIS entire block into browser console:

```javascript
console.clear();
console.log("%c=== ERP DEBUG INFO ===", "color: cyan; font-size: 16px; font-weight: bold;");

const auth = JSON.parse(localStorage.getItem('erp_auth'));

console.log("%cAUTHENTICATION:", "color: yellow; font-weight: bold;");
console.log('Token exists?', !!auth?.accessToken);
console.log('Token preview:', auth?.accessToken?.substring(0, 50) + '...');
console.log('User:', auth?.user?.email, `(${auth?.user?.role})`);

console.log("%nENVIRONMENT:", "color: yellow; font-weight: bold;");
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Current URL:', window.location.href);

console.log("%nSOCKET STATUS:", "color: yellow; font-weight: bold;");
console.log('Socket connected?', window.socket?.connected ?? 'not initialized');

// Test API
const token = auth?.accessToken;
if (!token) {
  console.error('%c❌ No token! Login first.', 'color: red; font-weight: bold;');
} else {
  console.log("\nTesting API call...");
  fetch('http://localhost:5000/api/policy/company-policy', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => {
    console.log(`API Status: ${r.status} ${r.statusText}`);
    return r.json();
  })
  .then(d => console.log('API Response:', d))
  .catch(e => console.error('API Error:', e.message));
}

console.log("%nEND DEBUG", "color: cyan;");
```

---

## 📞 Still Not Fixed?

If after checking all items above it STILL doesn't work:

**Collect this info and provide to developer:**

```javascript
// In console, run:
{
  auth: localStorage.getItem('erp_auth'),
  apiBase: import.meta.env.VITE_API_BASE_URL,
  socketConnected: window.socket?.connected,
  pageUrl: window.location.href,
  userAgent: navigator.userAgent
}
```

**Plus:**
- Screenshot of error message
- Screenshot of browser DevTools Console
- Screenshot of backend terminal output
- Steps you took before error appeared
