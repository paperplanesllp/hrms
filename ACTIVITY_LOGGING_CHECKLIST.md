# Activity Logging System - Implementation Checklist

**Date Started:** _______________  
**Date Completed:** _______________  
**Implemented By:** _______________  

---

## Pre-Implementation

- [ ] **Read Documentation**
  - [ ] Reviewed ACTIVITY_LOGGING_QUICKSTART.md
  - [ ] Understood ACTIVITY_LOGGING_ARCHITECTURE.md
  - [ ] Reviewed ACTIVITY_LOGGING_IMPLEMENTATION.md

- [ ] **Environment Check**
  - [ ] MongoDB is running
  - [ ] Server runs without errors: `npm start` in `/server`
  - [ ] Frontend builds without errors: `npm run dev` in `/erp-dashboard`
  - [ ] You can login to the application

- [ ] **Repository Status**
  - [ ] No uncommitted changes (or saved to branch)
  - [ ] On working branch (not main)
  - [ ] Recent backup exists

---

## Backend Setup

### File Creation ✓

- [x] **Created:** `server/src/modules/activity/ActivityLog.model.js`
  - [x] Contains proper Mongoose schema
  - [x] Has all required fields
  - [x] Indexes are defined

- [x] **Created:** `server/src/modules/activity/activity.service.js`
  - [x] createActivityLog() function
  - [x] getActivityLogs() function
  - [x] getHRTimeline() function
  - [x] getAdminTimeline() function
  - [x] getUserActivities() function

- [x] **Created:** `server/src/modules/activity/activity.controller.js`
  - [x] getMyActivities controller
  - [x] getHRTimelineController controller
  - [x] getAdminTimelineController controller
  - [x] getAllActivities controller
  - [x] All have proper error handling

- [x] **Created:** `server/src/modules/activity/activity.routes.js`
  - [x] All 4 routes defined
  - [x] requireAuth middleware applied
  - [x] Proper HTTP methods (GET)

- [x] **Created:** `server/src/modules/activity/activity.seed.js`
  - [x] Sample data defined
  - [x] seedActivityLogs() function
  - [x] Example response formats

### Integration Steps ✓

- [x] **Modified:** `server/src/app.js`
  - [x] Import added: `import activityRoutes from "./modules/activity/activity.routes.js"`
  - [x] Routes mounted: `app.use("/api/activity", activityRoutes)`
  - [x] Mounted AFTER `app.use("/api", noCache)` middleware
  - [x] Server still starts without errors

- [x] **Modified:** `server/src/modules/auth/auth.service.js`
  - [x] Import added: `import { createActivityLog } from "../activity/activity.service.js"`
  - [x] login() function has createActivityLog call
  - [x] logout() function has createActivityLog call
  - [x] Both log correct actionType and description

- [x] **Modified:** `server/src/modules/users/users.controller.js`
  - [x] Import added: `import { createActivityLog } from "../activity/activity.service.js"`
  - [x] updateMe() function has createActivityLog call
  - [x] Logs only when fields actually changed
  - [x] Includes changedFields in metadata

### Database ✓

- [x] **MongoDB**
  - [ ] Run: `db.createCollection("activitylogs")` (optional - Mongoose creates automatically)
  - [ ] Or let Mongoose create on first write (recommended)
  - [ ] Indexes created automatically by Mongoose

### Testing Backend

- [ ] **Start Server**
  ```bash
  cd server
  npm start
  # Should see: "✅ Server running on http://localhost:5000"
  ```

- [ ] **Test MongoDB Connection**
  - [ ] Open MongoDB client
  - [ ] Check database exists
  - [ ] Connect string is valid

- [ ] **Test API with cURL**
  ```bash
  # 1. Login and get token
  TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@gmail.com","password":"PASSWORD"}' \
    | jq '.accessToken')
  
  # 2. Get your activities
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:5000/api/activity/my-activities
  
  # 3. Get HR timeline (if HR role)
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:5000/api/activity/hr-timeline
  ```

