# Project Structure Analysis - HR, Admin, Routing & Database Schema

---

## 1. FOLDER STRUCTURE & ORGANIZATION

### Frontend Pages Folder Structure
```
erp-dashboard/src/features/
├── admin/                          # Admin-only pages (6 files)
│   ├── ActivityTimelinePage.jsx
│   ├── AdminAnalyticsDashboard.jsx
│   ├── AdminAttendancePage.jsx
│   ├── AdminDocumentManagementPage.jsx
│   ├── CompanySettingsPage.jsx
│   └── HRTeamPage.jsx
│
├── hr/                             # HR-only pages (2 files)
│   ├── HRActivityTimelinePage.jsx
│   └── HRDocumentsManagementPage.jsx
│
├── attendance/                     # Shared (Employee/HR/Admin)
│   └── AttendancePage.jsx
│
├── auth/                           # Public pages
│   ├── LoginPage.jsx
│   └── ResetPasswordPage.jsx
│
├── dashboard/                      # Common dashboard
├── profile/                        # User profile pages
├── leave/, payroll/, tasks/        # Other modules...
└── ...
```

### Backend Modules Folder Structure
```
server/src/modules/
├── auth/                           # Authentication
│   ├── auth.controller.js
│   ├── auth.routes.js
│   └── auth.service.js
│
├── users/                          # Employee management (ALL users)
│   ├── User.model.js              # User schema definition
│   ├── users.controller.js
│   ├── users.routes.js
│   ├── users.service.js
│   └── users.schemas.js
│
├── admin/                          # Admin-only endpoints
│   ├── admin.controller.js
│   ├── admin.routes.js
│   └── admin.service.js
│
├── attendance/                     # Attendance management
│   ├── Attendance.model.js         # Attendance schema
│   ├── attendance.controller.js
│   ├── attendance.routes.js
│   ├── attendance.service.js
│   └── attendance.schemas.js
│
├── leave/, payroll/, department/   # Other modules...
└── ...
```

**Naming Pattern:**
- Folder name = lowercase (e.g., `attendance`)
- Model file = PascalCase (e.g., `Attendance.model.js`)
- Files = lowercase.suffix (e.g., `attendance.routes.js`, `attendance.controller.js`)

---

## 2. ROUTING SYSTEM

### Frontend Routing (Client-Side)

**File:** [erp-dashboard/src/app/routes.jsx](erp-dashboard/src/app/routes.jsx)

**Structure:**
- Main router imported into [App.jsx](erp-dashboard/src/App.jsx)
- Uses React Router v6: `Routes` and `Route`
- All routes wrapped in `ProtectedRoute` component for authentication
- Layout wrapper: `AppLayout` component

**Route Pattern Definition:**
```javascript
// Public routes (no auth required)
<Route path="/login" element={<LoginPage />} />

// Protected routes (auth required)
<Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  
  // Route format: path={string}, element={<Component />}
  
  // Common routes (all authenticated users)
  <Route path="attendance" element={<AttendancePage />} />
  
  // Admin/HR restricted routes
  <Route
    path="admin/attendance"
    element={
      <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
        <AdminAttendancePage />
      </ProtectedRoute>
    }
  />
  
  // Admin only
  <Route
    path="admin/hr"
    element={
      <ProtectedRoute roles={[ROLES.ADMIN]}>
        <HRTeamPage />
      </ProtectedRoute>
    }
  />
</Route>
```

### Backend API Routing (Server-Side)

**Entry Point:** [server/src/app.js](server/src/app.js)

**Structure:**
```javascript
// Routes are mounted as: app.use("/api/{module}", routes)

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
// ... etc
```

**Module Structure:** Each module follows this pattern:
```
module/
├── {module}.model.js       → Database schema (Mongoose)
├── {module}.controller.js  → Route handlers
├── {module}.routes.js      → Route definitions
├── {module}.service.js     → Business logic
└── {module}.schemas.js     → Validation schemas (Joi/Yup)
```

---

## 3. CURRENT ROUTES & PATTERNS

### Frontend Routes (from `routes.jsx`)

