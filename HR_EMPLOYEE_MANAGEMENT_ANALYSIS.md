# HR Employee Management Features Analysis

## 📊 Executive Summary

HR users currently have **limited employee management capabilities** compared to Admin users. HR can manage leave/payroll/tasks for employees and view attendance, but **cannot directly manage employee accounts** (create/edit/delete). Admin has exclusive control over employee creation and account management.

---

## 🔗 ALL ROUTES & PAGE MAPPINGS

### **HR User Routes (Sidebar Navigation)**

| Feature | URL | Page Component | Access Level |
|---------|-----|----------------|--------------|
| **Analytics Dashboard** | `/admin/analytics` | `AdminAnalyticsDashboard.jsx` | HR + Admin |
| **Dashboard** | `/` | `DashboardPage.jsx` | All Users |
| **Profile** | `/profile` | `MyProfilePage.jsx` | All Users |
| **Messages** | `/chat` | `PremiumChatPage.jsx` | All Users |
| **Attendance (Personal)** | `/attendance` | `AttendancePage.jsx` | All Users |
| **Calendar** | `/calendar` | `CalendarPage.jsx` | All Users |
| **Leave (Personal)** | `/leave` | `LeaveMyPage.jsx` | All Users |
| **Tasks (Personal)** | `/tasks` | `TasksPage.jsx` | All Users |
| **Payroll (Personal)** | `/payroll` | `PayrollMyPage.jsx` | All Users |
| **Worksheet** | `/worksheet` | `WorksheetPage.jsx` | All Users |
| **News** | `/news` | `NewsPage.jsx` | All Users |
| **Policies** | `/policy` | `PoliciesPage.jsx` | All Users |
| **Complaints (View)** | `/complaints` | `StaffComplaintsDashboard.jsx` | All Users |
| **Management: Manage Tasks** | `/tasks/manage` | `TasksManagePage.jsx` | HR + Admin |
| **Management: Manage Leave** | `/leave/manage` | `LeaveManagePage.jsx` | HR + Admin |
| **Management: Manage Payroll** | `/payroll/manage` | `PayrollManagePage.jsx` | HR + Admin |
| **Management: Manage Documents** | `/hr/documents` | `HRDocumentsManagementPage.jsx` | HR Only |
| **Management: Attendance Management** | `/hr/attendance-management` | `HRAttendanceManagementPage.jsx` | HR Only |
| **Management: Departments** | `/admin/department` | `DepartmentManagePage.jsx` | HR + Admin |
| **Management: Logs** | `/admin/attendance` | `AdminAttendancePage.jsx` | HR + Admin |
| **Management: Team** | `/admin/users` | `UsersPage.jsx` | HR + Admin |

### **Admin-Only Routes (NOT Available to HR)**

| Feature | URL | Page Component | Admin Only | Reason |
|---------|-----|----------------|-----------|--------|
| **HR Group Management** | `/admin/hr` | `HRTeamPage.jsx` | ✅ | Premium feature, manage HR team |
| **Company Settings** | `/admin/company-settings` | `CompanySettingsPage.jsx` | ✅ | System configuration |
| **Complaints Management** | `/admin/complaints` | `AdminComplaintsPage.jsx` | ✅ | Full complaint oversight |
| **Documents Management** | `/admin/documents` | `AdminDocumentManagementPage.jsx` | ✅ | System-wide document control |
| **Leave Types Management** | `/leave/types` | `LeaveTypeManagementPage.jsx` | ✅ | System configuration |
| **HR Leave Approval** | `/leave/hr-approval` | `HRLeaveApprovalPage.jsx` | ✅ | Approve HR's own leave |
| **Activity Timeline** | `/admin/activity-timeline` | `ActivityTimelinePage.jsx` | ✅ | Full system audit trail |
| **Attendance Management** | `/admin/attendance-management` | `AdminAttendanceManagementPage.jsx` | ✅ | Master attendance control |

---