- [ ] **Create Test Activity**
  - [ ] Login as staff user
  - [ ] Update profile (add phone or name)
  - [ ] Check database: new PROFILE_UPDATE activity exists

- [ ] **Verify Activity Fields**
  - [ ] Check MongoDB:
    ```javascript
    db.activitylogs.findOne({})
    // Should have: actorId, actorName, actorRole, 
    //             actionType, module, description, 
    //             createdAt, visibility
    ```

---

## Frontend Setup

### File Creation ✓

- [x] **Created:** `erp-dashboard/src/components/common/ActivityTimeline.jsx`
  - [x] TimelineCard component
  - [x] ActivityTimeline component
  - [x] HRTimeline component
  - [x] AdminTimeline component
  - [x] All imports present (lucide icons)

- [x] **Created:** `erp-dashboard/src/hooks/useActivityTimeline.js`
  - [x] useActivityTimeline hook
  - [x] fetchActivities method
  - [x] loadMore method
  - [x] refresh method

- [x] **Created:** `erp-dashboard/src/features/hr/HRActivityTimelinePage.jsx`
  - [x] Component defined
  - [x] Uses HRTimeline component
  - [x] Has role check

- [x] **Created:** `erp-dashboard/src/features/admin/ActivityTimelinePage.jsx`
  - [x] Component defined
  - [x] Uses AdminTimeline component
  - [x] Has role check

### Router Integration

- [ ] **Add Routes**
  
  Edit your main routing file (e.g., `App.jsx` or `main.jsx`):
  
  ```jsx
  import HRActivityTimelinePage from "./features/hr/HRActivityTimelinePage";
  import AdminActivityTimelinePage from "./features/admin/ActivityTimelinePage";
  
  // In route definitions:
  {
    path: "/hr/activity-timeline",
    element: <HRActivityTimelinePage />,
    // Optional: Add requireRole check here
  },
  {
    path: "/admin/activity-timeline",
    element: <AdminActivityTimelinePage />,
    // Optional: Add requireRole check here
  }
  ```

- [ ] **Routing File Modified**
  - [ ] Routes imported successfully
  - [ ] Routes mounted at correct paths
  - [ ] Router file saved

### Dependencies Check

- [ ] **Check Lucide Icons**
  - [ ] Already installed in package.json?
  ```bash
  npm list lucide-react
  # Should show version OK
  ```

- [ ] **Check Fetch API**
  - [ ] Using native fetch (built-in, no dependency needed)

### Testing Frontend

- [ ] **Build Check**
  ```bash
  cd erp-dashboard
  npm run dev
  # Should compile without errors
  ```

- [ ] **Visit Pages**
  - [ ] Navigate to `/hr/activity-timeline`
  - [ ] Should see "Staff Activity Timeline" heading
  - [ ] Should see loading skeleton initially
  - [ ] Should show no activities (or sample if seed ran)

- [ ] **Login as Different Users**
  - [ ] Staff user at `/` path
  - [ ] HR user at `/hr/activity-timeline` (requires HR role)
  - [ ] Admin user at `/admin/activity-timeline` (requires ADMIN role)

---

## Feature Testing

### Test 1: Login Activity Logging

**Steps:**
1. [ ] Open browser DevTools (F12)
2. [ ] Clear localStorage: `localStorage.clear()`
3. [ ] Logout if already logged in
4. [ ] Login with valid credentials
5. [ ] Check MongoDB:
   ```javascript
   db.activitylogs.findOne({ actionType: "LOGIN" })
   ```

**Expected Result:**
- [ ] ActivityLog document created
- [ ] actionType: "LOGIN"
- [ ] actorName: "[Your Name]"
- [ ] description: "[Role] [Name] logged in"

**Pass:** ✓ / Fail: ✗

---

### Test 2: Profile Update Logging

**Steps:**
1. [ ] Login as staff user
2. [ ] Go to Profile page
3. [ ] Update a field (e.g., phone number)
4. [ ] Click Save
5. [ ] Check MongoDB:
   ```javascript
   db.activitylogs.findOne({ actionType: "PROFILE_UPDATE" })
   ```

