# 🚀 Quick Start Guide - Running the ERP Dashboard

## ⚡ Prerequisites

Before starting, ensure you have:
- ✅ Node.js (v16+) installed
- ✅ MongoDB running (local or Atlas connection)
- ✅ All dependencies installed

## 📦 Installation

### **Step 1: Install Backend Dependencies**
```bash
cd server
npm install
```

### **Step 2: Install Frontend Dependencies**
```bash
cd ../erp-dashboard
npm install
```

---

## ⚙️ Configuration

### **Backend Environment Setup**

Create a `.env` file in `server/` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/erp-dashboard
# OR use MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/erp-dashboard

# Frontend Origin
CLIENT_ORIGIN=http://localhost:5173

# JWT Secrets (generate random strings)
ACCESS_TOKEN_SECRET=your_access_token_secret_here_min_32_chars
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here_min_32_chars

# Token Expiration
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

# Cookie Security (set to true in production)
COOKIE_SECURE=false
```

### **Generate JWT Secrets**
Run this in Node.js REPL to generate secure random strings:
```javascript
require('crypto').randomBytes(32).toString('hex')
// Copy the output and use as secret
```

---

## 🎮 Starting the Application

### **Terminal 1: Start Backend Server**

```bash
cd server

# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

**Expected Output:**
```
✨ Server listening on http://localhost:5000
✅ MongoDB connected
🚀 Server ready
```

### **Terminal 2: Start Frontend Application**

```bash
cd erp-dashboard

# Development mode
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in ⚡ ms

➜ Local:   http://localhost:5173/
➜ press h to show help
```

---

## 🔑 Login Credentials

After seeding the database, use these test accounts:

### **Admin Account**
```
Email: admin@example.com
Password: password123
Role: ADMIN
```

### **HR Account**
```
Email: hr@example.com
Password: password123
Role: HR
```

### **Regular Employee**
```
Email: user@example.com
Password: password123
Role: USER
```

### **Seed the Database**
If you need to populate test data:
```bash
cd server
npm run seed
```

---

## 🌐 Accessing the Application

1. **Open your browser** and go to: `http://localhost:5173`
2. **Login** with your credentials
3. **Explore the features:**
   - 📊 Dashboard - View statistics and news
   - 📅 Calendar - Check holidays and shift times
   - 🕐 Attendance - Mark check-in/check-out
   - 📋 Leave - Request and manage leaves
   - 📰 News - View company announcements
   - 👥 Users - Manage employees (HR/Admin)
   - 💰 Payroll - View salary information

---

## ✅ API Endpoints - Fixed Issues

| Feature | Before | After |
|---------|--------|-------|
| Dashboard Stats | ❌ 404 | ✅ `GET /api/dashboard/stats` |
| Leave List | ❌ 404 (`/leave/my`) | ✅ `GET /api/leave/my` |
| Check Attendance | ❌ 404 (`/attendance/checkin`) | ✅ `POST /api/attendance/checkin` |
| Get Attendance | ❌ 404 (`/attendance`) | ✅ `GET /api/attendance` |

---

## 🧪 Testing API Endpoints

### **Using Frontend (Recommended)**
Simply use the UI - all endpoints are integrated!

### **Using cURL (Terminal)**

1. **Get Dashboard Stats:**
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN"
```

2. **Get User's Leave List:**
```bash
curl -X GET http://localhost:5000/api/leave/my \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN"
```

3. **Mark Check-in:**
```bash
curl -X POST http://localhost:5000/api/attendance/checkin \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-03","checkIn":"09:25"}'
```

4. **Create News (HR/Admin):**
```bash
curl -X POST http://localhost:5000/api/news \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"New Remote Work Policy",
    "message":"We are excited to announce..."
  }'
