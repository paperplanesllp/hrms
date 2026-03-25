# ERP Dashboard - API Fixes & Feature Guide

## ✅ FIXED API Endpoint Errors

### Issue Summary
The browser console showed 404 errors for the following endpoints. These have been fixed:

| Error | Root Cause | Solution |
|-------|-----------|----------|
| `:5000/api/dashboard/stats - 404` | Missing endpoint | Created dashboard module with stats controller |
| `:5000/api/leave/my - 404` | Path mismatch (`/me` vs `/my`) | Added `/my` route alias to leave routes |
| `:5000/api/attendance - 404` | Path mismatch (`/me` vs root) | Added root GET route to attendance |
| `:5000/api/attendance/checkin - 404` | Path mismatch (`/me/mark` vs `/checkin`) | Added `/checkin` POST route to attendance |

---

## 📊 Changes Made

### 1. **Created Dashboard Module** 
**Files Created:**
- `server/src/modules/dashboard/dashboard.service.js` - Counts stats for dashboard cards
- `server/src/modules/dashboard/dashboard.controller.js` - Handles `/api/dashboard/stats` route
- `server/src/modules/dashboard/dashboard.routes.js` - Dashboard routes

**Endpoint:** `GET /api/dashboard/stats` (requires auth)
**Returns:**
```json
{
  "presentToday": 15,
  "lateToday": 3,
  "leavePending": 5,
  "payrollPending": 0
}
```

### 2. **Fixed Attendance Routes**
**Updated:** `server/src/modules/attendance/attendance.routes.js`
- ✅ Added `GET /api/attendance` (returns user's attendance records)
- ✅ Added `POST /api/attendance/checkin` (marks today's check-in)
- ✅ Kept legacy routes for backward compatibility

**Updated:** `server/src/modules/attendance/attendance.controller.js`
- Changed response format to return array directly (not wrapped in `{ rows }`)

### 3. **Fixed Leave Routes**
**Updated:** `server/src/modules/leave/leave.routes.js`
- ✅ Added `GET /api/leave/my` (user's leave requests)
- ✅ Kept `/me` for backward compatibility

**Updated:** `server/src/modules/leave/leave.controller.js`
- Changed response format to return array directly

### 4. **Registered Dashboard in App**
**Updated:** `server/src/app.js`
- Imported dashboard routes
- Registered `/api/dashboard` endpoint

---

## 📅 Calendar Feature Implementation

### **User View**: Calendar should display:
✅ **Leave Dates** - Dates user has taken leave (current system has: PENDING, APPROVED, REJECTED statuses)
✅ **Public Holidays** - Company holidays (via Calendar model)
✅ **Shift Types** - Full Shift vs Delay Shift (color-coded)

### **Current Data Model:**
```javascript
// Calendar Schema (database)
{
  date: "2026-03-15", // YYYY-MM-DD
  shiftStart: "09:30",
  shiftEnd: "18:30",
  isPublicHoliday: false,
  holidayName: ""
}

// Attendance Schema
{
  userId: ObjectId,
  date: "2026-03-15",
  checkIn: "09:20",
  checkOut: "18:40",
  shiftStart: "09:30",
  shiftEnd: "18:30",
  status: "PRESENT" // PRESENT, LATE, ABSENT, LEAVE
}

// Leave Schema
{
  userId: ObjectId,
  fromDate: "2026-03-10",
  toDate: "2026-03-12",
  status: "APPROVED" // PENDING, APPROVED, REJECTED
}
```

### **Color Coding Recommendation:**
- 🟢 **Full Shift** (09:30-18:30): Green background
- 🟡 **Delay Shift** (Custom times): Yellow background
- 🔵 **Leave Day**: Blue background
- 🔴 **Public Holiday**: Red background
- ⚫ **Weekend**: Gray background

---

## 👨‍💼 HR Features - News Management

### **Current Implementation Status:**
✅ **Create News** - `POST /api/news` (HR/Admin only)
✅ **Read News** - `GET /api/news` (all users can view)
✅ **Update News** - `PATCH /api/news/:id` (HR/Admin only)
✅ **Delete News** - `DELETE /api/news/:id` (HR/Admin only)

### **Access Control:**
- ✅ Only `ADMIN` and `HR` roles can create, update, delete news
- ✅ All authenticated users can read news
- ✅ Dashboard automatically fetches latest 5 news items

### **News Model:**
```javascript
{
  _id: ObjectId,
  createdBy: ObjectId, // User reference
  title: "Company Policy Update",
  message: "New remote work policy...",
  createdAt: "2026-03-03T10:30:00Z",
  updatedAt: "2026-03-03T10:30:00Z"
}
```

### **Types of News HR Can Share:**
- 📋 Policy Updates
- 🎉 Company Announcements
- 📢 Event Notices
- ⚠️ Important Notices
- 📅 Schedule Changes

---

## 🎯 What HR Can Do Now

### Via News Management:
1. **Create News** - Add announcements, policy updates
2. **Update News** - Modify existing announcements
3. **Delete News** - Remove outdated news
4. **View Dashboard Stats** - See attendance, leave, payroll metrics

### Via Calendar:
1. **Set Public Holidays** - Mark company holidays
2. **Adjust Shift Times** - Set different shift hours for specific dates
3. **View Employee Calendars** - See when employees are on leave

### Via Attendance:
1. **View Employee Attendance** - See who's present/late/absent
2. **Edit Attendance** - Correct attendance records
3. **Mark Leave Days** - Update attendance for leave requests

---

## 🚀 How to Test

### **Option 1: Start Backend Server**
```bash
cd server
npm install  # If dependencies not installed
npm start    # Starts on http://localhost:5000
```

### **Option 2: Start with DevTools**
```bash
cd server
npm run dev  # Runs with nodemon auto-reload
```

### **Start Frontend**
```bash
cd erp-dashboard
npm install
npm run dev  # Typically runs on http://localhost:5173
```

---

## 📱 Frontend Pages That Use Fixed Endpoints

### **Dashboard Page**
- Calls: `GET /api/dashboard/stats` ✅
- Calls: `GET /api/news?limit=5` ✅

### **Attendance Page**
- Calls: `GET /api/attendance` ✅
- Calls: `POST /api/attendance/checkin` ✅

### **Leave Management Page**
- Calls: `GET /api/leave/my` ✅
- Calls: `POST /api/leave` ✅

### **Calendar Page**
- Calls: `GET /api/calendar` ✅
- HR can update: `PUT /api/calendar` (for public holidays/shifts) ✅

---

## 📝 Notes for Development

1. All protected endpoints require authentication (JWT token in cookie)
2. HR and Admin roles have elevated permissions
3. Dates are stored in `YYYY-MM-DD` format
4. Dashboard stats update in real-time based on database records
5. News items show in reverse chronological order (newest first)

---

## ⚠️ Known Limitations

- **Payroll Stats**: Returns 0 (payroll model needs implementation)
- **Calendar detail endpoint**: Returns all events (no filtering by date range yet)
- **News limit**: Frontend requests `?limit=5`, backend doesn't implement limit yet

These can be enhanced in future iterations.

