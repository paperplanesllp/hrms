# Task Workflow System - Implementation Guide

## Overview
A comprehensive professional task workflow system has been implemented for your HRMS task management module with advanced features including status transitions, task holding, reassignment tracking, overdue detection, workload management, and activity logging.

---

## ✅ Features Implemented

### 1. **Task Model Enhancements**
**File**: `server/src/modules/tasks/Task.model.js`

New fields added:
```javascript
// Hold reason (when status = ON_HOLD)
holdReason: String (max 1000 chars)

// Reassignment history tracking
reassignedHistory: [{
  previousAssignee: UserId,
  previousAssigneeName: String,
  newAssignee: UserId,
  newAssigneeName: String,
  reassignedBy: UserId,
  reason: String,
  reassignedAt: Date
}]
```

### 2. **Task Status Workflow**
Supported status transitions:
- `PENDING` → `IN_PROGRESS`
- `IN_PROGRESS` → `ON_HOLD` (with reason)
- `IN_PROGRESS` → `COMPLETED`
- `IN_PROGRESS` → `REASSIGNED`
- `ON_HOLD` → `IN_PROGRESS` (resume)
- `OVERDUE` (auto-set for past due dates)

When progress reaches 100%, status automatically transitions to `COMPLETED`.

### 3. **Backend APIs**

#### Hold Task
```
PUT /api/tasks/:id/hold
Request:
{
  reason: "Waiting for client approval"
}

Response:
{
  status: "on-hold",
  holdReason: "Waiting for client approval",
  ...taskData
}
```

#### Resume Task from Hold
```
PUT /api/tasks/:id/resume-hold
Response:
{
  status: "in-progress",
  holdReason: null,
  ...taskData
}
```

#### Reassign Task
```
PUT /api/tasks/:id/reassign
Request:
{
  newAssigneeId: "userId",
  reason: "Resource optimization"
}

Response:
{
  assignedTo: [newAssigneeId],
  reassignedHistory: [{...reassignmentRecord}],
  ...taskData
}
```

#### Get Task Timeline
```
GET /api/tasks/:id/timeline
Response:
{
  taskId: "...",
  title: "...",
  status: "...",
  timeline: [
    {
      type: "CREATED",
      timestamp: "2024-01-15T10:30:00Z",
      description: "Task created by John Doe",
      details: {...}
    },
    {
      type: "REASSIGNED",
      timestamp: "2024-01-16T14:20:00Z",
      description: "Reassigned from Jane to Bob",
      details: {...}
    },
    ...
  ]
}
```

#### Check Workload
```
GET /api/tasks/check-workload/:userId
Response:
{
  userId: "...",
  activeTasks: 5,
  workloadLimitWarning: false,
  message: "User has 5 active tasks for a healthy workload."
}
```

#### Dashboard Metrics
```
GET /api/tasks/dashboard/metrics
Response:
{
  completionRate: 72,
  totalTasks: 45,
  completedTasks: 32,
  inProgressTasks: 8,
  pendingTasks: 3,
  onHoldTasks: 2,
  cancelledTasks: 0,
  overdueCount: 1,
  byPriority: {
    LOW: 10,
    MEDIUM: 20,
    HIGH: 12,
    URGENT: 3
  },
  dateRange: "month"
}
```

### 4. **Service Layer Methods**

**File**: `server/src/modules/tasks/tasks.service.js`

New methods:
- `holdTask(taskId, userId, holdReason)` - Place task on hold
- `resumeTaskFromHold(taskId, userId)` - Resume from on-hold status
- `reassignTask(taskId, newAssigneeId, reasonText, performedById)` - Reassign to new user
- `getTaskTimeline(taskId)` - Get complete activity history
- `checkWorkload(userId)` - Count active tasks (warning if > 6)
- `checkAndUpdateOverdueTasks()` - Auto-mark past-due tasks as overdue

### 5. **Controller Methods**

**File**: `server/src/modules/tasks/tasks.controller.js`

New endpoints:
- `holdTask(req, res)` - Handle hold request
- `resumeTaskFromHold(req, res)` - Handle resume request
- `reassignTask(req, res)` - Handle reassignment
- `getTaskTimeline(req, res)` - Get timeline data
- `checkWorkload(req, res)` - Check user workload
- `getDashboardMetrics(req, res)` - Get metrics

### 6. **Routes**

**File**: `server/src/modules/tasks/tasks.routes.js`

New routes added:
```javascript
// Workflow Management
PUT /api/tasks/:id/hold
PUT /api/tasks/:id/resume-hold
PUT /api/tasks/:id/reassign
GET /api/tasks/:id/timeline
GET /api/tasks/check-workload/:userId
GET /api/tasks/dashboard/metrics
```

### 7. **Automatic Overdue Detection**

