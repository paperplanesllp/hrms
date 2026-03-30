# HR Dashboard & Attendance System - Complete Analysis

## 1. PATH TO HR DASHBOARD COMPONENT

### Primary Dashboard Entry Point
- **Main Dashboard**: [erp-dashboard/src/features/dashboard/DashboardPage.jsx](erp-dashboard/src/features/dashboard/DashboardPage.jsx)
  - Role-based rendering (HR, Admin, Regular Staff)
  - Entry point: `/` (root route after login)

### HR-Specific Pages
- **HR Activity Timeline**: [erp-dashboard/src/features/hr/HRActivityTimelinePage.jsx](erp-dashboard/src/features/hr/HRActivityTimelinePage.jsx)
  - Route: `/admin/activity-timeline` (HR/Admin only)
  - Monitoring staff activities

- **HR Documents Management**: [erp-dashboard/src/features/hr/HRDocumentsManagementPage.jsx](erp-dashboard/src/features/hr/HRDocumentsManagementPage.jsx)
  - Route: `/admin/documents` (HR/Admin only)
  - Document approval workflows

### Admin-Specific Dashboard Pages
- **Admin Attendance**: [erp-dashboard/src/features/admin/AdminAttendancePage.jsx](erp-dashboard/src/features/admin/AdminAttendancePage.jsx)
  - Route: `/admin/attendance`
  - Shared with HR role: `<ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>`

- **Admin Analytics Dashboard**: [erp-dashboard/src/features/admin/AdminAnalyticsDashboard.jsx](erp-dashboard/src/features/admin/AdminAnalyticsDashboard.jsx)
  - Route: `/admin/analytics`
  - Shared with HR role: `<ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>`

---

## 2. ATTENDANCE MARKING FUNCTIONALITY

### Frontend Attendance Component
- **File**: [erp-dashboard/src/features/attendance/AttendancePage.jsx](erp-dashboard/src/features/attendance/AttendancePage.jsx)
- **Route**: `/attendance`
- **Access**: All users (role-aware components)

### Attendance Utilities
- **File**: [erp-dashboard/src/features/attendance/attendanceUtils.js](erp-dashboard/src/features/attendance/attendanceUtils.js)
- **Functions**:
  - `convertTo12HourFormat(time24)` - Convert 24-hour to 12-hour format
  - `arrivalStatus(checkInHHMM)` - Determine on-time vs late status
  - `toneBadge(tone)` - Styling for status badges

### Attendance Features in AttendancePage
1. **Check-In/Check-Out Controls**
   - Real-time elapsed time display
   - Geolocation capture on check-in
   - Timer that updates every second

2. **Filtering & Search**
   - Search by employee name/email
   - Filter by status: present, late, short hours, absent
   - Filter by date range
   - HR-only filter

3. **Edit Functionality (HR/Admin)**
   - Manual attendance record editing
   - Update check-in/check-out times
   - Update status

---

## 3. KEY API ENDPOINTS FOR ATTENDANCE MARKING

### Backend Route File
**Location**: [server/src/modules/attendance/attendance.routes.js](server/src/modules/attendance/attendance.routes.js)

### Endpoints Summary