## 👥 EMPLOYEE MANAGEMENT CAPABILITIES

### **What HR CAN Do**

#### 1. **View Team ("Team" page @ `/admin/users`)**
- View all regular employees
- View employee profiles (geolocation, contact info, bio)
- Search/filter employees
- **Backend Endpoint:** `GET /users` (requires Auth)

#### 2. **Manage Leave Requests (ONLY for Employees)**
- Approve/reject employee leave requests
- View leave status
- Add rejection reasons
- **Backend Endpoint:** `GET/PATCH /leave/hr/user-leaves`
- **Limitation:** Cannot manage HR's own leave - only admin can

#### 3. **Manage Payroll (ONLY for Employees)**
- View payroll records
- Create/edit payroll for employees
- Download payroll slips
- View payroll stats
- **Backend Endpoint:** `GET/POST/PATCH /payroll`
- **Limitation:** HR sees only regular employees, not admin or other HR

#### 4. **Manage Tasks**
- Create, assign, and manage tasks for employees
- **Backend Endpoint:** `GET/POST/PATCH /tasks`

#### 5. **Manage Attendance**
- View attendance logs
- Edit individual attendance records
- Select employee → view records by day/week/month
- **Backend Endpoint:** `GET /attendance` (with userId filter)
- **Limitation:** Cannot manually mark attendance globally, only edit existing records

#### 6. **Manage Documents (HR-Specific)**
- Assign document submission tasks to employees
- Approve/reject document submissions
- View stats: pending, submitted, approved, rejected, overdue
- Filter by team or overdue status
- **Backend Endpoint:** `GET/POST /documents/*`
- **Limitation:** Can only manage employee documents, not company documents

#### 7. **Manage Departments**
- View/create/edit departments
- Manage designations within departments
- **Backend Endpoint:** `GET/POST/PATCH /department/*`
- **Shared with Admin:** Yes

---

### **What HR CANNOT Do**

| Feature | Admin Can | HR Can | Backend Restriction |
|---------|:---------:|:------:|---------------------|
| **Create Employee Accounts** | ✅ | ❌ | `POST /users` - HR limited to USER role only |
| **Create Admin/HR Accounts** | ✅ | ❌ | Controller checks: `req.user.role === HR && role !== USER` → 403 Forbidden |
| **Edit Employee Accounts** | ✅ | ✅ | `PATCH /users/:id` - Allowed for HR |
| **Delete Employee Accounts** | ✅ | ❌ | `DELETE /users/:id` - Admin only (terminateUser) |
| **Manage HR Team** | ✅ | ❌ | `/admin/hr-team` admin-only, requires `requireRole(ROLES.ADMIN)` |
| **Manage Leave Types** | ✅ | ❌ | `/leave/types` admin-only |
| **Approve HR Leave** | ✅ | ❌ | `/leave/hr-approval` admin-only |
| **Set Company Location** | ✅ | ❌ | `POST /admin/company-location` - `requireRole(ROLES.ADMIN)` |
| **Set Working Days** | ✅ | ❌ | `POST /admin/working-days` - `requireRole(ROLES.ADMIN)` |
| **Company Settings** | ✅ | ❌ | `/admin/company-settings` - Admin only |
| **View System Audit Trail** | ✅ | ❌ | `/admin/activity-timeline` - Admin only |
| **Manage All Documents** | ✅ | ❌ | `/admin/documents` - Admin only, HR has separate `/hr/documents` |
| **Manage Complaints** | ✅ (Full) | ❌ | `/admin/complaints` - Admin only |

---

## 🔐 Backend API Access Control

### **User Management Endpoints**