**File**: `server/src/services/taskScheduler.service.js`

Enhanced `checkForOverdueTasks()`:
- Runs every minute via cron job
- Automatically sets status to `overdue` for tasks with past due dates
- Sends notifications to assignees
- Marks notifications to avoid duplicates

### 8. **Activity Logging**

All workflow actions are logged with:
```javascript
{
  actionType: "TASK_STATUS_CHANGE|TASK_UPDATE",
  module: "TASK",
  description: "User action description",
  metadata: {
    taskId, title, status, reason, etc.
  },
  timestamp: Date.now()
}
```

Integration points:
- `holdTask` → logs "TASK_STATUS_CHANGE"
- `resumeTaskFromHold` → logs "TASK_STATUS_CHANGE"
- `reassignTask` → logs "TASK_UPDATE"

### 9. **Frontend Service**

**File**: `erp-dashboard/src/features/tasks/taskService.js`

New methods:
```javascript
async holdTask(taskId, reason)
async resumeTaskFromHold(taskId)
async reassignTask(taskId, newAssigneeId, reason)
async getTaskTimeline(taskId)
async checkWorkload(userId)
async getDashboardMetrics()
```

### 10. **Enhanced TaskDetailsModal Component**

**File**: `erp-dashboard/src/features/tasks/TaskDetailsModal.jsx`

New features:
- **Conditional action buttons** based on task status:
  - `IN_PROGRESS`: Shows Hold, Reassign, Complete buttons
  - `ON_HOLD`: Shows Resume, Reassign buttons
  - `COMPLETED`: View-only mode
  
- **Hold Modal**: Capture hold reason with textarea
- **Reassign Modal**: Select new assignee and provide reason
- **Timeline View**: Display full activity history
- **Hold Reason Display**: Shows current hold reason (yellow banner)
- **Overdue Indicator**: Highlights overdue status

---

## 🔄 Workflow Examples

### Example 1: Put Task on Hold
```
1. User clicks "Hold" button in task details
2. Modal appears asking for hold reason
3. User enters: "Waiting for design approval"
4. API: PUT /api/tasks/taskId/hold
5. Status changes: in-progress → on-hold
6. Activity log: "User held task 'Design Homepage' - Reason: Waiting for design approval"
7. Notification sent to assignee
```

### Example 2: Resume from Hold
```
1. User clicks "Resume" button
2. API: PUT /api/tasks/taskId/resume-hold
3. Status changes: on-hold → in-progress
4. holdReason cleared
5. Activity log: "User resumed task 'Design Homepage'"
```

### Example 3: Reassign Task
```
1. User clicks "Reassign" button
2. Modal shows available team members
3. User selects "Alice Patel" and enters reason: "Better expertise in Vue.js"
4. API: PUT /api/tasks/taskId/reassign
5. Task assigned to Alice
6. Previous assignee stored in reassignedHistory
7. Activity log: "User reassigned task from Bob to Alice"
```

### Example 4: Auto-Overdue Detection
```
1. Task due date: 2024-01-15 10:00 AM
2. Current time: 2024-01-16 2:00 PM IST
3. Scheduler runs every minute
4. Finds task with past due date and status != completed
5. Updates: status = "overdue"
6. Sends notification: "Task 'Submit Report' is now overdue"
7. Activity log: "System marked task as overdue"
```

### Example 5: Workload Check
```
1. Creating new task, selecting assignee "Bob"
2. API: GET /api/tasks/check-workload/bobUserId
3. Response: activeTasks: 7, workloadLimitWarning: true
4. UI shows warning: "Bob has 7 active tasks (limit: 6). Assignment may cause overload."
5. Option to proceed or select different assignee
```

---

## 📊 Dashboard Metrics

The new metrics endpoint provides:

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **completionRate** | % of tasks completed | (completed / total) × 100 |
| **totalTasks** | Total non-deleted tasks | COUNT(*) |
| **completedTasks** | Tasks with status = completed | COUNT(status='completed') |
| **activeTasks** | PENDING + IN_PROGRESS + ON_HOLD | COUNT(status IN [...]) |
| **overdueCount** | Tasks past due & not completed | COUNT(dueDate < now AND status != completed) |
| **byPriority** | Tasks grouped by priority | Aggregation by priority field |

**Timezone**: All calculations use `Asia/Kolkata (IST)`

---

## 🛠️ Technical Details

### Timezone Implementation
All date/time operations use `Asia/Kolkata` timezone:
- Frontend: `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`
- Backend: Dates stored in UTC, converted for display
- Database queries: Direct date comparisons work with UTC

### Database Optimizations
Indexes added for:
- `assignedTo: 1, status: 1` - Fast lookup of user's active tasks
- `dueDate: 1, status: 1` - Fast overdue detection
- `assignedBy: 1, createdAt: -1` - Fast lookup of assigned-by tasks

