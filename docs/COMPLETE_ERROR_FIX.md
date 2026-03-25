# 🚀 COMPLETE FIX - WebSocket & 403 Forbidden Errors

## ❌ Current Issues
```
1. WebSocket connection failed: "Authentication error"
2. Policy API returns: 403 Forbidden
3. Socket.io connection failing
```

## ✅ Root Cause
**Backend server is NOT running or auth token is missing**

---

## 🔧 COMPLETE FIX (Do This Exactly)

### **STEP 1: Kill All Processes** (30 seconds)
```bash
# In PowerShell - Close all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### **STEP 2: Clear Browser** (30 seconds)
```
1. Open Browser DevTools (F12)
2. Application Tab
3. Storage → localStorage
4. Right-click → "Delete All"
5. Close browser tab completely
```

### **STEP 3: Start Backend** (Terminal 1)
```bash
cd C:\Users\HP\OneDrive\Desktop\erp-project\server
npm install
npm run dev
```

**WAIT 10 seconds for this output** (exact messages):
```
✓ Connected to MongoDB on: [connection string]
✓ Server running on port: 5000
🔌 Socket.IO initialized
```

### **STEP 4: Start Frontend** (Terminal 2)
```bash
cd C:\Users\HP\OneDrive\Desktop\erp-project\erp-dashboard
npm run dev
```

**WAIT 5 seconds for this output**:
```
  VITE v5... ready in ... ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### **STEP 5: Open Browser & Login**
1. Open `http://localhost:5173` 
2. Login with:
   - **Email:** `admin@gmail.com`
   - **Password:** (your admin password)
3. **Wait 3 seconds after successful login**

### **STEP 6: Navigate to Policy Page**
```
Click: Sidebar → Policy Center
OR: Direct URL → http://localhost:5173/policy
```

### **STEP 7: Check Console (F12)**
You should see:
```
✅ 🔌 Connected to real-time notifications
✅ Policy page loads WITHOUT errors
✅ "Edit Policy" button visible
```

---

## 🧪 If Still Getting 403

**OPTION A: Test in Browser Console**

```javascript
// Run this line by line:

// 1. Get auth
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.log('Auth:', auth);

// 2. Check token
const token = auth?.accessToken;
console.log('Token exists?', !!token);
console.log('Token:', token?.substring(0, 50) + '...');

// 3. Test API
fetch('http://localhost:5000/api/policy/company-policy', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(d => {
  console.log('✅ Success:', d);
  if (d.message) console.error('❌ Error:', d.message);
})
.catch(e => console.error('❌ Network Error:', e));
```

**OPTION B: Check Backend is Accepting Requests**

In **Backend Terminal**, you should see:
```
GET /api/policy/company-policy 200 [time]ms  ← This means SUCCESS
GET /api/policy/company-policy 403 [time]ms  ← This means AUTH FAILED
```

If you see 403 in backend logs:
- Stop backend: `Ctrl+C`
- Clear node_modules: `rm -r node_modules` or `Del /S node_modules`
- Reinstall: `npm install`
- Start: `npm run dev`

---

## ✅ SUCCESS INDICATORS

After following all steps, you should see:

### 1. **Backend Terminal**
```
✓ Connected to MongoDB
✓ Server running on port 5000
🔌 Socket.IO initialized
GET /api/policy/company-policy 200 25ms
```

### 2. **Browser Console (F12 → Console)**
```
🔌 Connected to real-time notifications
policy loaded successfully
```

### 3. **Policy Page**
- Shows policy content
- Shows "Edit Policy" button (for admin)
- NO red error messages

---

## 📋 Environment Setup

### **Frontend (.env)**
File: `erp-dashboard/.env`
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### **Backend (.env)**
File: `server/.env`
```
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
```

---

## 🔍 Detailed Debugging

### **Debug Socket.io Connection**
```javascript
// Browser console
// Open socket.io monitor by visiting:
http://localhost:5000/socket.io/?EIO=4&transport=websocket

// Should see WebSocket connection
// If error: "401 Unauthorized" → Token issue
// If error: "connect timeout" → Backend not running
```

### **Debug API Headers**
```javascript
// Browser console - Check what headers are being sent
const auth = JSON.parse(localStorage.getItem('erp_auth'));
console.table({
  'Token present': !!auth?.accessToken,
  'Token length': auth?.accessToken?.length,
  'User role': auth?.user?.role,
  'User email': auth?.user?.email
});
```

### **Debug Backend JWT**
Add logging to `server/src/utils/socket.js` (line 15):
```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  console.log('🔍 Socket Auth Attempt');
  console.log('   Token received?', !!token);
  console.log('   Token length:', token?.length);
  
  if (!token) {
    console.error('   ❌ NO TOKEN - denying connection');
    return next(new Error("Authentication error"));
  }
  // ...rest of code
});
```

---

## ⚠️ Still Not Working?

Follow this **Troubleshooting Tree**:

```
1. Is Backend Running?
   → Check Terminal 1 for "Server running on port 5000"
   → If not: npm run dev
   
2. Is Frontend Running?
   → Check Terminal 2 for "Local: http://localhost:5173"
   → If not: npm run dev

3. Are You Logged In?
   → Check localStorage: localStorage.getItem('erp_auth')
   → If null/empty: Re-login

4. Is Token Valid?
   → Run in console: JSON.parse(localStorage.getItem('erp_auth')).accessToken.length
   → Should be 300+ characters

5. Is Browser Using Correct URL?
   → Check address bar: localhost:5173 (NOT 3000 or other port)

6. Is CORS Enabled?
   → Backend logs should show CORS headers
   → If errors like "Access-Control": Check app.js cors config

7. Are Ports Available?
   → Port 5000: Backend
   → Port 5173: Frontend
   → If occupied: Kill process or use different port
```

---

## 🎯 After Everything Works

1. **Homepage loads** → ✅
2. **Can view profile** → ✅
3. **Can access policy page** → ✅
4. **Can edit policy (admin)** → ✅
5. **Socket shows "connected"** → ✅
6. **No red console errors** → ✅

Once all pass → **System is working correctly!** 🚀

---

## 📞 Still Need Help?

Collect and share:

```javascript
// Run in browser console
console.log('=== DIAGNOSTIC INFO ===');
console.log('URL:', window.location.href);
console.log('API Base:', import.meta.env.VITE_API_BASE_URL);
console.log('Auth:', JSON.parse(localStorage.getItem('erp_auth')));
console.log('Backend responding?', 'Check Terminal 1');
```

Then share:
- Screenshot of browser error
- Output from backend terminal
- Output from browser console
- Result from diagnostic info above