```javascript
// users.routes.js Access Rules:

POST /users
├─ Requires: Authentication + (ADMIN or HR role)
├─ Admin: Can create ADMIN, HR, or USER
├─ HR: Can create USER only
└─ Violation: Returns 403 Forbidden

GET /users
├─ Requires: Authentication only
├─ Returns: All users (paginated)
└─ Used by: All roles for task assignment

GET /users/:id
├─ Requires: Authentication + (ADMIN or HR role)
└─ Used by: HR to view specific employee details

PATCH /users/:id
├─ Requires: Authentication + (ADMIN or HR role)
├─ HR: Can edit any employee
└─ Used by: HR to update employee info

DELETE /users/:id
├─ Requires: Authentication + ADMIN role only
├─ HR: FORBIDDEN (403)
└─ Used by: Admin to terminate employees
```

### **Admin Routes (HR-Specific Access)**

```javascript
// admin.routes.js Access Rules:

All routes start with:
router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN, ROLES.HR));

GET /admin/users ✅ HR Can Access
├─ Returns: All users for HR's team viewing
└─ Used by: HR "Team" page

GET /admin/users/:id ✅ HR Can Access
├─ Returns: Single user details
└─ Used by: HR employee details modal

DELETE /admin/users/:id ❌ HR FORBIDDEN
├─ Requires: ADMIN role only
└─ Used by: Admin to terminate employees

GET /admin/payroll ✅ HR Can Access
GET /admin/attendance ✅ HR Can Access
GET /admin/worksheets ✅ HR Can Access

POST /admin/company-location ❌ HR FORBIDDEN
├─ Requires: ADMIN role only
└─ Sets office geofence coordinates

POST /admin/working-days ❌ HR FORBIDDEN
├─ Requires: ADMIN role only
└─ Sets company working days
```

---

## 📋 SIDEBAR NAVIGATION LOGIC

```javascript
// From RoleBasedSidebar.jsx

const adminLinks = isAdmin ? [
  "/admin/documents"           // ✅ Admin only
  "/admin/department"          // ✅ Shared (Admin + HR)
  "/admin/attendance"          // ✅ Shared (Admin + HR)
  "/admin/attendance-management"
  "/admin/users"              // "All Staff" - ✅ Shared
  "/admin/hr"                 // "HR Group" - ❌ Admin only
  "/admin/company-settings"   // ❌ Admin only
  "/admin/complaints"         // ❌ Admin only
  "/leave/types"              // ❌ Admin only
] : [];

const hrLinks = isHR ? [
  "/tasks/manage"                 // ✅ HR only
  "/leave/manage"                 // ✅ HR only
  "/payroll/manage"               // ✅ HR only
  "/hr/documents"                 // ✅ HR only (separate from admin docs)
  "/hr/attendance-management"     // ✅ HR only
  "/admin/department"             // ✅ Shared
  "/admin/attendance"             // ✅ Shared
  "/admin/users"                  // "Team" - ✅ Shared
] : [];
```

**Key Difference:**
- **Admin sees:** `/admin/users` labeled as "**All Staff**"
- **HR sees:** `/admin/users` labeled as "**Team**" (same endpoint, different label)
- Both use the same `UsersPage.jsx` component

---

## 🎯 RECOMMENDATIONS FOR HR ENHANCEMENTS

### **1. CRITICAL - Add Employee Lifecycle Management**
**What HR needs but currently can't do:**

#### A. Create Employee Accounts
```
Current State: HR cannot create employees (only Admin can)
Recommended: Allow HR to create USER-role employees
Backend Change:
- Modify /users POST endpoint to allow HR role
- HR creates only USER role (already exists)
- Requires form for: name, email, phone, role, department, designation
```

#### B. Edit Employee Details
```
Current State: HR can edit employees ✅
Limitation: Cannot bulk edit
Recommended: 
- Add bulk employee data import (CSV)
- Add batch update for department transfers
```

#### C. Terminate/Deactivate Employees
```
Current State: HR cannot delete employees (Admin only)
Recommended: Allow HR to deactivate employees
Backend Change:
- Add status field: ACTIVE/INACTIVE/TERMINATED
- Allow HR to change status to INACTIVE
- Keep hard delete (DELETE endpoint) for Admin only
Frontend: Add "Deactivate Employee" button to employee modal
```

