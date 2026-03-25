# Activity Logging System - Quick Start Guide

## What Was Implemented

✅ **Backend:**
- MongoDB ActivityLog model with proper schema & indexing
- Activity logging service (centralized, reusable)
- API routes for timelines (HR, Admin, personal)
- Integrated login/logout logging
- Integrated profile update logging

✅ **Frontend:**
- Reusable TimelineCard & ActivityTimeline components
- HRTimeline & AdminTimeline components
- useActivityTimeline hook for data fetching
- HR Activity Timeline Page
- Admin Activity Log Page

✅ **Documentation & Testing:**
- Complete implementation guide
- Seed data with examples
- Sample API responses

---

## Quick Setup (5 minutes)

### 1. Backend is Ready to Use

No additional setup needed! The following are already integrated:

```javascript
// Login/logout automatically logged
// Profile updates automatically logged
// Activity routes mounted at /api/activity/*
```

### 2. Add Routes to Frontend Router

In your routing configuration (e.g., `App.jsx` or your route config file):

```jsx
import HRActivityTimelinePage from "./features/hr/HRActivityTimelinePage";
import AdminActivityTimelinePage from "./features/admin/ActivityTimelinePage";

// In your route definitions, add:
{
  path: "/hr/activity-timeline",
  element: <HRActivityTimelinePage />,
  requiredRole: "HR" // or use your role check
},
{
  path: "/admin/activity-timeline", 
  element: <AdminActivityTimelinePage />,
  requiredRole: "ADMIN"
}
```

### 3. Test It

**Option A: Quick Manual Test**

1. Start server & frontend
2. Login as a user → generates LOGIN activity
3. Visit profile page and update something → generates PROFILE_UPDATE activity
4. Logout → generates LOGOUT activity
5. Login as HR → visit `/hr/activity-timeline` to see all staff activities
6. Login as Admin → visit `/admin/activity-timeline` to see HR activities

**Option B: Use Seed Data**

1. Run your seed script (if you have one)
2. Import seed function in seed script:
   ```javascript
   import { seedActivityLogs } from "./modules/activity/activity.seed.js";
   import { ActivityLog } from "./modules/activity/ActivityLog.model.js";
   
   await seedActivityLogs(ActivityLog);
   ```
3. Run: `npm run seed`
4. Check MongoDB to verify ~10 sample activities were inserted

**Option C: API Testing**

```bash
# Get your activities (any logged-in user)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:5000/api/activity/my-activities

# Get HR timeline (login as HR first to get token)
curl -H "Authorization: Bearer <HR_TOKEN>" \
  http://localhost:5000/api/activity/hr-timeline

# Get Admin timeline (login as ADMIN)
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:5000/api/activity/admin-timeline
```

---

## File Summary

### Backend Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `server/src/modules/activity/ActivityLog.model.js` | ✅ Created | Schema definition |
| `server/src/modules/activity/activity.service.js` | ✅ Created | Core business logic |
| `server/src/modules/activity/activity.controller.js` | ✅ Created | Request handlers |
| `server/src/modules/activity/activity.routes.js` | ✅ Created | Route definitions |
| `server/src/modules/activity/activity.seed.js` | ✅ Created | Sample data |
| `server/src/app.js` | ✅ Modified | Added activity routes |
| `server/src/modules/auth/auth.service.js` | ✅ Modified | Added login/logout logging |
| `server/src/modules/users/users.controller.js` | ✅ Modified | Added profile update logging |

### Frontend Files Created

| File | Purpose |
|------|---------|
| `erp-dashboard/src/components/common/ActivityTimeline.jsx` | Timeline components |
| `erp-dashboard/src/hooks/useActivityTimeline.js` | Data fetching hook |
| `erp-dashboard/src/features/hr/HRActivityTimelinePage.jsx` | HR dashboard page |
| `erp-dashboard/src/features/admin/ActivityTimelinePage.jsx` | Admin dashboard page |

### Documentation Files

| File |
|------|
| `ACTIVITY_LOGGING_IMPLEMENTATION.md` |

---

## Key Features Explained

### 1. Automatic Logging

**Login/Logout** - Logged automatically when user authenticates

```
User logs in → ActivityLog entry created with:
- Action: LOGIN
- Description: "HR John Doe logged in"
- Actor info, timestamp, email in metadata
```

**Profile Updates** - Logged when user updates their profile

```
User updates phone/email → ActivityLog entry created with:
- Action: PROFILE_UPDATE
- Description: "User John updated personal profile (phone, email)"
- Changed fields listed in metadata
```

### 2. HR Timeline

Shows all staff activities that HR needs to monitor:
- Profile updates
- Leave requests/approvals
- Attendance check-in/out
- Document uploads
- Employee updates

**Access:** `/hr/activity-timeline`

**Who can see:** HR and Admin users

### 3. Admin Timeline

Shows HR-level and system activities:
- HR login/logout
- HR employee management actions
- Admin system actions
- Policy updates

**Access:** `/admin/activity-timeline`

**Who can see:** Admin users only

### 4. Personal Activity

Shows activities by current user:
- User's own profile updates
- User's login/logout history
- Actions user performed