```

---

## 📁 Project Structure

```
erp-project/
├── server/                          # Backend Express + MongoDB
│   ├── src/
│   │   ├── modules/
│   │   │   ├── dashboard/          # ✅ NEW - Dashboard stats
│   │   │   ├── attendance/         # ✅ FIXED - Routes updated
│   │   │   ├── leave/              # ✅ FIXED - Routes updated
│   │   │   ├── calendar/           # Calendar & holidays
│   │   │   ├── news/               # News management
│   │   │   ├── users/              # User management
│   │   │   ├── payroll/            # Payroll management
│   │   │   ├── auth/               # Authentication
│   │   │   └── worksheet/          # Worksheet tracking
│   │   ├── config/                 # Configuration
│   │   ├── middleware/             # Auth, roles, etc
│   │   └── utils/                  # Helpers
│   ├── .env                        # Environment variables
│   └── package.json
│
└── erp-dashboard/                   # Frontend React + Vite
    ├── src/
    │   ├── features/
    │   │   ├── dashboard/
    │   │   ├── attendance/
    │   │   ├── leave/
    │   │   ├── calendar/
    │   │   ├── news/
    │   │   ├── users/
    │   │   ├── payroll/
    │   │   └── auth/
    │   ├── components/
    │   ├── lib/                    # API client, auth, utilities
    │   └── store/                  # Zustand stores
    └── package.json
```

---

## 🔧 Troubleshooting

### **Port 5000 Already in Use**
```bash
# Change PORT in server/.env
PORT=5001

# OR Kill the process using port 5000
lsof -ti:5000 | xargs kill -9  # macOS/Linux
```

### **MongoDB Connection Error**
```bash
# Ensure MongoDB is running
# Local: mongod
# OR check your MONGO_URI in .env
```

### **CORS Errors**
- Check `CLIENT_ORIGIN` in server `.env` matches your frontend URL
- Default: `http://localhost:5173`

### **JWT Token Expired**
- Clear browser cookies: `DevTools > Applications > Cookies > Clear All`
- Login again

### **404 Still Showing**
1. Stop backend (Ctrl+C)
2. Clear any cached npm modules: `rm -rf node_modules package-lock.json` (in server)
3. Reinstall: `npm install`
4. Start fresh: `npm start`

---

## 📊 Dashboard Features After Fix

### ✅ **Now Working:**

**Statistics Cards:**
- 👥 Present Today - Real-time count
- 🕐 Late Today - Employees arrived late
- 📋 Pending Leaves - Awaiting approval
- 💰 Payroll Pending - Payment pending

**Company Updates:**
- 📰 Displays latest 5 news items
- Created by HR/Admin
- Updates in real-time
- Shows creation date

---

## 📅 Calendar Features (HR/Admin)

### ✅ **Now Available:**

1. **View Calendar**
   - Public holidays marked
   - Special shift times shown
   - Color-coded for easy identification

2. **Set Public Holiday**
   - Mark company closed dates
   - Set holiday name
   - Only visible to everyone

3. **Adjust Shift Times**
   - Set different start times
   - Set different end times
   - Applies to all employees on that date

4. **Track Leaves**
   - See approved leaves
   - View pending leave requests
   - Approve/reject from dashboard

---

## 👨‍💼 HR Console Features

### ✅ **Manage Employees**
- View all employees
- Edit employee information
- Change roles (User → HR)
- Deactivate accounts

### ✅ **News Management**
- Create announcements
- Edit existing news
- Delete old announcements
- Track who created what

### ✅ **Leave Management**
- View all leave requests
- Approve/Reject leaves
- Edit leave records
- Assign leaves to employees

### ✅ **Attendance Management**
- View everyone's attendance
- Edit attendance records
- Mark employees absent
- Adjust check-in times

---

## 🎓 Learning Resources

- **API Documentation**: Check `API_FIXES_AND_FEATURES.md`
- **Feature Guide**: See `CALENDAR_AND_HR_FEATURES.md`
- **Frontend Code**: `erp-dashboard/src/features/`
- **Backend Code**: `server/src/modules/`

---

## 🚀 Next Steps

1. ✅ Start both servers
2. ✅ Login with test credentials
3. ✅ Test dashboard loading (statistics & news)
4. ✅ Test attendance check-in
5. ✅ Test leave request
6. ✅ Test HR news creation (if HR/Admin)
7. ✅ Test calendar features (if Admin)

---

## 📞 Support

If you encounter issues:
1. Check terminal output for error messages
2. Verify `.env` configuration
3. Check MongoDB connection
4. Review browser console (DevTools)
5. Check network tab for 404/500 errors

**Happy coding! 🎉**