### **2. IMPORTANT - Enhance Leave Management**
```
Current State: HR can approve employee leave, but not their own team's leave
Limitation: Admin approves HR leave via separate page
Recommended:
- Add HR self-service leave request page
- Let HR request leave (stored separately)
- Auto-route to Admin for approval
- Show pending HR leave count in sidebar
```

### **3. IMPORTANT - Add Attendance Marking Capability**
```
Current State: HR can only edit existing attendance, not mark new attendance
Recommended:
- Add "Mark Attendance" button for employees without check-in
- Allow HR to bulk mark attendance (useful for employees with geolocation issues)
- Add "Mark Present", "Mark Absent", "Mark Leave" options
- Audit trail: Log who marked attendance for compliance
```

### **4. IMPORTANT - Employee Directory with Filters**
```
Current State: HR can view "Team" @ /admin/users
Recommended Enhancements:
- Add advanced filters: Department, Designation, Joining Date, Status
- Export to CSV for reporting
- Add employee analytics: headcount by dept, new hires, turnover
- Add employee directory PDF for printing
```

### **5. NICE-TO-HAVE - HR Self-Service Features**
```
- View HR team activity timeline (already exists @ /hr/activity-timeline? Check if route active)
- HR analytics dashboard (department stats, attendance trends)
- Bulk document assignment
- Payroll report generation
```

### **6. CRITICAL - Fix Permissions Documentation**
```
Current Issue: Code has comments but HR might not know:
- What endpoints they can access
- What endpoints return 403 Forbidden
- What features are coming vs what's not available

Solution:
- Create in-app permission check
- Show "Feature locked for Admin only" message
- Add help text explaining role hierarchy
```

---

## 🔄 EMPLOYEE DATA FLOW

### **For Admin Managing All Staff:**
```
Admin logs in
  ↓
Sidebar shows "/admin/users" as "All Staff"
  ↓
Can create ADMIN/HR/USER roles
  ↓
Can delete (terminate) employees
  ↓
Can manage system settings
```

### **For HR Managing Team:**
```
HR logs in
  ↓
Sidebar shows "/admin/users" as "Team" 
  ↓
Can view all employees (but labeled as team)
  ↓
Cannot create new employees ❌
  ↓
Cannot delete/terminate employees ❌
  ↓
Can approve leave/payroll/attendance ✅
```

---

## 📊 FEATURE COMPARISON TABLE

| Feature | Admin | HR | Employee |
|---------|:-----:|:---:|:---------:|
| **View Dashboard** | ✅ | ✅ | ✅ |
| **View All Staff** | ✅ | ✅ (labeled "Team") | ❌ |
| **Create Employees** | ✅ | ❌ | ❌ |
| **Edit Employee Details** | ✅ | ✅ | ✅ (self only) |
| **Delete/Terminate Employees** | ✅ | ❌ | ❌ |
| **Approve Employee Leave** | ✅ | ✅ | ❌ |
| **Approve HR Leave** | ✅ | ❌ | ❌ |
| **Manage Payroll** | ✅ | ✅ | ❌ |
| **Mark Attendance** | ✅* | ❌ | ❌ |
| **Edit Attendance** | ✅ | ✅ | ❌ |
| **Manage Tasks** | ✅ | ✅ | ❌ |
| **Manage Documents** | ✅ (all) | ✅ (employee only) | ❌ |
| **Set Company Location** | ✅ | ❌ | ❌ |
| **Manage Leave Types** | ✅ | ❌ | ❌ |
| **View Activity Log** | ✅ | ❌ | ❌ |
| **Company Settings** | ✅ | ❌ | ❌ |

`*` Admin can edit attendance but cannot directly mark attendance via UI

---

## 🚀 IMPLEMENTATION PRIORITY

### **Phase 1 - Critical (Week 1)**
1. Allow HR to create employee accounts
2. Allow HR to deactivate/reactivate employees
3. Add "Mark Attendance" to HR

