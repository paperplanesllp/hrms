# Premium Task Management System - Architecture & Quick Reference

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Tailwind)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │  Components  │  │     Analytics           │ │
│  ├─────────────┤  ├──────────────┤  ├─────────────────────────┤ │
│  │ MyTasksPage │  │Task Modal    │  │ProductivityAnalytics.jsx│ │
│  │ Assigned... │  │Task Table    │  │TaskTimeline.jsx         │ │
│  │ Completed.. │  │Task Card     │  │WorkloadAnalysis.jsx     │ │
│  │ Department. │  │Task Form     │  │                         │ │
│  │ Analytics.. │  │              │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API / Socket.io
┌─────────────────────┴───────────────────────────────────────────┐
│                   BACKEND (Express + Node.js)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ROUTE LAYER                                │   │
│  │  GET     /tasks/my                                       │   │
│  │  GET     /tasks/assigned                                │   │
│  │  POST    /tasks/:id/forward                            │   │
│  │  POST    /tasks/:id/reassign                           │   │
│  │  PATCH   /tasks/:id/hold                               │   │
│  │  GET     /tasks/analytics/productivity/:userId         │   │
│  │  GET     /tasks/analytics/workload                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           CONTROLLER LAYER                              │   │
│  │  • Validate requests                                     │   │
│  │  • Call services                                         │   │
│  │  • Return responses                                      │   │
│  │  • Handle errors                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           SERVICE LAYER                                 │   │
│  │  • Business logic                                        │   │
│  │  • Task forwarding/reassignment                         │   │
│  │  • Productivity calculation                             │   │
│  │  • Workload detection                                   │   │
│  │  • History recording                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           DATA LAYER (MongoDB)                          │   │
│  │  ┌──────────────────────────────────────────────┐      │   │
│  │  │  Tasks Collection                             │      │   │
│  │  │  • title, description, status                 │      │   │
│  │  │  • assignedTo, assignedBy, department         │      │   │
│  │  │  • dueDate, progress, priority                │      │   │
│  │  │  • comments, attachments, history             │      │   │
│  │  └──────────────────────────────────────────────┘      │   │
│  │  ┌──────────────────────────────────────────────┐      │   │
│  │  │  TaskHistory Collection                       │      │   │
│  │  │  • taskId, performedBy, action                │      │   │
│  │  │  • oldValue, newValue, timestamp              │      │   │
│  │  │  • fromUser, toUser, details                  │      │   │
│  │  └──────────────────────────────────────────────┘      │   │
│  │  ┌──────────────────────────────────────────────┐      │   │
│  │  │  EmployeeProductivity Collection              │      │   │
│  │  │  • employeeId, department                     │      │   │
│  │  │  • completedTasks, pendingTasks, overdueTasks │      │   │
│  │  │  • completionRate, onTimeRate                 │      │   │
│  │  │  • productivityScore, currentWorkload         │      │   │
│  │  │  • scoreHistory, trend                        │      │   │
│  │  └──────────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: Forwarding a Task
```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Forward" button in TaskDetailsModal                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ selectUserDialog() shows list of team members                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ User selects recipient
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ POST /tasks/:id/forward                                         │
│ { toUserId: "user123", message: "Please review" }               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ tasksController.forwardTask()                                   │
│ • Validate task exists                                          │
│ • Verify user has permission                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ recordTaskHistory()                                             │
│ • Action: 'forwarded'                                           │
│ • fromUser: currentAssignee                                     │
│ • toUser: selectedUser                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Update Task Document                                            │
│ • assignedTo = selectedUser                                     │
│ • forwardedFrom = previousAssignee                              │
│ • forwardedAt = now                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ updateProductivity() for both users                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Socket emission: task:forwarded                                 │
│ Notification sent to recipient                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend receives update → TaskList refreshes                   │
│ Recipient sees notification → Gets new task                     │
└─────────────────────────────────────────────────────────────────┘
```

