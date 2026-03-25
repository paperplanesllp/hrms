# 🔧 Scripts Reference

This folder contains all utility and testing scripts for the ERP project.

## 📋 Available Scripts

### Testing & Diagnostics

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-api.js` | Basic API endpoint testing | `node test-api.js` |
| `test-endpoints.js` | Comprehensive endpoint test suite | `node test-endpoints.js` |
| `test-news.js` | News feature testing | `node test-news.js` |
| `test-news-full.js` | Full news feature test | `node test-news-full.js` |
| `test-news-fixed.js` | Fixed news tests | `node test-news-fixed.js` |
| `test-hr-edit.js` | HR editing functionality tests | `node test-hr-edit.js` |
| `test-forgot-password.js` | Password recovery testing | `node test-forgot-password.js` |
| `DIAGNOSE_401.js` | Diagnose 401 authentication issues | `node DIAGNOSE_401.js` |
| `WEBSOCKET_DIAGNOSTIC_CONSOLE.js` | WebSocket diagnostics | `node WEBSOCKET_DIAGNOSTIC_CONSOLE.js` |
| `check-server.js` | Check if servers are running | `node check-server.js` |

### Error Fixing

| Script | Purpose | Usage |
|--------|---------|-------|
| `FIX_ALL_ERRORS.js` | Automatic error fixing utility | `node FIX_ALL_ERRORS.js` |

### Server Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `START_SERVERS.ps1` | **Windows only**: Start all servers | `./START_SERVERS.ps1` |

---

## 🚀 Quick Start

### Run Backend
```bash
cd server
npm start
```

### Run Frontend
```bash
cd erp-dashboard
npm run dev
```

### Run All Servers (Windows PowerShell)
```powershell
# From project root
cd scripts
./START_SERVERS.ps1
```

---

## 🧪 Testing Examples

### Test All Endpoints
```bash
node scripts/test-endpoints.js
```

### Check Authentication Issues
```bash
node scripts/DIAGNOSE_401.js
```

### Test News Feature
```bash
node scripts/test-news.js
```

### Check Server Status
```bash
node scripts/check-server.js
```

### Test HR Features
```bash
node scripts/test-hr-edit.js
```

---

## 🔍 Diagnostic Steps

1. **Check servers are running:**
   ```bash
   node scripts/check-server.js
   ```

2. **Diagnose auth issues:**
   ```bash
   node scripts/DIAGNOSE_401.js
   ```

3. **Test WebSocket connections:**
   ```bash
   node scripts/WEBSOCKET_DIAGNOSTIC_CONSOLE.js
   ```

4. **Test API endpoints:**
   ```bash
   node scripts/test-endpoints.js
   ```

---

## 💡 Troubleshooting

**Scripts won't run:**
- Make sure Node.js is installed: `node --version`
- Navigate to project root first
- Check that `npm install` has been run in `server/` and `erp-dashboard/`

**Tests are failing:**
- Ensure servers are running (backend on port 5000, frontend on 5174)
- Check authentication with `test-forgot-password.js` first
- Review server logs for more details

**WebSocket issues:**
- Run WEBSOCKET_DIAGNOSTIC_CONSOLE.js for detailed diagnostics
- Check if you're logged in
- Verify backend socket server is running

---

## 📚 Related Documentation

- Troubleshooting: `../docs/TROUBLESHOOTING_CHECKLIST.md`
- 401 Errors: `../docs/QUICK_FIX_401.md`
- WebSocket: `../docs/WEBSOCKET_FIX_GUIDE.md`
- All Docs: `../docs/INDEX.md`

---

**Generated:** March 2026