### **Phase 2 - Important (Week 2)**
1. HR self-service leave requests
2. Advanced employee filters (dept, status, joining date)
3. CSV employee export

### **Phase 3 - Enhancement (Week 3)**
1. Bulk attendance marking
2. Employee analytics for HR
3. Department-specific dashboards

### **Phase 4 - Nice-to-Have**
1. Employee directory PDF
2. Integration with external HRIS
3. Bulk payroll adjustments

---

## 📝 BACKEND CHANGES NEEDED

### **To Allow HR to Create Employees:**
```javascript
// File: server/src/modules/users/users.controller.js
// Current (Line ~15):
if (req.user.role === ROLES.HR && data.role && data.role !== ROLES.USER) {
  throw new ApiError(StatusCodes.FORBIDDEN, "HR can only create employee accounts");
}

// Already allows HR to create USER role! ✅
// Just need Frontend button/form → Already exists in UsersPage.jsx @ line 170+
```

### **To Allow HR to Deactivate Employees:**
```javascript
// File: server/src/modules/users/users.controller.js
// Add new endpoint:
router.patch("/:id/deactivate", requireRole(ROLES.ADMIN, ROLES.HR), userController.deactivateUser);

// Implementation:
export const deactivateUser = asyncHandler(async (req, res) => {
  const { status } = req.body; // "ACTIVE", "INACTIVE", "TERMINATED"
  
  if (req.user.role === ROLES.HR && status === "TERMINATED") {
    throw new ApiError(403, "HR can only deactivate, not terminate employees");
  }
  
  const user = await updateUser(req.params.id, { status });
  res.json(user);
});
```

### **To Allow HR to Mark Attendance:**
```javascript
// File: server/src/modules/attendance/attendance.routes.js
// Add new endpoint:
router.post("/mark", requireRole(ROLES.ADMIN, ROLES.HR), attendanceController.markAttendance);

// Implementation:
export const markAttendance = asyncHandler(async (req, res) => {
  const { userId, status, date } = req.body;
  
  // Validate HR is marking for their team, not other HR/Admin
  if (req.user.role === ROLES.HR && canManageUser(req.user, userId)) {
    // Create attendance record
  }
});
```

---

## ✅ CURRENT STATUS SUMMARY

### **Working Correctly:**
- ✅ HR can approve employee leave
- ✅ HR can manage employee payroll
- ✅ HR can view and edit attendance records
- ✅ HR can view all employees
- ✅ HR can manage tasks
- ✅ HR can manage documents (employee submissions)
- ✅ HR can manage departments

### **Broken/Missing:**
- ❌ HR cannot CREATE employees (API allows, but UI missing)
- ❌ HR cannot DELETE/TERMINATE employees
- ❌ HR cannot MARK new attendance (only edit existing)
- ❌ HR cannot request their own leave
- ❌ No bulk actions for employees
- ❌ No employee export/reporting

### **Working as Designed (Restricted to Admin):**
- ✅ Admin can create HR/Admin accounts (security feature)
- ✅ Admin can terminate employees (final decision)
- ✅ Admin approves HR leave (oversight)
- ✅ Admin can set company location (single source of truth)

---

## 📞 QUICK REFERENCE

**HR Management Pages:**
- `/admin/users` → View/edit team members
- `/admin/attendance` → View attendance logs
- `/admin/department` → Manage departments
- `/leave/manage` → Approve employee leave
- `/payroll/manage` → Manage payroll
- `/tasks/manage` → Create/assign tasks
- `/hr/documents` → Manage document submissions
- `/hr/attendance-management` → Edit specific employee attendance

**Admin-Only Pages:**
- `/admin/hr` → Manage HR team (premium feature)
- `/admin/company-settings` → System configuration
- `/admin/documents` → Manage all company documents
- `/leave/types` → Configure leave types
- `/admin/activity-timeline` → View system audit trail