### Example 2: Productivity Calculation
```
┌─────────────────────────────────────────────────────────────────┐
│ Task marked as COMPLETED                                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Check: completedAt ≤ dueDate?                                   │
│ • YES → completedOnTime = true                                  │
│ • NO  → completedOnTime = false                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ updateProductivity(assigneeId)                                  │
│ • Fetch all tasks for user (not deleted)                        │
│ • Count: total, completed, pending, overdue, onTime             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Calculate Metrics:                                              │
│ • completionRate = (completed / total) * 100                    │
│ • onTimeCompletionRate = (onTimeCompleted / completed) * 100    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Calculate Score:                                                │
│ • completion_score = (completed/total) * 50                     │
│ • onTime_score = onTimeRate * 30                                │
│ • workload_score = (1 - overdue/total) * 20                     │
│ • TOTAL = completion + onTime + workload                        │
│   (Maximum 100)                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Determine Workload:                                             │
│ • overdueRatio = overdue / total                                │
│ • workloadRatio = pending / completed                           │
│ • if overdueRatio > 20% OR workloadRatio > 3 →                  │
│      status = 'overloaded'                                      │
│ • if workloadRatio > 2 → status = 'heavy'                       │
│ • if workloadRatio > 1 → status = 'normal'                      │
│ • else → status = 'light'                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Save to EmployeeProductivity                                    │
│ • Updated metrics                                               │
│ • New score                                                     │
│ • Workload status                                               │
│ • Add to scoreHistory array                                     │
│ • Calculate trend (improving/stable/declining)                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Check for Workload Alert                                        │
│ • If status = 'overloaded' → send notification                  │
│ • Dashboard workload analysis updates                           │
│ • Analytics refresh with new data                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Status State Machine

```
                     ┌─────────┐
                     │   NEW   │
                     └────┬────┘
                          │
                          ↓
                    ┌──────────────┐
                    │   PENDING    │──────┐
                    └──────┬───────┘      │
                           │             │
                    ┌──────┴──────┐      │
                    │             │      │
                    ↓             ↓      ↓
            ┌─────────────┐  ┌──────┐  ┌──────────┐
            │ IN-PROGRESS │  │HOLD  │  │CANCELLED │
            └──────┬──────┘  │      │  └──────────┘
                   │         └──┬───┘
                   │            │
            ┌──────┴────────────┘
            │
            ↓
    ┌──────────────┐
    │UNDER-REVIEW  │
    └──────┬───────┘
           │
           ↓
    ┌──────────────┐
    │  COMPLETED   │
    └──────────────┘

Auto-transitions:
• dueDate < now && status != completed → OVERDUE (virtual)
• progress > 0 && status = new → IN-PROGRESS
• progress = 100 && status != completed → COMPLETED
• dueDate > now && status = overdue → Previous status (when fixed)
```

---

## 🎯 Task Status Reference

| Status | When Used | Auto-Trigger | Final | Icon |
|--------|-----------|--------------|-------|------|
| new | Just created | – | ✗ | 🆕 |
| pending | Assigned, not started | – | ✗ | ⏳ |
| in-progress | Being worked on | progress > 0 | ✗ | ▶️ |
| on-hold | Temporarily paused | – (manual) | ✗ | ⏸️ |
| under-review | Awaiting approval | – (manual) | ✗ | 👀 |
| completed | Finished | progress = 100 | ✓ | ✅ |
| overdue | Missed deadline | dueDate < now | ✗ | ⚠️ |
| cancelled | Cancelled | – (manual) | ✓ | ❌ |

---

## 🔐 Permission Matrix

| Action | Employee | Manager | Admin | Notes |
|--------|----------|---------|-------|-------|
| Create Task | ✓ | ✓ | ✓ | Can assign to self |
| Assign Task | ✗ | ✓ | ✓ | Managers to team |
| Forward Task | ✓ | ✓ | ✓ | Keep assignment |
| Reassign Task | ✗ | ✓ | ✓ | Change assignee |
| Mark Complete | ✓ | ✓ | ✓ | If assigned |
| Put on Hold | ✓ | ✓ | ✓ | If assigned |
| Delete Task | ✗ | ✗ | ✓ | Soft delete |
| View Analytics | ✗ | ✓ | ✓ | Team analytics |
| View History | ✓ | ✓ | ✓ | Task history |

---

## 📈 Productivity Score Breakdown

```
PRODUCTIVITY SCORE (0-100)
│
├─ COMPLETION RATE (50 points max)
│  └─ completed_tasks / total_tasks * 50
│     Example: 8/10 tasks = 40 points
│
├─ ON-TIME DELIVERY (30 points max)
│  └─ on_time_completed / total_completed * 30
│     Example: 7/8 completed on-time = 26.25 points
│
└─ WORKLOAD HEALTH (20 points max)
   └─ (1 - overdue/total) * 20
      Example: 1 overdue/10 tasks = 18 points

