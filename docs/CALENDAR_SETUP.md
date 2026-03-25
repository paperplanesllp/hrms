# 🚀 Color-Coded Attendance Calendar - Quick Setup Guide

## Implementation Summary

Your ERP dashboard now includes a fully functional **color-coded attendance calendar** system. Here's what was built:

---

## What Was Built

### Backend (3 files updated)

#### 1. `calendar.service.js` ✅
- **New Function:** `getMonthlyAttendanceStatus(userId, year, month)`
- **Purpose:** Queries Attendance & Leave collections, returns color-coded dates
- **Logic:**
  - 🔴 RED (ABSENT): Leave approved OR Attendance status is LATE/ABSENT
  - 🟢 GREEN (PRESENT): Attendance status is PRESENT
  - ⚪ WHITE: No data

#### 2. `calendar.controller.js` ✅
- **New Endpoint:** `GET /api/calendar/monthly?year=2025&month=2`
- **Response:** `{ year, month, userId, data: [ {date, status} ] }`
- **Auth:** Required (JWT)

#### 3. `calendar.routes.js` ✅
- **New Route:** `router.get("/monthly", requireAuth, getMonthlyAttendance);`
- **Order:** Placed BEFORE legacy endpoints for routing priority

### Frontend (1 file completely rewritten)

#### `CalendarPage.jsx` ✅
- Modern premium SaaS design (matching DESIGN_SYSTEM.md)
- **Features:**
  - 📊 4 stat cards (Present, Absent, Total, Attendance %)
  - 📅 Interactive calendar grid with color coding
  - ⬅️ ➡️ Month navigation + "Today" button
  - 🟢 Green tiles for PRESENT days
  - 🔴 Red tiles for ABSENT days
  - 📖 Legend card explaining colors
- **Data Flow:**
  - On mount/date change → `loadMonthlyAttendance()`
  - Calls `GET /api/calendar/monthly?year=X&month=Y`
  - Creates `statusMap` for O(1) lookups
  - Renders tiles with appropriate colors

---

## Quick Verification Checklist

### Backend Verification

```bash
# 1. Check service function exists and is exported
grep -n "export async function getMonthlyAttendanceStatus" server/src/modules/calendar/calendar.service.js

# 2. Check controller imports and exports function
grep -n "getMonthlyAttendance" server/src/modules/calendar/calendar.controller.js

# 3. Check route is registered
grep -n "/monthly" server/src/modules/calendar/calendar.routes.js

# 4. Check User model has role field
grep -n "role" server/src/modules/users/User.model.js

# 5. Check Attendance model has status field
grep -n "status" server/src/modules/attendance/Attendance.model.js

# 6. Check Leave model has status field
grep -n "status" server/src/modules/leave/Leave.model.js
```

### Frontend Verification

```bash
# 1. Check CalendarPage.jsx has loadMonthlyAttendance function
grep -n "loadMonthlyAttendance" erp-dashboard/src/features/calendar/CalendarPage.jsx

# 2. Check API call endpoint
grep -n "/calendar/monthly" erp-dashboard/src/features/calendar/CalendarPage.jsx

# 3. Check color styling for PRESENT/ABSENT
grep -n "bg-green-50\|bg-red-50" erp-dashboard/src/features/calendar/CalendarPage.jsx

# 4. Check Spinner import
grep -n "import.*Spinner" erp-dashboard/src/features/calendar/CalendarPage.jsx

# 5. Check PageTitle with icon
grep -n "icon={Calendar}" erp-dashboard/src/features/calendar/CalendarPage.jsx
```

---

## Testing the System

### 1. Test Attendance Records (Backend)

Create test data in MongoDB:

```javascript
// Insert attendance record - PRESENT
db.attendances.insertOne({
  userId: ObjectId("user_id_here"),
  date: "2025-03-15",
  checkIn: "09:20",
  checkOut: "18:40",
  status: "PRESENT",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert attendance record - ABSENT
db.attendances.insertOne({
  userId: ObjectId("user_id_here"),
  date: "2025-03-16",
  status: "ABSENT",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert approved leave
db.leaves.insertOne({
  userId: ObjectId("user_id_here"),
  fromDate: "2025-03-17",
  toDate: "2025-03-19",
  reason: "Vacation",
  status: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### 2. Test API Endpoint

```bash
# Get current month attendance
curl -X GET "http://localhost:5000/api/calendar/monthly" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get specific month (March 2025)
curl -X GET "http://localhost:5000/api/calendar/monthly?year=2025&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
{
  "year": 2025,
  "month": 2,
  "userId": "507f1f77bcf86cd799439011",
  "data": [
    { "date": "2025-03-15", "status": "PRESENT" },
    { "date": "2025-03-16", "status": "ABSENT" },
    { "date": "2025-03-17", "status": "ABSENT" },
    { "date": "2025-03-18", "status": "ABSENT" },
    { "date": "2025-03-19", "status": "ABSENT" }
  ]
}
```

### 3. Test Frontend UI

1. **Start the app:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend
   cd erp-dashboard && npm run dev
   ```

2. **Login to dashboard**
   - Navigate to `http://localhost:5173`
   - Log in with test credentials

3. **Visit Calendar page**
   - Click "Calendar" in sidebar
   - Should see color-coded calendar for current month

4. **Test interactions:**
   - ⬅️ Click previous month (should load new data)
   - ➡️ Click next month (should load new data)
   - 📍 Click "Today" (should jump to current month)
   - 🖱️ Click dates (should highlight)

5. **Verify colors:**
   - Present dates: 🟢 Light green with green border
   - Absent dates: 🔴 Light red with red border
   - No data dates: ⚪ Light blue/gray

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CalendarPage.jsx                         │
│  • State: viewDate, attendanceData, loading                 │
│  • Effect: Load data when viewDate changes                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            api.get("/calendar/monthly")                     │
│  • Query params: year, month                                │
│  • Auth header: Bearer token                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Backend Route Handler                             │
│  GET /api/calendar/monthly                                  │
│  • requireAuth middleware validates JWT                     │
│  • Extracts year, month from query params                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        calendar.controller.js                               │
│  getMonthlyAttendance(req, res)                             │
│  • Gets userId from req.user.id                             │
│  • Calls service function                                   │
│  • Returns JSON response                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        calendar.service.js                                  │
│  getMonthlyAttendanceStatus(userId, year, month)            │
│  • Query: Attendance.find({ userId, date range })          │
│  • Query: Leave.find({ userId, approved, date range })     │
│  • Merge logic: Build status map                           │
│  • Return: Array of { date, status }                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Database                                             │
│  ├── Attendance Collection                                  │
│  │   - Query by userId, date range                         │
│  │   - Get status values                                    │
│  │                                                          │
│  └── Leave Collection                                       │
│      - Query by userId, approved status                    │
│      - Get leave date ranges                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (Response bubbles back)
┌─────────────────────────────────────────────────────────────┐
│            CalendarPage.jsx                                 │
│  • setAttendanceData() with results                         │
│  • Build statusMap for O(1) lookups                         │
│  • Render calendar tiles with colors                        │
│  • Display stats (Present, Absent, Total, %)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Status Legend

### Attendance Status Values (from Attendance.model.js)

| Value   | Meaning           | Calendar Color |
|---------|-------------------|----------------|
| PRESENT | Checked in timely | 🟢 Green       |
| LATE    | Checked in late   | 🔴 Red         |
| ABSENT  | No check in       | 🔴 Red         |
| LEAVE   | On leave          | 🔴 Red         |

### Leave Status Values (from Leave.model.js)

| Value    | Meaning                      | Used in Calendar? |
|----------|------------------------------|-------------------|
| PENDING  | Waiting for approval         | ❌ No            |
| APPROVED | Accepted (shows as ABSENT)   | ✅ Yes           |
| REJECTED | Denied                       | ❌ No            |

---

## Common Issues & Solutions

### Issue 1: Calendar shows all white/no data

**Cause:** No attendance records in database

