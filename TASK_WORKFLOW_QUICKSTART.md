# ⚡ Task Workflow System - Quick Start Guide

## 🎯 What Was Implemented

A complete professional task workflow system with:
- ✅ Task hold/resume functionality
- ✅ Task reassignment with history tracking
- ✅ Automatic overdue detection
- ✅ Workload checking (max 6 active tasks per user)
- ✅ Task timeline/activity history
- ✅ Dashboard metrics with completion rates
- ✅ Activity logging for all actions
- ✅ Real-time UI updates via WebSocket
- ✅ Timezone support (Asia/Kolkata IST)

---

## 🚀 Getting Started

### 1. **Verify Backend is Running**
```bash
# In server directory
npm run dev
# Should show: ✅ Task scheduler initialized - running every minute
```

### 2. **Test API Endpoints**

#### Hold a Task
```bash
curl -X PUT http://localhost:5000/api/tasks/{taskId}/hold \
  -H "Authorization: Bearer {authToken}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Waiting for approval"}'
```

#### Resume Task
```bash
curl -X PUT http://localhost:5000/api/tasks/{taskId}/resume-hold \
  -H "Authorization: Bearer {authToken}"
```

#### Reassign Task
```bash
curl -X PUT http://localhost:5000/api/tasks/{taskId}/reassign \
  -H "Authorization: Bearer {authToken}" \
  -H "Content-Type: application/json" \
  -d '{"newAssigneeId": "userId", "reason": "Better expertise"}'
```

#### Check Workload
```bash
curl -X GET http://localhost:5000/api/tasks/check-workload/{userId} \
  -H "Authorization: Bearer {authToken}"
```

#### Get Task Timeline
```bash
curl -X GET http://localhost:5000/api/tasks/{taskId}/timeline \
  -H "Authorization: Bearer {authToken}"
```

#### Dashboard Metrics
```bash
curl -X GET http://localhost:5000/api/tasks/dashboard/metrics \
  -H "Authorization: Bearer {authToken}"
```

### 3. **Test Frontend UI**

1. **Navigate to Tasks Page**
   - Open http://localhost:5174/tasks or 5173

2. **Open a Task Detail Modal**
   - Click on any task to see the modal
   - New buttons should appear based on task status

3. **Test Hold**
   - Click "Hold" button (shows on IN_PROGRESS tasks)
   - Enter reason in modal
   - Watch status change to ON_HOLD

4. **Test Resume**
   - Click "Resume" button (shows on ON_HOLD tasks)
   - Watch status change back to IN_PROGRESS

5. **Test Reassign**
   - Click "Reassign" button
   - Select new assignee
   - Enter reason (optional)
   - Watch task reassign

6. **View Timeline**
   - Click "Timeline" button
   - See all task events (creation, holds, reassignments)

---

## 📊 Status Workflow Diagram

```
PENDING
   ↓
IN_PROGRESS
   ├─→ HOLD (click "Hold")
   │   └─→ IN_PROGRESS (click "Resume")
   │
   ├─→ REASSIGNED (click "Reassign")
   │
   └─→ COMPLETED (click "Mark Complete" or set progress to 100%)

OVERDUE (auto-set when dueDate < today and status != COMPLETED)

Note: HOLD requires a reason. REASSIGN stores history.
```

---

## 🎨 UI Button Behavior

### Status: **PENDING**
- ✅ Mark Complete
- 📜 Timeline

### Status: **IN_PROGRESS**
- ✅ Mark Complete
- ⏸️ Hold
- 🔄 Reassign
- 📜 Timeline

### Status: **ON_HOLD**
- ✅ Mark Complete
- ▶️ Resume
- 🔄 Reassign
- 📜 Timeline
- ⚠️ Shows hold reason in yellow banner

### Status: **COMPLETED**
- 📜 Timeline (view only)

---

## 📈 Key Features Explained

### Hold/Resume
- **Purpose**: Temporarily pause task without removing from workload
- **When to use**: Blocked on dependencies, awaiting approval, etc.
- **Required**: Hold reason for audit trail
- **Visible**: In task details, shows as yellow "On Hold" badge

### Reassign
- **Purpose**: Move task to different team member
- **When to use**: Resource availability, expertise needed, etc.
- **Tracked**: Full history stored in reassignedHistory array
- **Auto-logged**: Activity log automatically created

### Workload Check
- **Threshold**: Maximum 6 active tasks per user
- **Active**: Tasks with status PENDING, IN_PROGRESS, or ON_HOLD
- **Warning**: Shows when trying to assign if user would exceed limit
- **API**: GET /api/tasks/check-workload/:userId

### Overdue Detection
- **Auto-runs**: Every minute via scheduler
- **Criteria**: dueDate < now AND status != 'completed'
- **Action**: Automatically sets status to 'overdue'
- **Notification**: Sent to assignees
- **Audit**: Logged with system as actor

