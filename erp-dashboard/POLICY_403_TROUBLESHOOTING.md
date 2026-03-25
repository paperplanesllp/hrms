# Policy 403 Forbidden - Troubleshooting Guide

## Issue
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
GET /api/policy/company-policy
```

## Root Causes
1. ❌ Backend server not running on port 5000
2. ❌ Auth token missing or expired in localStorage
3. ❌ Backend auth middleware rejecting request
4. ❌ CORS configuration issue

---

## Quick Diagnostic (Browser Console)

Run this in your browser console to check auth status:

```javascript
// Check 1: Is auth data in localStorage?
const auth = JSON.parse(localStorage.getItem("erp_auth"));
console.log("Auth data:", auth);
console.log("Has token?", !!auth?.accessToken);
console.log("User role:", auth?.user?.role);

// Check 2: Make a test API call with logging
fetch("http://localhost:5000/api/policy/company-policy", {
  headers: {
    "Authorization": `Bearer ${auth?.accessToken || "NO_TOKEN"}`
  }
})
.then(r => {
  console.log("Response status:", r.status);
  return r.json();
})
.then(d => console.log("Data:", d))
.catch(e => console.error("Error:", e));
```

---

## Step-by-Step Fix

### Step 1: Verify Backend is Running
```bash
# PowerShell - Check if port 5000 is listening
netstat -ano | findstr :5000

# If no output, start backend:
cd C:\Users\HP\OneDrive\Desktop\erp-project\server
npm run dev
# Wait for: "Connected to MongoDB" + "Server running on port 5000"
```

### Step 2: Verify Backend Logs
Look for these messages in server terminal:
```
✅ Connected to MongoDB on: mongodb+srv://...
✅ Server running on port: 5000
```

If you see errors like `Cannot find module`, run:
```bash
cd server
npm install
npm run dev
```

### Step 3: Clear Auth and Re-Login
```bash
# Open browser console and run:
localStorage.clear()
location.reload()

# Then login again with admin credentials:
# email: admin@gmail.com
# password: (your password)
```

### Step 4: Check Network Request
1. Open **Browser DevTools** (F12)
2. Go to **Network** tab
3. Filter for "policy"
4. Refresh page
5. Click on `company-policy` request
6. Check:
   - **Headers**: Request headers should have `Authorization: Bearer <token>`
   - **Response**: Status should be 200, not 403

### Step 5: Check Backend Policy Route Configuration

The route should be in `server/src/modules/policy/policy.routes.js`:

```javascript
// GET endpoint - requires authentication only
router.get("/company-policy", requireAuth, getCompanyPolicyHandler);
```

This is **correct** - it doesn't require admin role, just valid auth.

---

## If Still Getting 403

### Option A: Check Backend Auth Middleware
Add logging to backend `server/src/middleware/auth.js`:

```javascript
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("❌ No token in request");
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
```

### Option B: Restart Everything Fresh
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd erp-dashboard
npm run dev

# Browser: Clear cache
Ctrl+Shift+Delete → Select "All time" → Clear
```

---

## Verification Checklist

- [ ] Backend running on port 5000
- [ ] Backend logs show "Connected to MongoDB"
- [ ] Browser console shows auth token with "Bearer" prefix
- [ ] `auth.user.role === "ADMIN"`
- [ ] Network tab shows `Authorization: Bearer <token>` header
- [ ] Policy API returns 200 with policy data
- [ ] No console errors

---

## Expected Behavior (After Fix)

1. Page loads with "Loading..." spinner
2. Policy content displays (either from API or default content)
3. Admin sees "Edit Policy" button
4. Edit button opens editor
5. Can save changes and get success toast

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid/missing token | Re-login, clear localStorage |
| `403 Forbidden` | Auth middleware failing | Check backend logs, verify JWT secret |
| `Cannot GET /api/policy/company-policy` | Backend not running | `npm run dev` in server folder |
| `CORS error` | Frontend/backend ports mismatch | Check `VITE_API_BASE_URL` env var |

---

## Backend Env Check

Verify `server/.env` has:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=5000
```

And `erp-dashboard/.env` has:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Still Stuck?

Share these from browser console:
```javascript
// 1. Auth status
console.log(JSON.parse(localStorage.getItem("erp_auth")));

// 2. API response error details
fetch("http://localhost:5000/api/policy/company-policy", {
  headers: { "Authorization": `Bearer ${JSON.parse(localStorage.getItem("erp_auth"))?.accessToken}` }
})
.then(r => r.json())
.then(d => console.log(d));
```

This will help identify the exact 403 cause.