TOTAL SCORE = 40 + 26.25 + 18 = 84.25 points ✅

WORKLOAD STATUS:
├─ 🟢 Light (0.5 pending per completed, <5% overdue)
├─ 🔵 Normal (1.0 pending per completed, 5-10% overdue)
├─ 🟠 Heavy (2.0 pending per completed, 10-20% overdue)
└─ 🔴 Overloaded (>3.0 pending, >20% overdue)
```

---

## 🚀 API Response Examples

### Get My Tasks
```json
{
  "data": [
    {
      "_id": "task123",
      "title": "Complete Financial Report",
      "status": "in-progress",
      "priority": "HIGH",
      "dueDate": "2026-04-15",
      "progress": 65,
      "assignedBy": { "name": "Manager Name", "id": "..." },
      "department": { "name": "Finance" },
      "completedOnTime": null,
      "isOverdue": false
    }
  ],
  "message": "Tasks fetched successfully"
}
```

### Get Task History
```json
{
  "data": [
    {
      "_id": "history123",
      "action": "forwarded",
      "performedBy": { "name": "Alice", "id": "..." },
      "fromUser": { "name": "Bob" },
      "toUser": { "name": "Charlie" },
      "timestamp": "2026-03-31T10:30:00Z"
    },
    {
      "_id": "history124",
      "action": "status_changed",
      "performedBy": { "name": "Charlie" },
      "oldValue": "new",
      "newValue": "in-progress",
      "timestamp": "2026-03-31T10:35:00Z"
    }
  ],
  "message": "Task history retrieved"
}
```

### Get Productivity
```json
{
  "data": {
    "employeeId": { "name": "John Doe" },
    "completedTasks": 24,
    "pendingTasks": 6,
    "overdueTasks": 1,
    "completionRate": 80,
    "onTimeCompletionRate": 92,
    "productivityScore": 85,
    "currentWorkload": "normal",
    "trend": "improving",
    "scoreHistory": [
      { "date": "2026-03-27", "score": 78 },
      { "date": "2026-03-28", "score": 80 },
      { "date": "2026-03-29", "score": 82 },
      { "date": "2026-03-30", "score": 83 },
      { "date": "2026-03-31", "score": 85 }
    ]
  }
}
```

---

## 💡 Quick Tips

1. **Forward vs Reassign**: 
   - Forward = Keep person, pass to colleague temporarily
   - Reassign = Change assignee entirely, reset progress

2. **Productivity Calculation**:
   - Runs automatically when task is completed
   - Can also run manually via cron job daily

3. **Overdue Detection**:
   - Automatic via virtual field
   - Manual update via cron job

4. **Performance**:
   - Use pagination for task lists
   - Cache productivity scores
   - Index optimized for common queries

5. **Scalability**:
   - MongoDB indexes on frequently queried fields
   - Archive old completed tasks monthly
   - Use aggregation pipeline for analytics

---

**Created: March 31, 2026**  
**Version: 1.0.0 - Premium Edition**  
**Status: Production Ready**