| Path | Component | Access | Purpose |
|------|-----------|--------|---------|
| `/login` | LoginPage | Public | Authentication |
| `/` | DashboardPage | All Users | Main dashboard |
| `/profile` | MyProfilePage | All Users | User profile |
| `/attendance` | AttendancePage | All Users | Check-in/out |
| `/admin/attendance` | AdminAttendancePage | Admin, HR | Manage attendance |
| `/admin/users` | UsersPage | Admin, HR | Manage employees |
| `/admin/hr` | HRTeamPage | Admin Only | HR team management |
| `/admin/documents` | AdminDocumentManagementPage | Admin Only | Document management |
| `/admin/analytics` | AdminAnalyticsDashboard | Admin, HR | Analytics dashboard |
| `/admin/company-settings` | CompanySettingsPage | Admin Only | Company settings |
| `/admin/department` | DepartmentManagePage | Admin, HR | Department management |
| `/admin/complaints` | AdminComplaintsPage | Admin Only | Complaint management |
| `/admin/activity-timeline` | ActivityTimelinePage | Admin Only | Activity logs |
| `/hr/documents` | HRDocumentsManagementPage | HR Only | HR documents |
| `/hr/activity-timeline` | HRActivityTimelinePage | HR Only | HR activity logs |
| `/leave/manage` | LeaveManagePage | Admin, HR | Leave request approval |
| `/payroll/manage` | PayrollManagePage | Admin, HR | Payroll management |
| `/tasks/manage` | TasksManagePage | Admin, HR | Task management |

### Backend API Routes (from route files)

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| `POST` | `/api/attendance/checkin` | Auth | User check-in |
| `POST` | `/api/attendance/checkout` | Auth | User check-out |
| `GET` | `/api/attendance` | Auth | Get attendance records |
| `PATCH` | `/api/attendance/edit` | Admin, HR | Edit attendance |
| `GET` | `/api/admin/attendance` | Admin, HR | View all attendance |
| `POST` | `/api/users` | Admin, HR | Create new user |
| `GET` | `/api/users` | Auth | Get all users |
| `GET` | `/api/users/:id` | Admin, HR | Get specific user |
| `PATCH` | `/api/users/:id` | Admin, HR | Update user |
| `POST` | `/api/admin/company-location` | Admin Only | Set office location |
| `GET` | `/api/admin/stats` | Admin, HR | System statistics |

---

## 4. DATABASE SCHEMA - EMPLOYEES (USER MODEL)

**File:** [server/src/modules/users/User.model.js](server/src/modules/users/User.model.js)

### User Collection Fields

```javascript
{
  // Basic Identity
  name: String                    // Employee name (required)
  email: String                   // Email (unique, required)
  phone: String                   // Phone number
  employeeId: String              // Unique employee ID
  role: String                    // ADMIN | HR | USER (default: USER)

  // Authentication
  passwordHash: String            // Encrypted password (bcryptjs)
  twoFactorEnabled: Boolean       // 2FA toggle
  refreshTokenHash: String        // JWT refresh token
  resetPasswordToken: String      // Password reset token
  resetPasswordExpires: Date      // Token expiry
  failedLoginAttempts: Number     // Login attempt counter
  accountLocked: Boolean          // Account lock status
  lockUntil: Date                 // Lock expiry time

  // Personal Information
  profileImageUrl: String         // Profile picture URL
  gender: String                  // Male | Female | Other
  dateOfBirth: Date               // Birth date
  maritalStatus: String           // Single | Married | Divorced | Widowed
  nationality: String             // Country
  bloodGroup: String              // O+ | O- | A+ | A- | B+ | B- | AB+ | AB-
  emergencyContact: String        // Emergency contact number

  // Office Location & Working Hours
  officeLatitude: Number          // Office GPS latitude
  officeLongitude: Number         // Office GPS longitude
  isCompanyLocation: Boolean      // Is this company HQ? (default: false)
  workingDays: [Number]           // Array of working days [0-6] (0=Sunday)
                                  // Default: [1,2,3,4,5] (Mon-Fri)

  // Department & Role
  departmentId: ObjectId          // Reference to Department collection
  designationId: ObjectId         // Reference to Designation collection

  // Real-time Geolocation Tracking
  currentLatitude: Number         // Current GPS latitude
  currentLongitude: Number        // Current GPS longitude
  currentLocationAccuracy: Number // GPS accuracy (meters)
  lastLocationUpdate: Date        // Last update timestamp
  isActive: Boolean               // Currently logged in? (default: false)

  // Metadata
  createdAt: Date                 // Timestamp (auto)
  updatedAt: Date                 // Timestamp (auto)
}
```

**Key Features:**
- Hierarchical roles: ADMIN → HR → USER (employees)
- Real-time geolocation tracking (updated every 10 seconds from frontend)
- Configurable working days per employee
- Department & designation linking
- Account security: password hashing, login attempts, 2FA support

**Indexes:**
- `email` (unique)
- `employeeId` (sparse unique)

---

## 5. DATABASE SCHEMA - ATTENDANCE

**File:** [server/src/modules/attendance/Attendance.model.js](server/src/modules/attendance/Attendance.model.js)

### Attendance Collection Fields

