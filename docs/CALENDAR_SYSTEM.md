# 📅 Color-Coded Attendance Calendar System

## Overview

This document describes the complete implementation of a color-coded attendance calendar system for the ERP dashboard. The system displays employee attendance status for each day of the month with visual color coding:

- **🟢 Green (PRESENT)**: Employee attended work
- **🔴 Red (ABSENT)**: Employee was absent, late, on leave, or didn't check in
- **⚪ White (No Record)**: Future or unreported dates

---

## System Architecture

```
Frontend (CalendarPage.jsx)
    ↓
API Call: GET /api/calendar/monthly?year=2025&month=2
    ↓
Backend Controller (calendar.controller.js)
    ↓
Service Layer (calendar.service.js)
    ↓
Database Models
├── Attendance.model.js (status: PRESENT, LATE, ABSENT)
└── Leave.model.js (status: APPROVED, PENDING, REJECTED)
```

---

## Backend Implementation

### 1. **Calendar Service** (`calendar.service.js`)

#### Function: `getMonthlyAttendanceStatus(userId, year, month)`

**Purpose:** Calculates the attendance status for each day of a given month

**Logic:**

```javascript
ABSENT if ANY of:
  ├─ User took an APPROVED leave on that date
  ├─ Attendance status is "LATE"
  ├─ Attendance status is "ABSENT"
  └─ Attendance status is "LEAVE"

PRESENT if:
  └─ Attendance status is "PRESENT" AND no approved leave
```

**Returns:**
```javascript
[
  { date: "2025-02-01", status: "PRESENT" },
  { date: "2025-02-03", status: "ABSENT" },
  { date: "2025-02-05", status: "PRESENT" },
  ...
]
```

**Implementation Details:**

1. **Fetch Attendance Records**
   - Query `Attendance` collection for all records in the month
   - Filter by: `userId`, `date` range

2. **Fetch Approved Leaves**
   - Query `Leave` collection for APPROVED status
   - Filter by: `userId`, leave dates overlapping the month