#### User Attendance Endpoints
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/attendance/checkin` | All | Mark check-in with geolocation |
| POST | `/attendance/checkout` | All | Mark check-out |
| GET | `/attendance` | All | Get attendance records (30-day default) |
| GET | `/attendance/me` | All | Get own attendance records (legacy) |
| POST | `/attendance/me/mark` | All | Legacy check-in endpoint |
| GET | `/attendance/by-date` | All | Get attendance for specific date |

#### HR/Admin Attendance Endpoints
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| PUT | `/attendance/:id` | Admin/HR | Edit attendance record by ID |
| PATCH | `/attendance/edit` | Admin/HR | Edit attendance record (legacy) |
| PATCH | `/attendance/shift` | Admin only | Edit shift times |
| GET | `/attendance/admin/auto-mark` | Admin | Trigger auto-mark absent job |
| GET | `/attendance/admin/summary` | Admin | Get today's attendance summary |

### Auto-Marking Route
- **GET** `/attendance/admin/auto-mark` - Manually trigger auto-marking of absent staff
- Response includes:
  - `message`: Status message
  - `autoMarkResult`: Detailed auto-mark results
  - `attendanceSummary`: Today's attendance stats

---

## 4. CURRENT DASHBOARD LAYOUT FOR HR ROLE

### DashboardPage Component Structure

#### Dashboard Sections for HR/Admin

##### 1. **Stats Grid Section** (4 columns)
```
┌─────────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Present Today       │ Short Hours Today │ Pending Leaves   │ Absent Today     │
│ [Count]             │ [Count]           │ [Count]          │ [Count]          │
└─────────────────────┴──────────────────┴──────────────────┴──────────────────┘
```
From API endpoint: `/dashboard/stats`

##### 2. **Main Content Area** (3-column layout)

**Left Column (1/3 width)**
- Leave Balance Card (for HR, not Admin)
  - Total days
  - Used days
  - Pending requests
  - Leave type breakdown
  - Remaining days progress bar
- Payroll Info Card
  - Status: "On Track"
  - Last Paid date
  - Next Pay Date

**Middle Column (1/3 width)**
- Pending Tasks Card
  - Task list with due dates
  - Priority indicators

**Right Column (1/3 width)**
- Recent News & Announcements
- Activity Timeline (HR/Admin specific)
  - All staff activities
  - Attendance tracking
  - Leave requests
  - Profile updates

##### 3. **For Regular Staff Only** (Hidden from HR/Admin)
- Quick Attendance Section
  - Check-In Button (prominent blue CTA)
  - Check-Out Button (red CTA)
  - Elapsed Time Display (live timer)
  - Check-in time display

#### Dashboard Data Sources
- `GET /dashboard/stats` - Overall statistics
- `GET /dashboard/analytics` - Time-range analytics
- `GET /attendance` - Attendance records
- `GET /dashboard/leave-balance` - Leave information
- `GET /dashboard/absent-employees` - Absent staff list
- `GET /activity/admin-timeline` - Admin activity timeline
- `GET /activity/hr-timeline` - HR activity timeline
- `GET /news?limit=5` - Recent news

---

## 5. COMPONENT HIERARCHY & FILE STRUCTURE

### Frontend File Structure
```
erp-dashboard/src/
├── features/
│   ├── dashboard/
│   │   └── DashboardPage.jsx ⭐ MAIN HR DASHBOARD
│   ├── attendance/
│   │   ├── AttendancePage.jsx ⭐ ATTENDANCE MARKING
│   │   └── attendanceUtils.js
│   ├── admin/
│   │   ├── AdminAttendancePage.jsx ⭐ HR ATTENDANCE VIEW
│   │   ├── AdminAnalyticsDashboard.jsx ⭐ HR ANALYTICS
│   │   ├── HRTeamPage.jsx
│   │   └── ActivityTimelinePage.jsx
│   └── hr/
│       ├── HRActivityTimelinePage.jsx ⭐ HR ACTIVITY TIMELINE
│       └── HRDocumentsManagementPage.jsx ⭐ HR DOCUMENTS
├── components/
│   ├── common/
│   │   ├── PageTitle.jsx - Page headers
│   │   ├── StatCard.jsx - Dashboard stat cards
│   │   └── ActivityTimeline.jsx - Activity display
│   ├── charts/
│   │   └── AnalyticsChart.jsx - Various charts
│   └── layout/
│       └── AppLayout.jsx - Main app container
├── lib/
│   ├── api.js - API client with interceptors
│   ├── auth.js - Auth utilities
│   └── geolocation.js - Geolocation service
├── store/
│   ├── authStore.js - Auth state (Zustand)
│   └── toastStore.js - Toast notifications
└── app/
    ├── routes.jsx - Router configuration
    └── constants.js - ROLES, SHIFT times
```

### Backend File Structure
```
server/src/
├── modules/
│   ├── attendance/
│   │   ├── attendance.routes.js ⭐ API ROUTES
│   │   ├── attendance.controller.js ⭐ REQUEST HANDLERS
│   │   ├── attendance.service.js - Business logic
│   │   ├── Attendance.model.js - MongoDB schema
│   │   └── attendance.schemas.js - Validation
│   ├── dashboard/
│   │   ├── dashboard.controller.js
│   │   ├── dashboard.service.js
│   │   └── dashboard.routes.js
│   ├── admin/
│   │   ├── admin.controller.js
│   │   └── admin.routes.js
│   └── activity/
│       ├── activity.controller.js
│       └── activity.routes.js
├── middleware/
│   ├── auth.js - JWT verification
│   └── roles.js - Role-based access
├── utils/
│   ├── asyncHandler.js - Error handling
│   └── apiError.js - Error formatting
└── routes/
    └── health.js
```

---

## 6. ROLE-BASED DASHBOARD BEHAVIOR

### Regular Staff User (USER role)
```
Dashboard /
├── Quick Attendance Section (Visible)
│   ├── Check-In Button
│   ├── Check-Out Button
│   └── Elapsed Time Timer
├── Leave Balance Card (Visible)
├── Payroll Info Card (Visible)
├── Pending Tasks (Visible)
├── Recent News (Visible)
└── Stats Grid (Hidden)
```

### HR User (HR role)
```
Dashboard /
├── Quick Attendance Section (Hidden)
├── Stats Grid (Visible) - Present, Short Hours, Pending Leaves, Absent
├── Leave Balance Card (Visible)
├── Payroll Info Card (Visible)
├── Pending Tasks (Visible)
├── Recent News (Visible)
├── Activity Timeline (HR-specific) (Visible)
└── Absent Employees Section (Visible)
```

### Admin User (ADMIN role)
```
Dashboard /
├── Quick Attendance Section (Hidden)
├── Stats Grid (Visible) - All stats
├── Leave Balance Card (Hidden)
├── Payroll Info Card (Visible)
├── Pending Tasks (Visible)
├── Recent News (Visible)
├── Activity Timeline (Admin-specific) (Visible)
└── Absent Employees Section (Visible)
```

---

## 7. ATTENDANCE MARKING FLOW

### Check-In Flow
```
User clicks Check-In
├── Request geolocation (GPS capture)
├── Get current time (client-side)
├── POST /attendance/checkin
│   ├── checkIn: "HH:MM"
│   ├── checkInLatitude: GPS
│   └── checkInLongitude: GPS
├── Backend Validation
│   ├── Check if already checked in today
│   ├── Calculate distance from office
│   └── Create/Update attendance record
└── Response
    ├── Calculate distance from office
    └── Return success message