### Dashboard Metrics
- **Completion Rate**: (completed / total) × 100
- **Active Tasks**: Sum of PENDING + IN_PROGRESS + ON_HOLD
- **Overdue**: Count of tasks past due date
- **By Priority**: Breakdown of HIGH, MEDIUM, LOW, URGENT
- **Time Period**: Configurable (week, month, quarter, year)

---

## 🔍 Verification Steps

### 1. Check Scheduler
```bash
# In browser DevTools (open task page)
# Should see logs like:
console.log('✅ Task scheduler initialized - running every minute')
```

### 2. Verify Task Model
```bash
# In browser, open any task detail modal
# Look for yellow "On Hold" badge and hold reason
```

### 3. Check Activity Logs
```bash
# After holding/resuming/reassigning a task
# Check admin panel → Activity Logs
# Should see entries for each action
```

### 4. Test Overdue
```bash
# Create task with dueDate in past
# Wait for scheduler to run (1 minute)
# Refresh page - status should be 'overdue'
```

### 5. Monitor Workload
```bash
# Go to assign task page
# Select a user
# Check workload warning appears if > 6 active tasks
```

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Buttons don't appear | Task status not loading | Refresh modal, check network tab |
| Hold modal won't submit | Reason field empty | Enter hold reason text |
| Reassign not working | No assignee selected | Select user from dropdown |
| No overdue detection | Scheduler not running | Check server logs for scheduler |
| Wrong times in timeline | Timezone issue | Verify backend uses IST (Asia/Kolkata) |
| No activity logs | Logs being skipped | Check activity.service.js is imported |

---

## 📱 Mobile/Responsive Testing

- ✅ Modal fits on mobile (max-w-2xl)
- ✅ Buttons stack on small screens (flex-wrap)
- ✅ Timeline readable on mobile (max-h-[80vh])
- ✅ Textarea for hold reason responsive

---

## 🔐 Security Checklist

- ✅ Only assigned users can hold/resume their tasks
- ✅ Only assigners or admins can reassign
- ✅ All actions require authentication
- ✅ Activity logs record who did what and when
- ✅ Soft delete enabled (isDeleted flag)

---

## 📚 Key Files Modified

### Backend (5 files)
1. Task.model.js - Added fields for hold & history
2. tasks.service.js - Added workflow methods
3. tasks.controller.js - Added workflow endpoints
4. tasks.routes.js - Added routes
5. taskScheduler.service.js - Enhanced overdue check

### Frontend (2 files)
1. taskService.js - Added API client methods
2. TaskDetailsModal.jsx - Complete UI rewrite

---

## ✅ Testing Checklist

Run through these to verify everything works:

- [ ] Can hold a task (status → ON_HOLD, hold reason saved)
- [ ] Can resume from hold (status → IN_PROGRESS, hold reason cleared)
- [ ] Can reassign (task assigned to new user, history recorded)
- [ ] Can view timeline (shows all events with dates)
- [ ] Workload check shows count and warning (if > 6)
- [ ] Overdue auto-detection works (runs every minute)
- [ ] Activity logs created (check admin panel)
- [ ] Timezone correct (uses IST, not UTC)
- [ ] UI buttons appear/hide based on status
- [ ] Modals work (hold, reassign, timeline)
- [ ] Socket events trigger real-time updates
- [ ] Permissions enforced (only assigned users can act)

---

## 🎓 Example Workflow

1. **Monday 9 AM**: Create task "Design Homepage" for Bob
   - Status: PENDING
   - Assign to: Bob Smith
   - Due: Friday 5 PM

2. **Monday 10 AM**: Bob starts task
   - Status: IN_PROGRESS
   - Activity log: "Bob started task"

3. **Tuesday 2 PM**: Task stuck waiting for UX feedback
   - Click "Hold"
   - Reason: "Waiting for UX feedback on wireframes"
   - Status: ON_HOLD
   - Activity log: "Bob held task - reason: Waiting for UX feedback..."

4. **Wednesday 11 AM**: UX feedback received
   - Click "Resume"
   - Status: IN_PROGRESS
   - Activity log: "Bob resumed task"

5. **Thursday 1 PM**: Bob realizes needs Vue.js expertise
   - Click "Reassign"
   - Select: Alice Patel
   - Reason: "Alice has more Vue.js experience"
   - Status: IN_PROGRESS (assigned to Alice)
   - Activity log: "Bob reassigned task to Alice - reason: Alice has more Vue.js experience"
   - Reassign history recorded

6. **Friday 4 PM**: Alice completes task
   - Click "Mark Complete"
   - Status: COMPLETED
   - Progress: 100%
   - Activity log: "Alice completed task"

7. **View anytime**: Click "Timeline" to see all above events

---

## 🎉 Next Steps

1. **Test** using the checklist above
2. **Deploy** to production when ready
3. **Monitor** activity logs for usage patterns
4. **Gather feedback** from team
5. **Iterate** on workflow based on feedback

---

**Ready?** Start by opening a task and clicking the "Timeline" button to see existing activity! 🚀

For detailed API docs, see: `TASK_WORKFLOW_IMPLEMENTATION.md`