**Expected Result:**
- [ ] ActivityLog created
- [ ] actionType: "PROFILE_UPDATE"
- [ ] metadata.updatedFields contains changed fields
- [ ] metadata.changes contains old/new values

**Pass:** ✓ / Fail: ✗

---

### Test 3: Logout Activity Logging

**Steps:**
1. [ ] Logged in
2. [ ] Click Logout
3. [ ] Check MongoDB:
   ```javascript
   db.activitylogs.findOne({ actionType: "LOGOUT" })
   ```

**Expected Result:**
- [ ] ActivityLog created
- [ ] actionType: "LOGOUT"
- [ ] description: "[Role] [Name] logged out"

**Pass:** ✓ / Fail: ✗

---

### Test 4: HR Timeline Access

**Steps:**
1. [ ] Login as HR user email (check if you have HR-role account)
2. [ ] Navigate to `/hr/activity-timeline`
3. [ ] Page loads without errors
4. [ ] Activities display (if database has any)
5. [ ] Pagination works (if >50 activities)

**Expected Result:**
- [ ] Page shows "Staff Activity Timeline"
- [ ] Shows staff activities (PROFILE, LEAVE, ATTENDANCE, DOCUMENT modules)
- [ ] Does NOT show HR login/logout
- [ ] Each card shows actor, description, timestamp
- [ ] Can scroll and see multiple activities

**Pass:** ✓ / Fail: ✗

---

### Test 5: Admin Timeline Access

**Steps:**
1. [ ] Login as ADMIN user
2. [ ] Navigate to `/admin/activity-timeline`
3. [ ] Page loads without errors
4. [ ] Activities display (if database has any)

**Expected Result:**
- [ ] Page shows "HR Activity Log"
- [ ] Shows HR login/logout activities
- [ ] Shows HR employee management actions
- [ ] Does NOT show staff profile updates (unless they did)
- [ ] Each card shows actor, description, timestamp

**Pass:** ✓ / Fail: ✗

---

### Test 6: API Endpoints

**Test GET /api/activity/my-activities**

```bash
TOKEN="<your_access_token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/activity/my-activities
```

- [ ] Returns 200 OK
- [ ] Response has `data` array
- [ ] Each item has correct structure
- [ ] Activities are yours (actorId matches)

**Pass:** ✓ / Fail: ✗

---

**Test GET /api/activity/hr-timeline**

```bash
TOKEN="<hr_token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/activity/hr-timeline
```

- [ ] Returns 200 OK (if HR role)
- [ ] Returns 403 Forbidden (if non-HR)
- [ ] Response has pagination fields
- [ ] Activities are filterable

**Pass:** ✓ / Fail: ✗

---

**Test GET /api/activity/admin-timeline**

```bash
TOKEN="<admin_token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/activity/admin-timeline
```

- [ ] Returns 200 OK (if ADMIN role)
- [ ] Returns 403 Forbidden (if non-Admin)
- [ ] Response has pagination fields

**Pass:** ✓ / Fail: ✗

---

### Test 7: Authentication & Authorization

**Test 1: Missing Token**

```bash
curl http://localhost:5000/api/activity/my-activities
# Should return 401 Unauthorized
```

- [ ] Returns 401 status code
- [ ] Error message about missing token

**Pass:** ✓ / Fail: ✗

---

**Test 2: Invalid Token**

```bash
curl -H "Authorization: Bearer INVALID" \
  http://localhost:5000/api/activity/my-activities
# Should return 401 Unauthorized
```

- [ ] Returns 401 status code
- [ ] Error message about invalid token

**Pass:** ✓ / Fail: ✗

---

**Test 3: Non-HR accessing HR Timeline**

1. [ ] Login as staff user
2. [ ] Try: `GET /api/activity/hr-timeline`
3. [ ] Should return 403 Forbidden

**Pass:** ✓ / Fail: ✗

---

**Test 4: Non-Admin accessing Admin Timeline**