```

### Check-Out Flow
```
User clicks Check-Out
├── Get current time (client-side)
├── POST /attendance/checkout
│   ├── checkOut: "HH:MM"
│   └── date: today
├── Backend Validation
│   ├── Check if user checked in
│   ├── Check if already checked out
│   └── Update attendance record
└── Response: Success message
```

### HR Edit Flow
```
HR clicks Edit Attendance Record
├── Open Edit Modal with current values
├── PUT /attendance/:id
│   ├── checkIn: "HH:MM" (optional)
│   ├── checkOut: "HH:MM" (optional)
│   └── status: "PRESENT|SHORT_HOURS|ABSENT|LATE"
├── Backend Validation
│   ├── Verify HR/Admin role
│   └── Update record
└── Reload attendance table
```

---

## 8. KEY DATA MODELS

### Attendance Record Schema
```javascript
{
  _id: ObjectId,
  userId: UUID,
  userName: String,
  email: String,
  userRole: "USER" | "HR" | "ADMIN",
  date: "YYYY-MM-DD",
  checkIn: "HH:MM" | null,
  checkOut: "HH:MM" | null,
  status: "PRESENT" | "ABSENT" | "SHORT_HOURS" | "LATE",
  checkInLatitude: Number,
  checkInLongitude: Number,
  distanceFromOffice: Number (meters),
  notes: String,
  createdAt: DateTime,
  updatedAt: DateTime,
  isAutoMarked: Boolean
}
```

### Dashboard Stats
```javascript
{
  presentToday: Number,
  shortHoursToday: Number,
  lateToday: Number,
  leavePending: Number,
  payrollPending: Number,
  absentToday: Number,
  totalEmployees: Number
}
```

---

## 9. PROTECTED ROUTES FOR HR/ATTENDANCE

### Using ProtectedRoute Component
```jsx
<ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
  <AdminAttendancePage />
</ProtectedRoute>
```

### Available to HR Role:
- `/admin/attendance` - Attendance monitoring
- `/admin/analytics` - Analytics dashboard
- `/admin/users` - User management
- `/admin/department` - Department management
- `/leave/manage` - Leave request approval
- `/payroll/manage` - Payroll management
- `/admin/documents` - Document management (HR-specific)
- `/admin/activity-timeline` - Activity monitoring (HR-specific)

---

## 10. ENVIRONMENT & CONFIGURATION

### Frontend Routes Configuration
**File**: [erp-dashboard/src/app/routes.jsx](erp-dashboard/src/app/routes.jsx)

### Constants
**File**: [erp-dashboard/src/app/constants.js](erp-dashboard/src/app/constants.js)
- ROLES: USER, ADMIN, HR
- SHIFT times (start/end)
- Other app constants

### API Base URL
**File**: [erp-dashboard/src/lib/api.js](erp-dashboard/src/lib/api.js)
- Axios instance with JWT token interceptor
- Automatically adds `Authorization: Bearer <token>` header

---

## SUMMARY TABLE

| Item | Path/Location | Role Access |
|------|--------------|-------------|
| **Main Dashboard** | `/features/dashboard/DashboardPage.jsx` | All (role-aware) |
| **Attendance Marking** | `/features/attendance/AttendancePage.jsx` | All |
| **HR Attendance View** | `/features/admin/AdminAttendancePage.jsx` | Admin, HR |
| **HR Activity Timeline** | `/features/hr/HRActivityTimelinePage.jsx` | Admin, HR |
| **HR Documents** | `/features/hr/HRDocumentsManagementPage.jsx` | Admin, HR |
| **Check-In API** | `POST /attendance/checkin` | All |
| **Check-Out API** | `POST /attendance/checkout` | All |
| **View Attendance** | `GET /attendance` | All (own + all for HR/Admin) |
| **Edit Attendance** | `PUT /attendance/:id` | Admin, HR |
| **Auto-Mark Absent** | `GET /attendance/admin/auto-mark` | Admin only |
| **Dashboard Stats** | `GET /dashboard/stats` | Admin, HR |
| **Analytics** | `GET /dashboard/analytics` | Admin, HR |