**Solution:**
1. Create test attendance records (see Testing section)
2. Verify user ID matches logged-in user: `echo $JWT | jq` (decode JWT)
3. Check backend logs: `npm run dev` should show `📅 GET Monthly Attendance...`

### Issue 2: API returns empty array

**Cause:** Query parameters wrong or backend error

**Solution:**
1. Verify API call: Check browser DevTools → Network
2. Verify date format: Should be YYYY-MM-DD
3. Check server logs for errors
4. Test with curl: `curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/calendar/monthly`

### Issue 3: Leave dates don't show red

**Cause:** Leave status isn't "APPROVED"

**Solution:**
1. Check Leave collection: `db.leaves.find()`
2. Verify status field: `status: "APPROVED"`
3. Check date range: fromDate ≤ today ≤ toDate

### Issue 4: Attendance records don't show color

**Cause:** Status field missing or wrong value

**Solution:**
1. Check Attendance records: `db.attendances.find()`
2. Verify status is one of: PRESENT, LATE, ABSENT, LEAVE
3. Verify date format matches: YYYY-MM-DD string

---

## Manual Testing Checklist

- [ ] Backend runs without errors: `npm run dev` from `server/` folder
- [ ] Frontend runs without errors: `npm run dev` from `erp-dashboard/` folder
- [ ] Can log in to dashboard
- [ ] Can navigate to Calendar page
- [ ] Calendar displays for current month
- [ ] Stats cards show numbers (even if zero)
- [ ] Can click Previous/Next month
- [ ] Can click "Today" button
- [ ] Previous months with data show colors
- [ ] Green tiles display for PRESENT dates
- [ ] Red tiles display for ABSENT dates
- [ ] Legend card is visible and readable

---

## Deployment Checklist

Before deploying to production:

- [ ] All database indices are created (see CALENDAR_SYSTEM.md)
- [ ] Attendance records exist for current month
- [ ] Leave records have APPROVED status
- [ ] JWT token includes `id` field (not `userId`)
- [ ] Backend API is accessible from frontend
- [ ] CORS is configured correctly
- [ ] Error handling is in place
- [ ] Environment variables are set (API_BASE_URL, etc.)

---

## Performance Tips

1. **Database Optimization**
   ```javascript
   // Add indices
   db.attendances.createIndex({ userId: 1, date: 1 }, { unique: true });
   db.leaves.createIndex({ userId: 1, fromDate: 1, toDate: 1 });
   ```

2. **Frontend Caching** (optional)
   - Store statusMap in state
   - Clear when month changes
   - Could use useEffect cleanup

3. **Backend Caching** (optional)
   - Cache monthly results for 1 hour
   - Invalidate on leave/attendance update

---

## Next Steps

1. **Test current implementation** (see Testing section)
2. **Create sample data** in MongoDB
3. **Verify colors display correctly**
4. **Deploy to production environment**
5. **Monitor for errors** (check logs)
6. **Add optional enhancements** (see CALENDAR_SYSTEM.md)

---

## Files Modified/Created

```
✅ Updated: server/src/modules/calendar/calendar.service.js
✅ Updated: server/src/modules/calendar/calendar.controller.js
✅ Updated: server/src/modules/calendar/calendar.routes.js
✅ Rewritten: erp-dashboard/src/features/calendar/CalendarPage.jsx
✅ Created: CALENDAR_SYSTEM.md (comprehensive documentation)
✅ Created: CALENDAR_SETUP.md (this file)
```

---

## Quick Command Reference

```bash
# Test API endpoint
curl -X GET "http://localhost:5000/api/calendar/monthly?year=2025&month=2" \
  -H "Authorization: Bearer JWT_TOKEN_HERE"

# View MongoDB data
mongosh
> db.attendances.find()
> db.leaves.find()

# Clear and restart
# Backend
cd server && npm run dev

# Frontend (new tab)
cd erp-dashboard && npm run dev

# View logs
# Check browser console: F12
# Check server logs: Terminal
```

---

**Status:** ✅ READY FOR TESTING
**Version:** 1.0
**Last Updated:** March 4, 2025
