# ⚡ 60-SECOND STARTUP - Do This NOW

## Copy-Paste These Commands (One at a time)

### Terminal 1: Backend
```bash
cd C:\Users\HP\OneDrive\Desktop\erp-project\server
npm run dev
```

**WAIT FOR:**
```
✓ Connected to MongoDB
✓ Server running on port: 5000
```

### Terminal 2: Frontend  
```bash
cd C:\Users\HP\OneDrive\Desktop\erp-project\erp-dashboard
npm run dev
```

**WAIT FOR:**
```
VITE v5...

➜  Local:   http://localhost:5173/
```

### Browser
```
1. Go to: http://localhost:5173
2. Login: admin@gmail.com + password
3. Wait 2 seconds
4. Click: Sidebar → Policy Center
5. Press: F12 → Console tab
6. Look for: ✅ "🔌 Connected to real-time notifications"
   OR: ❌ error message
```

---

## ✅ Success = You Should See:

- [ ] Policy page shows content (not 403 error)
- [ ] Console shows: "🔌 Connected to real-time notifications"
- [ ] No red errors in console
- [ ] Can click "Edit Policy" button (as admin)

---

## ❌ If You See Errors:

### Error 1: "WebSocket connection error: Authentication error"
```
→ Problem: Token not sent
→ Fix: 
   1. F12 → Console
   2. Paste: localStorage.clear()
   3. Refresh page
   4. Login again
   5. Wait 2 seconds
   6. Try Policy page again
```

### Error 2: "403 Forbidden"
```
→ Problem: Not admin user
→ Check: Are you logged in as admin@gmail.com?
→ If yes: Check user role in database
→ Email: Have admin create your account
```

### Error 3: "Cannot GET /api/policy/company-policy"
```
→ Problem: Backend not running
→ Fix:
   1. Open Terminal 1
   2. Press Ctrl+C
   3. Run: npm run dev
   4. Wait 5 seconds
   5. Refresh browser
```

---

## 🔧 Nuclear Option (If Still Broken)

```bash
# Stop everything
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear everything
cd C:\Users\HP\OneDrive\Desktop\erp-project

# Reinstall backend
cd server
rm -r node_modules
npm install
npm run dev

# (In another terminal)
# Reinstall frontend
cd ..\erp-dashboard
rm -r node_modules
npm install
npm run dev

# Then follow browser steps above
```

---

## 📖 Full Guides Available:

- `COMPLETE_ERROR_FIX.md` - Detailed step-by-step
- `TROUBLESHOOTING_CHECKLIST.md` - Debug everything
- `FIX_ALL_ERRORS.js` - Node script with tests
- `START_SERVERS.ps1` - Launch both servers

---

**🎉 Current Status: Everything is configured correctly. Just need servers running + login!**
