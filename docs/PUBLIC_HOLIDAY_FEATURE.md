# Public Holiday Marking Feature

## Overview
When HR creates a public holiday, the system automatically marks everyone's calendar as **HOLIDAY** (not ABSENT). However, if an employee took leave on that day, they will be marked as **ABSENT** instead.

## How It Works

### 1. HR Creates a Public Holiday
- HR goes to Calendar → Create Event
- Sets **Purpose** to "PUBLIC_HOLIDAY"
- Sets **Visibility** to "PUBLIC"
- Selects the date and holiday name (e.g., "Diwali")

### 2. System Automatically Marks Attendance
When the public holiday is created, the system:

1. **Gets all active employees** (non-admin users)
2. **For each employee**, checks:
   - Did they take an APPROVED leave on this date?
   - If YES → Mark as **ABSENT** (they took leave, so not a holiday for them)
   - If NO → Mark as **HOLIDAY** (they get the day off)
3. **Creates/Updates attendance records** with:
   - `status`: "HOLIDAY" or "ABSENT"
   - `totalHours`: 0
   - `checkIn`: "" (empty)
   - `checkOut`: "" (empty)
   - `shiftName`: Holiday name

### 3. Calendar Display
- **Employees see**: Holiday marked on their calendar
- **HR sees**: Holiday marked for all employees (with leave status visible)
- **Payroll**: Holidays are not counted as working days

## Example Scenarios

### Scenario 1: Regular Holiday
- Date: 2025-03-14 (Holi)
- Employee: John (no leave)
- **Result**: Marked as HOLIDAY ✓

### Scenario 2: Holiday + Employee on Leave
- Date: 2025-03-14 (Holi)
- Employee: Sarah (took approved leave from 2025-03-10 to 2025-03-15)
- **Result**: Marked as ABSENT (she's on leave, not holiday) ✓

### Scenario 3: Holiday + Cancelled Leave
- Date: 2025-03-14 (Holi)
- Employee: Mike (had leave but cancelled it)
- **Result**: Marked as HOLIDAY ✓

## Database Changes

### Attendance Record
```javascript
{
  userId: ObjectId,
  date: "2025-03-14",
  status: "HOLIDAY" | "ABSENT",
  totalHours: 0,
  checkIn: "",
  checkOut: "",
  shiftName: "Holi",
  shiftStart: "09:30",
  shiftEnd: "18:30"
}
```

## API Endpoints

### Create Public Holiday
```
POST /calendar/events
Content-Type: application/json

{
  "title": "Diwali",
  "description": "Festival of Lights",
  "date": "2025-11-01",
  "startTime": "00:00",
  "endTime": "23:59",
  "purpose": "PUBLIC_HOLIDAY",
  "color": "red"
}
```

**Response**: All employees automatically marked as HOLIDAY (or ABSENT if on leave)

### Update Public Holiday
```
PUT /calendar/events/:id
Content-Type: application/json

{
  "title": "Diwali (Updated)",
  "date": "2025-11-02"
}
```

**Response**: Attendance records updated for all employees

### Delete Public Holiday
```
DELETE /calendar/events/:id
```

**Response**: Holiday cancelled, attendance records updated

## Code Changes

### 1. Calendar Service (`calendar.service.js`)
- Updated `syncPublicHolidayAttendance()` function
- Now checks for approved leaves before marking
- Marks as ABSENT if leave exists, HOLIDAY otherwise

### 2. Attendance Service (`attendance.service.js`)
- Updated `autoMarkAbsenteesForDate()` function
- Added `markPublicHolidayForAllEmployees()` function
- Both now check for leaves before marking

## Testing

### Test Case 1: Create Holiday
1. Create a public holiday for tomorrow
2. Check attendance records for all employees
3. Verify status is "HOLIDAY"

### Test Case 2: Create Holiday with Leave
1. Create an approved leave for an employee
2. Create a public holiday on the same date
3. Check that employee's attendance
4. Verify status is "ABSENT"

### Test Case 3: Update Holiday Date
1. Create a public holiday
2. Update the date
3. Check old date attendance (should be cleared)
4. Check new date attendance (should be marked)

## Permissions

- **HR**: Can create/update/delete public holidays
- **Admin**: Can create/update/delete public holidays
- **Employees**: Can view public holidays (read-only)

## Notes

- Public holidays are marked for **all active employees**
- Inactive employees are skipped
- Admin users are **not** marked (they can work on holidays)
- Leave takes precedence over holiday marking
- Holidays are synced in real-time when created/updated
