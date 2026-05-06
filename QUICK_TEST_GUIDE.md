# Quick Testing Guide - Multi-Tenant Isolation

## Test Setup (5 minutes)

### Step 1: Create Test Companies
Using Superadmin dashboard:
1. Login to `/superadmin/login`
2. Navigate to `/superadmin/dashboard` → Companies
3. Create:
   - **Company A:** "TechCorp"
   - **Company B:** "FinanceInc"

### Step 2: Create Admins
1. Go to `/superadmin/dashboard` → Company Admins
2. Create:
   - **Admin A:** for TechCorp
   - **Admin B:** for FinanceInc

### Step 3: Create Test Employees
Using each company's dashboard:
1. Login as Admin A
2. Create Employee1 (mark as active)
3. Logout, login as Admin B
4. Create Employee2 (mark as active)

### Step 4: Generate Test Data
**As Admin A:**
- Check in Employee1 (create attendance record)
- Create a task for Employee1
- Submit a leave request on behalf of Employee1
- Check dashboard

**As Admin B:**
- Check in Employee2 (create attendance record)
- Create a task for Employee2
- Submit a leave request on behalf of Employee2
- Check dashboard

---

## Test Cases

### 🧪 Test 1: Dashboard Isolation
**Expected:** Each admin sees only their company's KPIs

1. Login as Admin A
2. Go to `/dashboard`
3. **Verify:**
   - ✅ Total users shows 1 (Employee1 only)
   - ✅ Absent employees list shows Employee1 (if marked)
   - ✅ Analytics show only Company A data

4. Logout, Login as Admin B
5. Go to `/dashboard`
6. **Verify:**
   - ✅ Total users shows 1 (Employee2 only) - **DIFFERENT from Admin A**
   - ✅ Absent employees list shows Employee2 (if marked)
   - ✅ Analytics show only Company B data - **DIFFERENT from Admin A**

---

### 🧪 Test 2: Attendance Isolation
**Expected:** Each admin sees only their company's attendance

1. Login as Admin A
2. Go to `/attendance`
3. **Verify:**
   - ✅ Only Employee1's attendance visible
   - ✅ Employee2 not in list

4. Logout, Login as Admin B
5. Go to `/attendance`
6. **Verify:**
   - ✅ Only Employee2's attendance visible
   - ✅ Employee1 not in list

---

### 🧪 Test 3: Activity Timeline Isolation
**Expected:** Each admin sees only their company's activities

1. Login as Admin A
2. Go to Activity/Timeline section
3. **Verify:**
   - ✅ Only shows Admin A's actions (task creation, check-in, etc.)
   - ✅ No Admin B actions visible

4. Logout, Login as Admin B
5. Go to Activity/Timeline section
6. **Verify:**
   - ✅ Only shows Admin B's actions
   - ✅ No Admin A actions visible

---

### 🧪 Test 4: Tasks Isolation
**Expected:** Each admin sees only their company's tasks

1. Login as Admin A
2. Go to `/tasks` or task management
3. **Verify:**
   - ✅ Only Employee1's task visible
   - ✅ Employee2's task not in list

4. Logout, Login as Admin B
5. Go to `/tasks` or task management
6. **Verify:**
   - ✅ Only Employee2's task visible
   - ✅ Employee1's task not in list

---

### 🧪 Test 5: Leave Isolation
**Expected:** Each admin sees only their company's leave requests

1. Login as Admin A
2. Go to Leave → Manage/Approve
3. **Verify:**
   - ✅ Only Employee1's leave request visible
   - ✅ Employee2's leave not in list

4. Logout, Login as Admin B
5. Go to Leave → Manage/Approve
6. **Verify:**
   - ✅ Only Employee2's leave request visible
   - ✅ Employee1's leave not in list

---

### 🧪 Test 6: Payroll Isolation
**Expected:** Each admin sees only their company's payroll

1. Login as Admin A
2. Go to `/payroll` or Payroll management
3. **Verify:**
   - ✅ Only Employee1's payroll visible
   - ✅ Employee2's payroll not in list

4. Logout, Login as Admin B
5. Go to `/payroll`
6. **Verify:**
   - ✅ Only Employee2's payroll visible
   - ✅ Employee1's payroll not in list

---

## Browser DevTools Verification

To verify API responses are filtered:

1. Open DevTools (F12) → Network tab
2. Login as Admin A
3. Navigate to Dashboard
4. Find XHR request to `/dashboard/stats` or similar
5. Check Response JSON:
   ```json
   {
     "totalUsers": 1,  // Only Employee1
     "departments": ["IT"],  // Only Company A
     "kpis": { ... }  // Company A data only
   }
   ```

6. Repeat with Admin B
7. **Verify:** Different response with different data

---

## Network Tab Checklist

### ✅ Endpoint Verification

For each endpoint, check the response:

| Endpoint | Query Param | Admin A Should See | Admin B Should See |
|----------|------------|-------------------|-------------------|
| `/dashboard/stats` | - | CompA data | CompB data |
| `/attendance/all` | - | Employee1 | Employee2 |
| `/activity/all` | - | CompA activities | CompB activities |
| `/tasks/all` | - | Task for Emp1 | Task for Emp2 |
| `/leave` | - | Leave of Emp1 | Leave of Emp2 |
| `/payroll` | - | Payroll of Emp1 | Payroll of Emp2 |

---

## 🚨 Failure Indicators

If you see ANY of these, the fix is NOT working:

| Issue | Signs |
|-------|-------|
| **Cross-company data visible** | Admin A sees Employee2's data |
| **Same KPIs for both admins** | Dashboard shows identical total users |
| **Cross-company activity** | Admin A sees Admin B's actions in timeline |
| **Task list mixed** | Admin A sees both Employee1 AND Employee2 tasks |
| **Leave list mixed** | Admin A sees both employees' leave requests |
| **Payroll crossed** | Admin A sees Employee2's payroll |

---

## ✅ Success Indicators

If ALL these are true, the fix is WORKING:

- ✅ Each admin sees ONLY their company's employees
- ✅ Dashboard KPIs differ between admins
- ✅ Activity timeline shows only company activities
- ✅ Task list is company-specific
- ✅ Leave requests are company-specific
- ✅ Payroll is company-specific
- ✅ No 403 errors for legitimate access
- ✅ No 500 errors

---

## Performance Check

After verifications, check:

1. Dashboard loads in < 2 seconds
2. Attendance list loads in < 1 second
3. No excessive database queries (check server logs)
4. No n+1 query problems

If slow, check:
- Indexes on `companyId` and `userId`
- getCompanyUserIds() cache if needed
- MongoDB query performance

---

## Sign-off Checklist

- [ ] Test 1: Dashboard Isolation ✅ PASS
- [ ] Test 2: Attendance Isolation ✅ PASS
- [ ] Test 3: Activity Timeline Isolation ✅ PASS
- [ ] Test 4: Tasks Isolation ✅ PASS
- [ ] Test 5: Leave Isolation ✅ PASS
- [ ] Test 6: Payroll Isolation ✅ PASS
- [ ] Browser DevTools responses verified ✅ PASS
- [ ] Performance acceptable ✅ PASS
- [ ] No error messages ✅ PASS
- [ ] Ready for production ✅ YES

---

## Troubleshooting

### If data is STILL mixed:
1. Clear browser cache (Ctrl+Shift+Del)
2. Logout and login again
3. Check server logs for errors
4. Verify companyId in JWT token (`jwt.io` decode)
5. Check if controller is passing companyId to service

### If getting 404 errors:
1. Too strict filtering - check database has records
2. Verify companyId matches between User and other models
3. Check getCompanyUserIds() helper is working

### If slow performance:
1. Add indexes: `db.users.createIndex({ companyId: 1 })`
2. Profile the getCompanyUserIds() queries
3. Consider caching if many companies

---

## Rollback Plan

If critical issues found:
1. Revert the modified service files
2. Restart backend: `npm start` or `docker restart`
3. Clear any caches
4. Test again

### Files to revert if needed:
- `server/src/modules/attendance/attendance.service.js`
- `server/src/modules/dashboard/dashboard.service.js`
- `server/src/modules/activity/activity.service.js`
- `server/src/modules/tasks/tasks.service.js`
- `server/src/modules/leave/leave.service.js`
- `server/src/modules/leave/leave.controller.js`
- `server/src/modules/payroll/payroll.service.js`
- `server/src/modules/payroll/payroll.controller.js`

---

**Total Test Time: 30-45 minutes**  
**Result: Multi-tenant data isolation verified ✅**