1. [ ] Login as HR user
2. [ ] Try: `GET /api/activity/admin-timeline`
3. [ ] Should return 403 Forbidden

**Pass:** ✓ / Fail: ✗

---

## Optional: Seed Data Test

- [ ] **Have Sample Data Ready**

  If you want to test with existing data:

  ```bash
  cd server
  
  # Create seed.js if doesn't exist, or update existing:
  import { seedActivityLogs } from "./modules/activity/activity.seed.js";
  import { ActivityLog } from "./modules/activity/ActivityLog.model.js";
  
  // In your seed function:
  await seedActivityLogs(ActivityLog);
  ```

- [ ] **Run Seed Script**

  ```bash
  npm run seed
  # or your seed script command
  ```

- [ ] **Verify in MongoDB**

  ```javascript
  db.activitylogs.count()
  // Should show ~10 or more documents
  ```

- [ ] **Test Timeline Pages**

  - [ ] Visit `/hr/activity-timeline` - should show seed activities
  - [ ] Visit `/admin/activity-timeline` - should show seed activities

**Pass:** ✓ / Fail: ✗

---

## Integration with Existing Dashboard

- [ ] **Optional: Add to HR Dashboard**

  Edit your existing HR dashboard component (e.g., `features/hr/HRDashboard.jsx`):

  ```jsx
  import { HRTimeline } from "../../components/common/ActivityTimeline";
  
  // In component JSX:
  <div className="mt-8">
    <HRTimeline />
  </div>
  ```

- [ ] **Optional: Add to Admin Dashboard**

  Edit your existing Admin dashboard component:

  ```jsx
  import { AdminTimeline } from "../../components/common/ActivityTimeline";
  
  // In component JSX:
  <div className="mt-8">
    <AdminTimeline />
  </div>
  ```

- [ ] **Test Integration**
  - [ ] Dashboard still loads
  - [ ] Timeline appears
  - [ ] No console errors

---

## Performance & Optimization

- [ ] **Check Database Indexes**

  ```javascript
  db.activitylogs.getIndexes()
  // Should show:
  // - _id_ (automatic)
  // - createdAt_-1
  // - actorRole_1_createdAt_-1
  // - module_1_createdAt_-1
  // - actionType_1_createdAt_-1
  // - visibility_1_createdAt_-1
  ```

- [ ] **Test Query Performance**

  ```javascript
  // Should complete quickly (<100ms)
  db.activitylogs.find({ module: "PROFILE" }).limit(50).explain("executionStats")
  ```

- [ ] **Monitor Collection Size**

  ```javascript
  db.activitylogs.stats()
  // Check avgObjSize, count, size
  ```

---

## Security Validation

- [ ] **Verify No Sensitive Data**

  ```javascript
  // Check a few documents
  db.activitylogs.findOne({})
  
  // Should NOT contain:
  // - passwords
  // - tokens
  // - API keys
  
  // SHOULD contain:
  // - actionType
  // - description
  // - metadata (non-sensitive)
  // - timestamps
  ```

- [ ] **Verify Role Checks**

  - [ ] Staff can't see HR timeline
  - [ ] HR can't see Admin timeline
  - [ ] Admin can see everything (HR + admin activities)

- [ ] **Check CORS**

  - [ ] Frontend and Backend same domain? Or CORS configured?
  - [ ] No browser CORS errors in DevTools

---

## Code Review

- [ ] **Backend Code**
  - [ ] All files use consistent naming
  - [ ] Comments present on complex logic
  - [ ] Error handling present
  - [ ] No console.log left in production code

- [ ] **Frontend Code**
  - [ ] Components follow React best practices
  - [ ] No memory leaks (proper useEffect cleanup)
  - [ ] Accessibility (alt text, labels, semantic HTML)
  - [ ] No TypeScript errors (if using TS)

- [ ] **Documentation**
  - [ ] Code has JSDoc comments
  - [ ] All files have headers
  - [ ] Parameters documented

---

## Git Commit

