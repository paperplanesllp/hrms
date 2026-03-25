# Calendar & HR Management - Detailed Feature Guide

## 📅 Calendar Views Explained

### **For Regular Users:**
```
┌─ Calendar View ─────────────────────────────────┐
│ March 2026                                       │
├─────────────────────────────────────────────────┤
│ Sun | Mon | Tue | Wed | Thu | Fri | Sat        │
├─────────────────────────────────────────────────┤
│  1  │  2  │  3  │  4  │  5  │  6  │  7         │
│     │ 09:30│     │ 09:30│     │     │ ####      │ <- Weekend
├─────────────────────────────────────────────────┤
│  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14        │
│ 🔵  │ 🔵  │ 🔵  │ 09:30│ 09:30│ 09:30│ ####   │ <- Leave (3 days)
├─────────────────────────────────────────────────┤
│ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │ 21        │
│ 🟡  │ 09:30│ 🔴  │ 09:30│ 09:30│ 09:30│ ####  │ <- 15: Delay Shift
│                                            <- 17: Public Holiday
├─────────────────────────────────────────────────┤

Legend:
  #### = Weekend (No work)
  🔵 = Leave Approved (User took leave)
  🟡 = Delay Shift (Later start time)
  🔴 = Public Holiday (Company holiday)
  09:30 = Full Shift start time
```

### **Benefits for Users:**
✅ See which dates they can request leave
✅ Know when they're on approved leave
✅ Understand their shift timings
✅ Identify public holidays (no work)
✅ Plan their work schedule

---

## 👨‍💼 HR Management Dashboard

### **What HR Can Do:**

#### **1. View Dashboard Statistics**
```
┌─ HR Dashboard ──────────────────────────┐
│ Present Today: 45 employees             │
│ Late Today: 3 employees                 │
│ Pending Leaves: 8 requests              │
│ Payroll Pending: 0 payments             │
└─────────────────────────────────────────┘
```
**API Endpoint:** `GET /api/dashboard/stats`
- **Permission:** Admin & HR only
- **Updates:** Real-time count from database

---

#### **2. Manage News & Announcements**

**Create Company News:**
```
┌─ Add News Update ─────────────────────┐
│ Title: "New Work From Home Policy"    │
│ Message: "Starting March 15th, all... │
│ [Create] [Cancel]                     │
└──────────────────────────────────────┘
```
**API Endpoint:** `POST /api/news`
**Permissions:** Admin & HR
**Appears in:** 
- Dashboard (latest 5 news)
- News Page (all users can read)

---

#### **3. Manage Attendance Records**

**Edit Employee Attendance:**
```
┌─ Edit Attendance ──────────────────────────┐
│ Employee: John Wilson                      │
│ Date: 2026-03-03                          │
│ Check-in: 09:45         [Edit]            │
│ Check-out: 18:30        [Edit]            │
│ Status: LATE            [Change to PRESENT]│
│ [Save] [Cancel]                           │
└────────────────────────────────────────────┘
```
**API Endpoints:**
- `PATCH /api/attendance/edit` - Modify attendance records
- `GET /api/attendance` - View all employees' attendance

---

#### **4. Manage Leave Requests**

**Review & Approve Leaves:**
```
┌─ Leave Requests ──────────────────────────┐
│ 1. Alice | Mar 8-10 | Status: PENDING    │
│    Reason: Medical treatment             │
│    [✓ Approve] [✗ Reject] [Edit]         │
│                                           │
│ 2. Bob | Mar 15-16 | Status: PENDING     │
│    Reason: Personal                      │
│    [✓ Approve] [✗ Reject] [Edit]         │
│                                           │
│ 3. Carol | Mar 20-22 | Status: APPROVED  │
│    Reason: Vacation                      │
│    [Edit] [Delete]                       │
└───────────────────────────────────────────┘
```
**API Endpoints:**
- `PATCH /api/leave/:id` - Approve, Reject, or Edit leave
- `GET /api/leave` (Admin only) - View all leave requests

---

#### **5. Manage Calendar & Holidays**

**Set Public Holidays & Shift Times:**
```
┌─ Calendar Management ──────────────────────┐
│ Date: 2026-03-17                          │
│ Event: Independence Day                   │
│ Type: ☑ Public Holiday                    │
│       ☐ Special Shift                     │
│                                           │
│ Shift Times (if special):                 │
│ Start: 10:00  [Change]                    │
│ End: 17:00    [Change]                    │
│ [Save] [Delete Event] [Cancel]            │
└────────────────────────────────────────────┘
```
**API Endpoints:**
- `GET /api/calendar` - View all holidays & shifts
- `PUT /api/calendar` - Add/modify holidays and shift times
- **Permission:** Admin only

---

## 📊 Data Flow for News Management

