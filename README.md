# ERP Project - Enterprise Resource Planning System

## 📁 Project Structure

```
erp-project/
├── erp-dashboard/          # Frontend React application
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/                 # Backend Node.js/Express server
│   ├── src/
│   └── package.json
│
├── docs/                   # 📚 All documentation (44 files)
│   ├── 01-Quick-Start/
│   ├── 02-Features/
│   ├── 03-API-Fixes/
│   ├── 04-Troubleshooting/
│   └── INDEX.md           # Full documentation index
│
├── scripts/                # 🔧 Utility & test scripts
│   ├── test-*.js          # API testing
│   ├── FIX_ALL_ERRORS.js  # Error fixing scripts
│   └── START_SERVERS.ps1  # Server startup
│
├── assets/
│   └── html-templates/    # 🎨 HTML UI templates
│
└── README.md              # THIS FILE
```

## 🚀 Quick Start

### Install Dependencies
```bash
# Frontend
cd erp-dashboard
npm install

# Backend
cd ../server
npm install
```

### Run Servers (Windows)
```powershell
# Using PowerShell
cd scripts/
./START_SERVERS.ps1

# OR manually:
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
cd erp-dashboard && npm run dev
```

### Login Credentials
- **Email:** admin@gmail.com
- **Password:** password

## 📚 Documentation

All documentation has been organized in the `docs/` folder. 

**→ [START HERE: Documentation Index](docs/INDEX.md)**

### Key Documentation:
- 🟢 [Getting Started Guide](docs/GETTING_STARTED_GUIDE.md)
- 🔧 [Troubleshooting Guide](docs/TROUBLESHOOTING_CHECKLIST.md)
- 🔐 [401 Unauthorized Fix](docs/QUICK_FIX_401.md)
- 💬 [Group Chat Implementation](docs/GROUP_CHAT_QUICKSTART.md)
- 🔌 [WebSocket Setup](docs/WEBSOCKET_FIX_GUIDE.md)
- 📊 [Calendar System](docs/CALENDAR_SETUP.md)
- 👥 [HR Team Features](docs/HR_TEAM_QUICK_START.md)

## 🔧 Scripts

All utility and test scripts are in the `scripts/` folder:

- `test-api.js` - Test API endpoints
- `test-endpoints.js` - Comprehensive endpoint testing
- `test-news.js` - News feature testing
- `FIX_ALL_ERRORS.js` - Auto-fix common errors
- `DIAGNOSE_401.js` - Diagnose authentication issues
- `START_SERVERS.ps1` - Start all servers

## 📱 Features

- ✅ User Authentication & JWT
- ✅ Real-time Chat (Group & Direct)
- ✅ Attendance Calendar
- ✅ HR Management
- ✅ News & Updates
- ✅ Real-time User Status
- ✅ WebSocket Support
- ✅ Admin God View

## 🛠️ Technology Stack

**Frontend:** React, Tailwind CSS, Vite, Redux
**Backend:** Node.js, Express, MongoDB, Socket.io
**Authentication:** JWT, Bcrypt

## 📝 Common Tasks

### Fix 401 Error
```bash
1. Check if logged in: Open DevTools > Console
2. Type: JSON.parse(localStorage.getItem('erp_auth'))
3. If null → Click Login with admin@gmail.com
4. Refresh page → Error should be fixed
```
See: [docs/QUICK_FIX_401.md](docs/QUICK_FIX_401.md)

### Diagnose WebSocket Issues
```bash
node scripts/DIAGNOSE_401.js
```
See: [docs/WEBSOCKET_FIX_GUIDE.md](docs/WEBSOCKET_FIX_GUIDE.md)

### Run All Tests
```bash
node scripts/test-api.js
node scripts/test-endpoints.js
```

## 🐛 Troubleshooting

**Problem:** Getting 401 errors
- **Solution:** See [docs/QUICK_FIX_401.md](docs/QUICK_FIX_401.md)

**Problem:** WebSocket not connecting
- **Solution:** See [docs/WEBSOCKET_FIX_GUIDE.md](docs/WEBSOCKET_FIX_GUIDE.md)

**Problem:** Calendar not loading
- **Solution:** See [docs/CALENDAR_SETUP.md](docs/CALENDAR_SETUP.md)

**More:** [Complete Troubleshooting](docs/TROUBLESHOOTING_CHECKLIST.md)

## 📞 Support

For issues, check the documentation first:
1. 📚 [Documentation Index](docs/INDEX.md)
2. 🔍 [Troubleshooting Guide](docs/TROUBLESHOOTING_CHECKLIST.md)
3. ⚙️ Run diagnostic scripts in `scripts/` folder

---

**Last Updated:** March 2026