3. **Build Status Map**
   - First mark all leave dates as "ABSENT"
   - Then process attendance records
   - Leave entries take priority (won't be overridden by attendance)

4. **Return Results**
   - Convert to array of `{ date, status }` objects
   - Sorted chronologically

### 2. **Calendar Controller** (`calendar.controller.js`)

#### Endpoint: `GET /api/calendar/monthly`

**Query Parameters:**
```
year (number): 4-digit year (default: current year)
month (number): 0-indexed month (0=Jan, 11=Dec) (default: current month)
```

**Example Request:**
```bash
GET /api/calendar/monthly?year=2025&month=2  # March 2025
```

**Response:**
```javascript
{
  "year": 2025,
  "month": 2,
  "userId": "user_123",
  "data": [
    { "date": "2025-03-01", "status": "PRESENT" },
    { "date": "2025-03-02", "status": "ABSENT" },
    ...
  ]
}
```

**Error Handling:**
- Catches and logs database errors
- Returns empty data array on failure
- Status code 200 (always successful, even if no records)

### 3. **Routes** (`calendar.routes.js`)

```javascript
router.get("/monthly", requireAuth, getMonthlyAttendance);
```

**Authentication:** Required
**Authorization:** Any authenticated user (can only view own data)

---

## Frontend Implementation

### CalendarPage.jsx

#### Key Components

**1. State Management**

```javascript
const [viewDate, setViewDate] = useState(new Date());
const [attendanceData, setAttendanceData] = useState([]);
const [loading, setLoading] = useState(true);
```

**2. Data Fetching**

```javascript
const loadMonthlyAttendance = async () => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const res = await api.get("/calendar/monthly", {
    params: { year, month }
  });
  
  setAttendanceData(res.data.data || []);
};
```

Called when `viewDate` changes (month navigation)

**3. Status Lookup**

Creates a map for O(1) date lookups:
```javascript
const statusMap = {};
attendanceData.forEach((item) => {
  statusMap[item.date] = item.status;
});

const getDateStatus = (day) => {
  const dateStr = `${year}-...`;
  return statusMap[dateStr];
};
```

**4. Styling Logic**

```javascript
const getStatusStyle = (status) => {
  if (status === "PRESENT") {
    return {
      bg: "bg-green-50",
      border: "border-green-300",
      dot: "bg-green-500",
      text: "text-green-700"
    };
  } else if (status === "ABSENT") {
    return {
      bg: "bg-red-50",
      border: "border-red-300",
      dot: "bg-red-500",
      text: "text-red-700"
    };
  }
  // Default gray
};
```

#### UI Features

**1. Stats Cards** (4 columns)
- ✅ Present Days (green)
- ✗ Absent Days (red)
- 📅 Monthly Total (blue)
- ⭐ Attendance Rate % (purple)

**2. Calendar Grid** (7x6)
- Day headers (Sun-Sat)
- Color-coded date tiles
- Status indicator dot
- Today highlight (ring-2 ring-[#1A3D63])
- Click to select date

**3. Navigation**
- Previous Month button (chevron-left)
- Today button (quick jump)
- Next Month button (chevron-right)

**4. Legend**
- Visual explanation of colors
- 3-column responsive layout

---

## Data Models

### Attendance Schema

```javascript
{
  userId: ObjectId,        // Link to user
  date: String,           // "2025-03-15" (YYYY-MM-DD)
  checkIn: String,        // "09:20" (HH:MM)
  checkOut: String,       // "18:40" (HH:MM)
  status: String,         // PRESENT | LATE | ABSENT | LEAVE
  shiftStart: String,     // "09:30" (9-hour shift)
  shiftEnd: String        // "18:30"
}
```

### Leave Schema

```javascript
{
  userId: ObjectId,       // Link to user
  fromDate: String,       // "2025-03-10" (YYYY-MM-DD)
  toDate: String,         // "2025-03-12" (inclusive)
  reason: String,         // "Vacation", "Sick Leave", etc.
  status: String          // PENDING | APPROVED | REJECTED
}
```

---

## API Endpoints

### Get Monthly Attendance Status

```
GET /api/calendar/monthly?year=2025&month=2
Authorization: Bearer {token}
```

**Success Response (200):**
```javascript
{
  "year": 2025,
  "month": 2,
  "userId": "507f1f77bcf86cd799439011",
  "data": [
    { "date": "2025-03-01", "status": "PRESENT" },
    { "date": "2025-03-02", "status": "PRESENT" },
    { "date": "2025-03-03", "status": "ABSENT" }
  ]
}
```

**Error Response (401):**
```javascript
{ "message": "Unauthorized" }
```

---

## Frontend Display Logic

### Color Coding

| Status   | Background | Border      | Dot        | Text       |
|----------|-----------|------------|-----------|-----------|
| PRESENT  | bg-green-50 | border-green-300 | bg-green-500 | text-green-700 |
| ABSENT   | bg-red-50   | border-red-300   | bg-red-500   | text-red-700 |
| No Data  | bg-[#F6FAFD] | border-[#B3CFE5] | bg-[#B3CFE5] | text-[#4A7FA7] |

### Responsive Design

- **Mobile:** 1 column stats, calendar with reduced padding
- **Tablet:** 2 columns stats, full calendar
- **Desktop:** 4 columns stats, full calendar with legend

---

## Complete User Flow

### 1. User Navigates to Calendar

```
Click "Calendar" in sidebar
→ CalendarPage.jsx loads
→ useEffect triggers with current month/year
```

### 2. Frontend Fetches Data

```
loadMonthlyAttendance()
→ GET /api/calendar/monthly?year=2025&month=2
→ Receives attendance array
→ Builds statusMap
→ Renders calendar
```

### 3. Backend Processes Request

```
getMonthlyAttendance controller
→ Calls getMonthlyAttendanceStatus(userId, year, month)
→ Queries Attendance collection
→ Queries Leave collection
→ Merges data
→ Returns standardized response
```

### 4. Calendar Renders

```
Stats cards show:
- 18 Present Days ✅
- 2 Absent Days ✗
- 20 Total Days
- 90% Attendance Rate

Calendar grid shows:
- Green tiles for PRESENT dates
- Red tiles for ABSENT dates
- White tiles for no data
```

### 5. User Interactions

```
Click Previous/Next → Month changes → Data reloads
Click Today → Jump to current month
Click Date → Select/highlight date
```

---

## Error Handling

### Backend

1. **Invalid Parameters**
   - Returns default params (current year/month)
   - No validation error

2. **Database Errors**
   - Catches with try/catch
   - Logs to console
   - Returns empty array
   - HTTP 200 still sent

3. **Unauthorized Access**
   - `requireAuth` middleware checks JWT
   - Returns 401 if no token
   - `req.user.id` always matches logged-in user

### Frontend

1. **Network Errors**
   - Caught in try/catch
   - setLoading(false) ensures spinner stops
   - Empty array displayed

2. **Invalid Dates**
   - JavaScript Date object handles validation
   - Month navigation uses Date arithmetic
   - Safe date string formatting

---

## Performance Considerations

### Database Queries

**Optimizations:**
- Both Attendance and Leave queries use indexed fields
- Indexed: `userId`, `date`, `status`
- Lean queries could be added if needed

**Complexity:**
- O(A + L) where A = attendance records, L = leave records
- Typically < 100 records per month per user

### Frontend Rendering

- `statusMap` for O(1) lookups (vs O(n) array.find)
- Memoization could be added for `getStatusStyle`
- Calendar grid is static (42 cells), minimal re-renders

---

## Testing Scenarios

### Scenario 1: Full Present Month

```
Attendance records: Jan 1-31, all PRESENT
Leaves: None
Expected: All dates green
```

### Scenario 2: Leave Period

```
Attendance records: Feb 1-10 PRESENT, 15-28 PRESENT
Leaves: Feb 11-14 APPROVED
Expected: Feb 1-10 green, 11-14 red, 15-28 green
```

### Scenario 3: Mixed Status

```
Attendance: 
  - Mar 1 PRESENT
  - Mar 2 LATE
  - Mar 3 ABSENT
Leaves: None
Expected: Mar 1 green, 2-3 red
```

### Scenario 4: Future Month

```
View future month with no data
Expected: All dates white
```

---

## File Structure

```
Backend
├── server/src/modules/calendar/
│   ├── calendar.controller.js      ← getMonthlyAttendance endpoint
│   ├── calendar.service.js         ← getMonthlyAttendanceStatus logic
│   ├── calendar.routes.js          ← /monthly route
│   ├── Calendar.model.js           ← (legacy)
│   └── calendar.schemas.js         ← validation schemas
├── server/src/modules/attendance/
│   ├── Attendance.model.js         ← Query source
│   └── attendance.service.js
└── server/src/modules/leave/
    ├── Leave.model.js              ← Query source
    └── leave.service.js

Frontend
├── erp-dashboard/src/features/calendar/
│   └── CalendarPage.jsx            ← Color-coded calendar UI
├── erp-dashboard/src/lib/
│   └── api.js                      ← API requests
└── erp-dashboard/src/store/
    └── authStore.js                ← User info
```

---

## Troubleshooting

### Issue: Calendar shows all white (no data)

**Solutions:**
1. Verify attendance records exist: `db.attendances.findOne({ userId })`
2. Check query parameters: year, month format
3. Verify user ID is correct: `req.user.id`
4. Check API endpoint: `GET /api/calendar/monthly`

### Issue: Wrong status for leave dates

**Solutions:**
1. Verify leave status is "APPROVED" not "PENDING"
2. Check date format: `fromDate` and `toDate` in YYYY-MM-DD
3. Verify leave dates overlap query month

### Issue: Slow calendar load

**Solutions:**
1. Add database indexes
2. Implement query pagination
3. Cache results on frontend

---

## Future Enhancements

1. **Day Details Modal**
   - Click date → Show check-in/check-out times
   - Show leave reason if applicable
   - Edit capability for admins

2. **Export Calendar**
   - PDF export with formatting
   - CSV export for analysis
   - Email report generation

3. **Analytics**
   - Attendance trends chart
   - Late arrival patterns
   - Leave usage breakdown

4. **Filters**
   - View only PRESENT days
   - View only ABSENT days
   - Filter by department (HR/Admin only)

5. **Bulk Actions**
   - Mark multiple days
   - Generate attendance certificates
   - Admin override capability

---

## API Specification Summary

| Method | Endpoint | Auth | Params | Response |
|--------|----------|------|--------|----------|
| GET | `/api/calendar/monthly` | Yes | year, month | { year, month, userId, data } |
| GET | `/api/calendar` | Yes | from, to | Array of calendar entries |
| PUT | `/api/calendar` | Admin | {data} | { calendar } |

---

## Database Indices

Required for optimal performance:

```javascript
// Attendance
db.attendances.createIndex({ userId: 1, date: 1 }, { unique: true });
db.attendances.createIndex({ date: 1 });

// Leave
db.leaves.createIndex({ userId: 1, fromDate: 1, toDate: 1 });
db.leaves.createIndex({ status: 1 });
```

---

Generated: March 2025
System Version: 1.0
Last Updated: Calendar System Implementation