```
┌─────────────────┐
│  HR/Admin User  │
└────────┬────────┘
         │
         │ 1. Creates News
         ↓
    ┌────────────────────┐
    │  POST /api/news    │
    │  {                 │
    │    title: "...",   │
    │    message: "..."  │
    │  }                 │
    └────────┬───────────┘
             │
             ↓
    ┌────────────────────┐
    │  MongoDB - News    │
    │  Collection        │
    │  {_id, title,      │
    │   message,         │
    │   createdBy,       │
    │   createdAt}       │
    └────────┬───────────┘
             │
             │ 2. Appears in Dashboard
             ↓
    ┌────────────────────────────────────┐
    │  GET /api/news?limit=5             │
    │  Returns latest 5 announcements    │
    └────────┬───────────────────────────┘
             │
             │ 3. All users see news
             ↓
    ┌────────────────────────────────┐
    │  Dashboard - Company Updates   │
    │  [Shows 5 latest news items]   │
    └────────────────────────────────┘

User can also:
   PATCH /api/news/:id  - Edit announcement
   DELETE /api/news/:id - Remove announcement
```

---

## 🎨 Frontend Components That Use These Features

### **Calendar Component:**
- 📄 Location: `src/features/calendar/CalendarPage.jsx`
- 📡 API Calls:
  - `GET /api/calendar` - Load calendar events
  - `PUT /api/calendar` - Update holidays (HR only)
- 🎯 Shows: Leave dates, public holidays, shift times

### **Attendance Component:**
- 📄 Location: `src/features/attendance/AttendancePage.jsx`
- 📡 API Calls:
  - `GET /api/attendance` - Load attendance records
  - `POST /api/attendance/checkin` - Mark check-in
  - `PATCH /api/attendance/edit` - Edit records (HR)
- 🎯 Shows: Check-in/check-out times, status (PRESENT/LATE/ABSENT)

### **News Component:**
- 📄 Dashboard uses: `src/features/dashboard/DashboardPage.jsx`
- 📡 API Call: `GET /api/news?limit=5`
- 🎯 Shows: Latest company announcements

### **Leave Component:**
- 📄 Location: `src/features/leave/LeaveManagePage.jsx` (HR view)
- 📄 Location: `src/features/leave/LeaveMyPage.jsx` (User view)
- 📡 API Calls:
  - `GET /api/leave/my` - User's leaves
  - `POST /api/leave` - Request new leave
  - `PATCH /api/leave/:id` - Approve/Reject (HR)
  - `DELETE /api/leave/:id` - Delete leave
- 🎯 Shows: Leave requests with status

---

## 🔐 Access Control Matrix

| Feature | User | HR | Admin |
|---------|------|----|----|
| View own calendar | ✅ | ✅ | ✅ |
| View employee calendar | ❌ | ✅ | ✅ |
| Create holiday | ❌ | ❌ | ✅ |
| View attendance | ❌ | ✅ | ✅ |
| Mark check-in | ✅ | ✅ | ✅ |
| Edit attendance | ❌ | ✅ | ✅ |
| Request leave | ✅ | ✅ | ✅ |
| Approve leave | ❌ | ✅ | ✅ |
| Create news | ❌ | ✅ | ✅ |
| View news | ✅ | ✅ | ✅ |
| Edit news | ❌ | ✅ | ✅ |
| Delete news | ❌ | ✅ | ✅ |

---

## 🚨 Error Prevention

### **Before These Fixes:**
```
User tries to load Dashboard
    ↓
Frontend calls GET /api/dashboard/stats
    ↓
❌ 404 Not Found - Endpoint doesn't exist
    ↓
Dashboard fails to load stats
    ↓
UI shows broken state
```

### **After These Fixes:**
```
User logs in as HR/Admin
    ↓
Frontend calls GET /api/dashboard/stats (+ JWT token)
    ↓
✅ Backend returns statistics
    ↓
Dashboard loads properly with:
   - Present Today: 45
   - Late Today: 3
   - Pending Leaves: 8
    ↓
✅ UI displays beautiful stat cards
    ↓
HR can manage company updates
```

---

## 📋 Testing Checklist

### **For Users:**
- [ ] Calendar shows their approved leaves
- [ ] Calendar shows public holidays
- [ ] Can see their own attendance
- [ ] Can check-in for the day
- [ ] Can request new leave
- [ ] Can see company news on dashboard

### **For HR/Admin:**
- [ ] Dashboard stats are accurate
- [ ] Can create news announcements
- [ ] Can edit existing news
- [ ] Can delete old news
- [ ] Can view all employees' attendance
- [ ] Can edit attendance records
- [ ] Can approve/reject leave requests
- [ ] Can set public holidays
- [ ] Can adjust shift times

---

## 💡 Future Enhancements

1. **Calendar Export** - Download calendar as PDF/ICS
2. **Shift Swapping** - Employees can swap shifts with each other
3. **Advanced Analytics** - Attendance trends, leave patterns
4. **Email Notifications** - Send updates when leaves are approved/rejected
5. **Mobile App** - Native mobile support for attendance
6. **Geolocation Check-in** - GPS-based location verification
7. **News Categories** - Organize announcements by category
8. **Bulk Leave Approval** - Approve multiple leaves at once