```javascript
{
  // Reference to User
  userId: ObjectId                // User reference (required, indexed)
  
  // Date & Time
  date: String                    // Date in YYYY-MM-DD format (required, indexed)
  checkIn: String                 // Check-in time in HH:MM format (e.g., "09:20")
  checkOut: String                // Check-out time in HH:MM format (e.g., "18:40")
  
  // Shift Information
  shiftStart: String              // Shift start time (default: "09:30")
  shiftEnd: String                // Shift end time (default: "18:30")
  shiftName: String               // Shift name (default: "Regular Shift")
  
  // Hours Calculation
  totalHours: Number              // Total hours worked (calculated)
  status: String                  // PRESENT | SHORT_HOURS | ABSENT (default: PRESENT)
  
  // Geofencing Data (Location verification)
  checkInLatitude: Number         // GPS latitude at check-in
  checkInLongitude: Number        // GPS longitude at check-in
  isWithinGeofence: Boolean       // Within office boundaries? (default: true)
  distanceFromOffice: Number      // Distance from office in meters
  
  // Metadata
  createdAt: Date                 // Timestamp (auto)
  updatedAt: Date                 // Timestamp (auto)
}
```

**Unique Constraint:**
- Composite index: `(userId, date)` = unique per user per day

**Statuses:**
- `PRESENT` - Checked in and out on time
- `SHORT_HOURS` - Checked in but worked fewer hours than shift
- `ABSENT` - No check-in for the day

**Geofencing:**
- Tracks GPS coordinates at check-in
- Calculates distance from company office location
- Used for location-based attendance verification

---

## 6. ATTENDANCE PAGE STRUCTURE & DATA FETCHING

**File:** [erp-dashboard/src/features/attendance/AttendancePage.jsx](erp-dashboard/src/features/attendance/AttendancePage.jsx)

### Page Component Structure

```javascript
export default function AttendancePage() {
  // Access control
  const user = useAuthStore((s) => s.user);
  const isEditor = user?.role === ROLES.ADMIN || user?.role === ROLES.HR;
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);           // Attendance records
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Check-in/out tracking
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);
  
  // Real-time timer
  const [checkInTime, setCheckInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const timerRef = useRef(null);
}
```

### Data Fetching Flow

```
1. Component mounts (useEffect)
   ↓
2. load() function called
   ↓
3. Calculate date range (last 30 days)
   ↓
4. API call: GET /api/attendance?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
   ↓
5. Backend returns list of attendance records
   ↓
6. Process records:
   - Check if user checked in today
   - Check if user checked out today
   - Set timer if checked in
   ↓
7. Render attendance table + check-in/out buttons
```

### API Calls (from page)

```javascript
// Fetch attendance records
GET /api/attendance
  Query params: { fromDate: "2026-03-01", toDate: "2026-03-30" }
  Response: [{ userId, date, checkIn, checkOut, status, totalHours, ... }]

// Check-in
POST /api/attendance/checkin
  Body: { latitude, longitude, timezone }
  Response: { success: true, message: "Checked in successfully" }

// Check-out
POST /api/attendance/checkout
  Body: { latitude, longitude, timezone }
  Response: { success: true, message: "Checked out successfully" }

// Edit attendance (HR/Admin only)
PATCH /api/attendance/edit
  Body: { userId, date, checkIn, checkOut, status }
  Response: { success: true, updatedRecord }
```

### Key Features

1. **Real-time Timer** - Shows elapsed time since check-in (updates every 1 second)
2. **Geolocation Capture** - Gets GPS coordinates at check-in/out
3. **Automatic Status** - Calculates PRESENT, SHORT_HOURS, or ABSENT
4. **HR/Admin Edit** - Allows manual attendance corrections
5. **Filtering & Search** - Filter by status, search by employee name
6. **Date Range** - Loads last 30 days of history

---

## 7. HOW TO ADD NEW ROUTES

### Adding a New Frontend Route

**Step 1: Create page component**
```bash
# File: erp-dashboard/src/features/{module}/{FeaturePage}.jsx
export default function FeaturePage() {
  return <div>Feature content</div>;
}
```

**Step 2: Add to routes.jsx**
```javascript
// File: erp-dashboard/src/app/routes.jsx

// Import component at top
import MyFeaturePage from "../features/myfeature/MyFeaturePage.jsx";

// Add route inside <Route path="/" > section
<Route
  path="myfeature"
  element={
    <ProtectedRoute roles={[ROLES.ADMIN]}>  // Optional role restriction
      <MyFeaturePage />
    </ProtectedRoute>
  }
/>
```

**Step 3: Use route in navigation**
```javascript
// Navigate to new route:
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
navigate("/myfeature");
```

**✅ Do Not:**
- Directly modify `ProtectedRoute` wrapper (breaks existing routes)
- Add routes outside the main layout wrapper (breaks sidebar navigation)

---

### Adding a New Backend API Route

**Step 1: Create module folder**
```bash
mkdir -p server/src/modules/{featurename}
```