### Activity Logging
Integrated with existing `ActivityLog` model:
- All workflow changes automatically logged
- Module: 'TASK'
- Visibility: 'PUBLIC'
- Metadata includes context (taskId, title, priority, reason)

---

## 🚀 Usage Instructions

### For Task Managers
1. **Create Task**: Assign to user after checking workload
2. **Monitor**: View dashboard metrics for completion rates
3. **Hold/Resume**: Manage tasks by placing on hold when blocked
4. **Reassign**: Move tasks when priorities change
5. **Timeline**: View complete history of task changes

### For Task Assignees
1. **Mark Complete**: Set progress to 100% or click "Mark Complete"
2. **Hold**: Choose "Hold" if blocked, provide reason
3. **Resume**: Click "Resume" when unblocked
4. **View Timeline**: See all changes and reassignments

### For Admins/HR
1. **Dashboard**: Monitor team completion rates and metrics
2. **Workload**: Check user workload before assignments
3. **Analytics**: View performance by priority and status
4. **Reports**: Download activity logs for auditing

---

## 📝 Testing Checklist

- [ ] Hold task and verify status changes to ON_HOLD
- [ ] Resume from hold and verify return to IN_PROGRESS
- [ ] Reassign task and verify history is recorded
- [ ] View timeline and verify all events appear
- [ ] Check workload for different users
- [ ] Verify auto-overdue detection runs
- [ ] View dashboard metrics
- [ ] Test timezone calculations (IST)
- [ ] Verify activity logs are created
- [ ] Test socket notifications for status changes
- [ ] Test hold reason display in modal
- [ ] Test reassign with various reasons

---

## 🔌 Integration Points

### Socket Events
Existing socket integration (already in place):
- `notifyTaskStatusChanged()` - Triggered on Hold/Resume
- `notifyTaskUpdated()` - Triggered on Reassign
- Real-time UI updates via WebSocket

### Activity Logging
```javascript
createActivityLog({
  actorId: userId,
  actorName: userName,
  actorRole: userRole,
  actionType: 'TASK_STATUS_CHANGE' | 'TASK_UPDATE',
  module: 'TASK',
  description: 'Human-readable description',
  metadata: { taskId, title, status, ... },
  ipAddress: req.ip,
  visibility: 'PUBLIC'
})
```

---

## 📚 API Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tasks/:id/hold` | PUT | Place task on hold |
| `/tasks/:id/resume-hold` | PUT | Resume from hold |
| `/tasks/:id/reassign` | PUT | Reassign to new user |
| `/tasks/:id/timeline` | GET | Get activity history |
| `/tasks/check-workload/:userId` | GET | Check user workload |
| `/tasks/dashboard/metrics` | GET | Get dashboard metrics |

---

## 🐛 Troubleshooting

### Task not marking as overdue
- Check scheduler is running: `GET /tasks/debug/diagnostics`
- Verify task has status != 'completed'
- Check task dueDate is in past

### Workload warning not showing
- Verify active tasks count via `/tasks/check-workload/userId`
- Check threshold is > 6 tasks
- Verify statuses are PENDING, IN_PROGRESS, or ON_HOLD

### Activity logs not appearing
- Check ActivityLog collection has entries
- Verify createActivityLog was called
- Check user has proper permissions

### Timeline empty
- Verify task has reassignments or comments
- Check comments are properly saved
- Verify timestamps are valid dates

---

## 📦 Files Modified/Created

### Backend
- ✅ `server/src/modules/tasks/Task.model.js` - Added holdReason, reassignedHistory
- ✅ `server/src/modules/tasks/tasks.service.js` - Added 6 new service methods
- ✅ `server/src/modules/tasks/tasks.controller.js` - Added 6 new controller methods
- ✅ `server/src/modules/tasks/tasks.routes.js` - Added 6 new routes
- ✅ `server/src/services/taskScheduler.service.js` - Enhanced overdue detection

### Frontend
- ✅ `erp-dashboard/src/features/tasks/taskService.js` - Added 6 new methods
- ✅ `erp-dashboard/src/features/tasks/TaskDetailsModal.jsx` - Complete rewrite with workflow

---

## 🔐 Permissions & Security

- Only assigned users can hold/resume their own tasks
- Only original assigners or admins can reassign
- Workload checks prevent task overload
- All actions logged with actor information
- Activity logs track who did what and when

---

## 📞 Support

For issues or questions:
1. Check the Testing Checklist above
2. Review Troubleshooting section
3. Check activity logs for what actually happened
4. Verify timezone is set to Asia/Kolkata
5. Check user permissions and roles

---

**Version**: 1.0.0  
**Last Updated**: April 7, 2024  
**Status**: ✅ Complete & Ready for Testing