- [ ] **Stage Files**
  ```bash
  git status
  # Review all changed files
  
  git add server/src/modules/activity/
  git add server/src/app.js
  git add server/src/modules/auth/auth.service.js
  git add server/src/modules/users/users.controller.js
  git add erp-dashboard/src/components/common/ActivityTimeline.jsx
  git add erp-dashboard/src/hooks/useActivityTimeline.js
  git add erp-dashboard/src/features/hr/HRActivityTimelinePage.jsx
  git add erp-dashboard/src/features/admin/ActivityTimelinePage.jsx
  ```

- [ ] **Review Changes**
  ```bash
  git diff --cached
  # Check everything looks correct
  ```

- [ ] **Commit**
  ```bash
  git commit -m "feat: implement activity logging system with timelines for HR and Admin"
  ```

- [ ] **Push**
  ```bash
  git push origin activity-logging-feature
  ```

---

## Documentation

- [ ] **Files Created**
  - [x] ACTIVITY_LOGGING_SUMMARY.md - Overview
  - [x] ACTIVITY_LOGGING_QUICKSTART.md - Quick start guide
  - [x] ACTIVITY_LOGGING_IMPLEMENTATION.md - Complete reference
  - [x] ACTIVITY_LOGGING_INTEGRATION_EXAMPLES.md - 9 examples
  - [x] ACTIVITY_LOGGING_ARCHITECTURE.md - Architecture deep dive
  - [x] ACTIVITY_LOGGING_CHECKLIST.md - This file

- [ ] **Reviewed All Docs**
  - [ ] Read summaries
  - [ ] Understand architecture
  - [ ] Know how to test
  - [ ] Know how to extend

---

## Final Verification

- [ ] **Everything Works End-to-End**

  1. [ ] Login as staff
  2. [ ] Update profile → Activity logged
  3. [ ] Logout → Activity logged
  4. [ ] Login as HR
  5. [ ] Check `/hr/activity-timeline` → Sees staff activities
  6. [ ] Login as Admin
  7. [ ] Check `/admin/activity-timeline` → Sees HR activities

- [ ] **No Errors in Console**

  - [ ] Browser console clean
  - [ ] No network errors (DevTools Network tab)
  - [ ] No server errors (terminal)

- [ ] **Ready for Production**

  - [ ] Code reviewed
  - [ ] Tests pass
  - [ ] Documentation complete
  - [ ] Performance acceptable
  - [ ] Security validated

---

## Notes & Issues

### Known Issues:

(Record any issues encountered during setup)

```
Issue 1: _____________________________________
Resolution: _________________________________

Issue 2: _____________________________________
Resolution: _________________________________
```

### Custom Modifications:

(Record any customizations made)

```
Modification 1: _____________________________
Details: __________________________________

Modification 2: _____________________________
Details: __________________________________
```

### Performance Notes:

(Record any performance observations)

```
Database queries: ___________________________
Response times: _____________________________
Memory usage: _______________________________
```

---

## Handoff Checklist

- [ ] **Team Member Trained**
  - [ ] Shown system overview
  - [ ] Walked through code
  - [ ] Demonstrated testing
  - [ ] Shared documentation links

- [ ] **Documentation Accessible**
  - [ ] All .md files in root directory
  - [ ] Team has read access
  - [ ] Links in README point to docs

- [ ] **Support Plan**
  - [ ] Who maintains this going forward?
  - [ ] How to report issues?
  - [ ] Process for adding new action types?

---

## Sign-Off

- **Implemented By:** _______________________
- **Reviewed By:** _______________________  
- **Approved By:** _______________________
- **Date Completed:** _______________________

---

## Next Steps

- [ ] Add more activity logging (leave approvals, employee management)
- [ ] Implement real-time updates with Socket.io
- [ ] Add email notifications for important activities
- [ ] Build activity search functionality
- [ ] Create compliance reports
- [ ] Archive activities older than 2 years
- [ ] Add activity statistics dashboard
- [ ] Implement CSV export

---

**Congratulations! 🎉 Activity Logging System is ready to use!**

For questions, refer to the documentation files in the root directory.