**Step 2: Create module files**
```javascript
// File: server/src/modules/{featurename}/{featurename}.model.js
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  // define fields
}, { timestamps: true });

export const Feature = mongoose.model("Feature", schema);
```

```javascript
// File: server/src/modules/{featurename}/{featurename}.routes.js
import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import * as controller from "./{featurename}.controller.js";

const router = express.Router();

router.get("/", requireAuth, controller.getAll);
router.post("/", requireAuth, requireRole(ROLES.ADMIN), controller.create);

export default router;
```

```javascript
// File: server/src/modules/{featurename}/{featurename}.controller.js
import { Feature } from "./{featurename}.model.js";

export async function getAll(req, res) {
  try {
    const records = await Feature.find();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function create(req, res) {
  try {
    const record = new Feature(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

**Step 3: Register in app.js**
```javascript
// File: server/src/app.js
import featureRoutes from "./modules/{featurename}/{featurename}.routes.js";

// Add this line with other route registrations:
app.use("/api/{featurename}", featureRoutes);
```

**Step 4: Test**
```bash
curl http://localhost:5000/api/featurename
```

---

## 8. KEY BEST PRACTICES

### ✅ Do This

1. **Use ProtectedRoute for all authenticated pages**
   ```jsx
   <Route path="feature" element={<ProtectedRoute><FeaturePage /></ProtectedRoute>} />
   ```

2. **Always add role restriction if needed**
   ```jsx
   <ProtectedRoute roles={[ROLES.ADMIN]}>
     <AdminOnlyPage />
   </ProtectedRoute>
   ```

3. **Follow naming conventions**
   - Folders: lowercase (`attendance`, `admin`, `hr`)
   - Components: PascalCase with `Page` suffix (`AttendancePage.jsx`)
   - Model files: PascalCase (`Attendance.model.js`)
   - Routes/Controllers/Services: camelCase.suffix

4. **Use requireRole middleware on backend**
   ```js
   router.post("/", requireAuth, requireRole(ROLES.ADMIN), handler);
   ```

5. **Add geolocation check if attendance-related**
   ```js
   const { latitude, longitude } = await requestGeolocation();
   ```

### ❌ Don't Do This

1. ❌ Add unprotected routes (users can bypass authentication)
2. ❌ Use different folder naming schemes (causes confusion)
3. ❌ Skip API authorization checks (security risk)
4. ❌ Hardcode user permissions in components (use role-based routing)
5. ❌ Add routes without registering them in app.js

---

## 9. ROLE HIERARCHY

```
ROLES.ADMIN
  ├─ Can manage all users
  ├─ Can manage HR users
  ├─ Can set company location
  ├─ Can manage company settings
  └─ Full system access

ROLES.HR
  ├─ Can manage employees (not admins)
  ├─ Can approve leave requests
  ├─ Can view attendance
  ├─ Cannot access admin settings
  └─ Limited system access

ROLES.USER (Employee)
  ├─ Can check in/out
  ├─ Can view own attendance
  ├─ Can submit leave requests
  └─ Read-only access
```

---

## 10. KEY FILES REFERENCE

| Purpose | File Path |
|---------|-----------|
| Frontend routes | [erp-dashboard/src/app/routes.jsx](erp-dashboard/src/app/routes.jsx) |
| Route constants | [erp-dashboard/src/app/constants.js](erp-dashboard/src/app/constants.js) |
| Frontend auth | [erp-dashboard/src/lib/auth.js](erp-dashboard/src/lib/auth.js) |
| Backend app setup | [server/src/app.js](server/src/app.js) |
| User model | [server/src/modules/users/User.model.js](server/src/modules/users/User.model.js) |
| Attendance model | [server/src/modules/attendance/Attendance.model.js](server/src/modules/attendance/Attendance.model.js) |
| Auth middleware | [server/src/middleware/auth.js](server/src/middleware/auth.js) |
| Role middleware | [server/src/middleware/roles.js](server/src/middleware/roles.js) |

---

## Summary Table

| Question | Answer |
|----------|--------|
| **HR pages folder?** | `erp-dashboard/src/features/hr/` (2 pages) |
| **Admin pages folder?** | `erp-dashboard/src/features/admin/` (6 pages) |
| **Route file location?** | `erp-dashboard/src/app/routes.jsx` |
| **API app setup?** | `server/src/app.js` |
| **Employees table?** | `users` (User.model.js) |
| **Attendance table?** | `attendance` (Attendance.model.js) |
| **Break existing routes?** | Add new routes inside the main layout wrapper, always use ProtectedRoute |
| **Add new backend route?** | Create module, add routes, register in app.js |
| **Add new frontend route?** | Create component, add to routes.jsx with ProtectedRoute |
