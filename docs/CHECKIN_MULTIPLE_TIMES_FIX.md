# Check-In/Check-Out Only Works Once - TROUBLESHOOTING

## Problem Description
The attendance check-in and check-out functions work only once after a successful login. Subsequent attempts fail with a 401 Unauthorized error.

## Root Causes

### 1. **Token Expiration** (Most Common)
- **Access Token**: Set to expire after 15 minutes (`ACCESS_TOKEN_EXPIRES: "15m"`)
- **Issue**: After 15 minutes, any request will get a 401
- **Why it seems like "once"**: Enough time passes between first and second checkin request
- **Solution**: The refresh token mechanism should automatically refresh the token

### 2. **Token Refresh Not Working** (Most Likely Issue)
- **Symptom**: 401 on second request within 15 minutes
- **Causes**:
  - Refresh token cookie not being sent by frontend
  - Refresh endpoint not returning proper response
  - Token refresh failing silently

### 3. **Session/Cookie Issues**
- **CORS blocking cookies**
- **HttpOnly cookie not being sent with requests**
- **Refresh token being cleared after login**

---

## 🔧 How to Fix

### Step 1: Restart Backend to Apply Fixes
The backend code has been updated with better logging and user object return:

```powershell
# Kill existing backend (if running)
cd server
npm start
```

### Step 2: Restart Frontend Build
The frontend code has been updated with improved token refresh logic:

```bash
# In a new terminal
cd erp-dashboard
npm run dev
```

### Step 3: Test the Workflow

**Option A: Using Diagnostic Script (Recommended)**
```bash
node scripts/test-checkin-workflow.js
```

**Watch for output:**
```
✅ Login - Successfully logged in
✅ Check-in - Successfully checked in
✅ Check-out - Successfully checked out
✅ Verify - Found today's attendance record
✅ Second Check-in - Second check-in successful
```

If you see ❌ or ⚠️, see the "Diagnostic Output Guide" section below.

**Option B: Manual Testing**
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Open http://localhost:5174 (or 5173)
3. Login with admin@gmail.com / password
4. Open DevTools (F12) → Console tab
5. Click "Check In" → Watch for console logs
6. Click "Check Out" → Watch for console logs
7. Try "Check In" again → Should work

---

## 📋 Diagnostic Output Guide

### Expected Console Logs (DevTools → Console)

**First Check-In:**
```
📍 Attempting check-in...
✅ Check-in successful: {...}
```

**Second Check-Out:**
```
🔚 Attempting check-out...
✅ Check-out successful: {...}
```

**After 15 minutes, if token expired:**
```
🔄 Attempting token refresh...
✅ Token refreshed successfully
🔚 Attempting check-out...
✅ Check-out successful: {...}
```

---

### Error Scenarios

#### ❌ "No refresh token in cookies"
**Meaning:** Refresh token cookie was not sent
**Fix:**
1. Check backend logs for cookie validation
2. Ensure CORS has `credentials: true`
3. Ensure frontend sends `withCredentials: true`

#### ❌ "Token refresh failed"
**Meaning:** Refresh endpoint threw an error
**Fix:**
1. Check if `.env` has `REFRESH_TOKEN_SECRET` set
2. Verify refresh token hasn't been cleared
3. Check if user was logged out in another tab

#### ❌ "401 Unauthorized" on check-out
**Meaning:**   is invalid after first request
**Fix:**
1. Restart both backend and frontend
2. Clear browser cookies: DevTools → Application → Cookies → Delete all
3. Login fresh
4. Try again

---

## 🔍 Browser DevTools Inspection

### Check Token in LocalStorage
```javascript
// In Console tab:
JSON.parse(localStorage.getItem('erp_auth'))

// Expected output:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "...",
  "user": { "id": "...", "role": "USER", ... }
}
```

### Check Network Request Headers
1. Open DevTools → Network tab
2. Click "Check In"
3. Find request to `POST /api/attendance/checkin`
4. Click on it, go to "Headers" tab
5. Look for: `Authorization: Bearer eyJhbGc...`

**If Authorization header is missing** → API interceptor is broken

---

## 🐛 Common Issues & Solutions

### Issue: Getting 401 immediately after login

**Solution:**
```javascript
// In Console, verify token exists:
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log(auth?.accessToken ? "✅ Token exists" : "❌ No token");

// If no token, logout and login again
```

### Issue: Token works first time, fails second time

**Solution:** This typically means token refresh is failing. Check:

1. **Backend refresh endpoint is working:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/refresh \
     -H "Cookie: refreshToken=..." \
     -H "Content-Type: application/json"
   ```

2. **Refresh token cookie exists:**
   ```javascript
   // In Console:
   document.cookie  // Look for "refreshToken=..."
   ```

3. **CORS is allowing credentials:**
   Check DevTools → Network → Any request → Headers → Look for:
   ```
   Access-Control-Allow-Credentials: true
   ```

### Issue: Browser console shows "CORS error"

**Solution:** Backend CORS needs to allow credentials:
- Ensure `corsOptions` has `credentials: true`
- Ensure `CLIENT_ORIGIN` env var is set correctly
- Ensure frontend sends `withCredentials: true`

---

## 📝 File Changes Made

### Backend Updates

**`server/src/modules/auth/auth.service.js`**
- Now returns `user` object with `accessToken` from refresh endpoint
- Helps frontend maintain session data after token refresh

**`server/src/modules/auth/auth.controller.js`**
- Added validation that refresh token exists in cookies
- Added console logging for debugging

### Frontend Updates

**`erp-dashboard/src/lib/api.js`**
- Improved token refresh error handling
- Added console logs for debugging
- Better handling of refreshed user object

**`erp-dashboard/src/features/attendance/AttendancePage.jsx`**
- Added console logs for each check-in/out attempt
- Better error logging

---

## ✅ Verification Checklist

After making fixes, verify:

- [ ] Backend restarted with `npm start`
- [ ] Frontend restarted with `npm run dev`
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] Page refreshed (F5)
- [ ] Logged out and logged back in
- [ ] First check-in works
- [ ] Check-out works
- [ ] Can check-in again (on same day)
- [ ] DevTools console shows ✅ messages

---

## 🧪 Run the Test Script

Final verification - run the automated test:

```bash
node scripts/test-checkin-workflow.js
```

Expected output:
```
✅ Login
✅ Check-in
✅ Check-out
✅ Verify
✅ Second Check-in

🎉 ALL TESTS PASSED!
```

---

## 📞 Still Having Issues?

If problems persist after applying these fixes:

1. **Check backend logs** for error messages
2. **Check browser console** for stack traces
3. **Run the diagnostic script:** `node scripts/test-checkin-workflow.js`
4. **Review:** [docs/QUICK_FIX_401.md](../docs/QUICK_FIX_401.md)
5. **Check:** [docs/TROUBLESHOOTING_CHECKLIST.md](../docs/TROUBLESHOOTING_CHECKLIST.md)

---

**Last Updated:** March 2026