**API Endpoint:** `GET /api/activity/my-activities`

---

## How to Add More Logging

### Pattern 1: Log a Controller Action

```javascript
import { createActivityLog } from "../activity/activity.service.js";

export const myAction = asyncHandler(async (req, res) => {
  // ... do something ...
  
  // Add this
  await createActivityLog({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    actionType: "ACTION_TYPE",
    module: "MODULE_NAME",
    description: "Human readable description",
    metadata: { any: "relevant data" },
    targetUserId: targetUserId, // if action affects another user
    targetUserName: targetUserName
  });

  res.json({ /* response */ });
});
```

### Pattern 2: Log with Conditional Visibility

```javascript
await createActivityLog({
  // ... other fields ...
  visibility: req.user.role === "ADMIN" ? "ADMIN_ONLY" : "PUBLIC"
});
```

### Pattern 3: Non-blocking Logging (won't crash if logging fails)

```javascript
// The createActivityLog function handles errors internally
// If logging fails, it returns null and doesn't throw
try {
  const log = await createActivityLog({ /* ... */ });
  if (!log) console.warn("Activity logging failed but operation succeeded");
} catch (error) {
  // This won't happen - createActivityLog catches errors internally
}
```

---

## Common Questions

**Q: What happens if activity logging fails?**
A: It doesn't crash the operation. The function is designed to be fire-and-forget - if logging fails, the main operation continues.

**Q: Can I see my own activity?**
A: Yes! Visit `/api/activity/my-activities` to see actions you performed.

**Q: Are sensitive fields logged?**
A: No. Passwords, tokens, and sensitive data are intentionally not logged. Only action metadata is stored.

**Q: How much storage does this use?**
A: Each log is ~300-500 bytes. With 1000 daily actions, expect ~300KB/day or ~100MB/year.

**Q: Can users see HR/Admin activities?**
A: No. HR and admin timelines require proper role. Staff users can only see their own activities.

**Q: How do I filter activities by date?**
A: Use query parameters:
```
/api/activity/hr-timeline?startDate=2024-03-01&endDate=2024-03-31
```

**Q: Can I export activities?**
A: Not yet, but it's easy to add:
```javascript
// In activity.controller.js, add:
export const exportActivities = asyncHandler(async (req, res) => {
  const result = await getActivityLogs(/* filters */);
  const csv = convertToCSV(result.logs);
  res.setHeader('Content-Disposition', 'attachment; filename="activities.csv"');
  res.send(csv);
});
```

---

## Troubleshooting

### "401 Unauthorized" error

**Problem:** Token not sent or invalid
**Solution:** 
- Make sure you're logged in
- Check that Authorization header is being sent: `Authorization: Bearer <token>`
- Token may be expired - refresh and try again

### Activities not showing in HR timeline

**Problem:** Possible causes:
- No activities created yet (create by updating profile, logging in/out)
- User doesn't have HR role
- Activities are hidden from this user

**Solution:**
- Manual test: update your profile to create an activity
- Check browser DevTools → Network tab → see response
- Login as HR user (admin@gmail.com might be HR if configured)

### Cannot create activity - "actorId required" error

**Problem:** Missing field in createActivityLog call
**Solution:** Ensure all required fields are provided:
```javascript
// REQUIRED:
- actorId (user._id)
- actorName (user.name)
- actorRole (user.role)
- actionType (one of the enums)
- module (one of the enums)
- description (string)
```

---

## Next Steps

### Potential Enhancements

1. **Real-time Updates via Socket.io**
   ```javascript
   // Emit on new activity
   io.emit("activity:created", activityLog);
   ```

2. **Notifications**
   ```javascript
   // Notify HR when leave is requested
   // Notify Admin when sensitive actions occur
   ```

3. **Reporting & Dashboard**
   ```javascript
   // Show activity stats: most active users, peak hours, etc.
   ```

4. **Activity Search**
   ```javascript
   // Full-text search on descriptions
   // Filter by date range, user, action type
   ```

5. **Data Archival**
   ```javascript
   // Move activities older than 1 year to archive collection
   // Keeps main collection performant
   ```

6. **Compliance Reports**
   ```javascript
   // Generate audit trails for compliance (SOC2, ISO27001)
   // Include IP, timestamps, user details
   ```

---

## Performance Tips

- Default pagination is 50 items - good balance
- Indexes automatically created on `createdAt`, `actorRole`, `module`, `actionType`
- Activity logs return lean() documents (smaller payload)
- Consider archiving activities older than 2 years

---

## Security Checklist

✅ All endpoints require authentication
✅ HR timeline requires HR/ADMIN role
✅ Admin timeline requires ADMIN role  
✅ Personal activities show only for that user
✅ Sensitive data not logged
✅ IP addresses optional for tracking
✅ Metadata is flexibile for custom fields

---

**Ready to use!** Start by:
1. Adding routes to your frontend router
2. Testing by updating your profile
3. Visiting `/hr/activity-timeline` or `/admin/activity-timeline`

Questions? See the full implementation guide: `ACTIVITY_LOGGING_IMPLEMENTATION.md`
