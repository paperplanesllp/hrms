# ⚡ 3-MINUTE FIX FOR 401 ERRORS

## **Your Current Status**
✅ Servers ARE running  
✅ Backend on port 5000  
✅ Frontend on port 5174  
❌ You're getting 401 errors  

**Root Cause:** You're not logged in = no auth token = all API calls fail

---

## **DO THIS NOW (Takes 2 minutes)**

### **1️⃣ Open Browser to Frontend**
```
http://localhost:5174
```

### **2️⃣ Check Your Login Status**
```
Press: F12 (open DevTools)
Go to: Console tab
Paste: localStorage.getItem('erp_auth')
```

**You should see:**
- ✅ `{ accessToken: "eyJ...", user: {...} }` → You're logged in ✓
- ❌ `null` → You're NOT logged in ✗

### **3️⃣ If NOT Logged In (null)**
```
1. Click: "Login" button or go to /login
2. Enter: admin@gmail.com
3. Enter: [your password]
4. Click: "Login"
5. Wait 2 seconds for redirect
```

### **4️⃣ Refresh Page**
```
Press: F5
Wait for page to load completely
```

### **5️⃣ Verify in Console Again**
```
Paste: localStorage.getItem('erp_auth')
```

**Now should show:** Token data ✅

### **6️⃣ Check API Works**
```
Open DevTools Network tab (F12 → Network)
Click any page (Dashboard, News, Attendance)
Look for requests:
  - /api/attendance
  - /api/news
  - /api/notifications
  
They should show: 200 OK (green) ✅
NOT 401 Unauthorized (red) ❌
```

---

## **That Should Fix It!**

If 401 still appears after following above:

### **Nuclear Option:**
```javascript
// In console:
localStorage.clear()
// Refresh page
// Login again
// Try again
```

---

## **What's Happening (Technical)**

```
Page Loads
    ↓
No auth token in localStorage
    ↓
All API calls get sent WITHOUT token
    ↓
Backend: "Who are you? No token!"
    ↓
Returns: 401 Unauthorized
    ↓
API calls fail on: /api/attendance, /api/news, /api/notifications

---

Solution: Login First
    ↓
Backend verifies credentials
    ↓
Creates JWT token
    ↓
Sends token to browser: localStorage.setItem('erp_auth', '...')
    ↓
Now API interceptor adds token to every request
    ↓
All requests get sent WITH token
    ↓
Backend: "You're authenticated!"
    ↓
Returns: 200 OK + data
    ↓
Pages show data ✅
```

---

## **If Still Getting 401**

Paste this in console to debug:

```javascript
const auth = JSON.parse(localStorage.getItem('erp_auth') || '{}');
const token = auth?.accessToken;

console.log({
  'Token exists': !!token,
  'Token length': token?.length,
  'User email': auth?.user?.email,
  'User role': auth?.user?.role,
  'Token preview': token?.substring(0, 50) + '...'
});

// Manual test
fetch('http://localhost:5000/api/news', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => console.log('Status:', r.status))
.catch(e => console.error('Error:', e.message));
```

---

## **Common Issues**

| Issue | Fix |
|-------|-----|
| Page shows 401 immediately on load | Login at /login |
| 401 after being logged in for hours | Re-login (token expired) |
| Stuck on 401 even after login | Clear cache: Ctrl+Shift+R |
| Cannot find /login page | Go to: http://localhost:5174/login |
| Wrong port number (5173 vs 5174) | Both work, but try both |

---

## **Links**

- Full guide: `401_UNAUTHORIZED_FIX.md`
- Diagnostic tool: `DIAGNOSE_401.js`
- Server setup: `README_RUN_NOW.md`

---

**Status After Fix:**
```
✅ Dashboard loads
✅ Attendance data shows
✅ News displays
✅ Notifications work
✅ No 401 errors
✅ Console shows: "🔌 Connected to real-time notifications"
```

🎉 **DONE!**
