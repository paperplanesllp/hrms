# Daily Task Reminder System - Quick Start Guide

## 5-Minute Setup

### 1. Files Created/Modified
✅ `server/src/modules/tasks/tasks.service.js` - Added `sendDailyIncompleteTasksReminder()` method
✅ `server/src/modules/tasks/task.reminder.js` - NEW reminder system module
✅ `server/src/modules/tasks/tasks.controller.js` - Added 3 new endpoint handlers
✅ `server/src/modules/tasks/tasks.routes.js` - Added 3 new routes
✅ `server/src/utils/cronJobs.js` - Added initialization call

### 2. System Already Active ✅
The reminder system is **automatically initialized** when the server starts. No additional setup needed!

Check your server logs for:
```
📬 [DAILY_REMINDERS] Initializing daily task reminders...
✅ Daily task reminders initialized - will run at 9:00 AM on weekdays
```

## How It Works

### Automatic Daily Reminders
- **When**: 9:00 AM every weekday (Mon-Fri)
- **Who**: All users with incomplete tasks
- **What**: Reminders about overdue, due today, and urgent tasks
- **How**: Via in-app notifications

### Example Reminder Message
```
Hello John,

📋 You have 5 incomplete tasks awaiting your attention:

🚨 2 overdue tasks
📅 1 due today
⚡ 2 urgent tasks

Please visit your task dashboard to review and update your tasks.
```

## Testing the Reminder System

### Test 1: Check Incomplete Tasks (5 min)
```bash
# 1. Open a terminal in the project root
curl http://localhost:5000/api/tasks/my/summary/incomplete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# You should see:
# - Total incomplete tasks
# - Overdue count
# - Due today count  
# - Urgent count
# - Task details grouped by category
```

### Test 2: Trigger Reminder Manually (admin only)
```bash
# 1. Get an HR/Admin user token
# 2. Run this command:
curl -X POST http://localhost:5000/api/tasks/reminders/trigger \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# You should see:
# - Reminders count
# - Notifications sent count
# - List of users who got reminders
```

### Test 3: Check System Status (admin only)
```bash
curl http://localhost:5000/api/tasks/reminders/status \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Response should show:
# - isRunning: true
# - Schedule: "9:00 AM every weekday"
# - Next execution time
```

### Test 4: Watch Console Logs
```bash
# Terminal where server is running:
# Look for logs like:
# 📬 [REMINDERS] Starting daily task reminders process...
# 📧 [REMINDERS] Notification sent to John Doe
# ✅ [REMINDERS] Daily reminder process completed
```

## Verification Checklist

- [ ] Server logs show `✅ Daily task reminders initialized`
- [ ] Can call `/api/tasks/my/summary/incomplete` successfully
- [ ] Can call `/api/tasks/reminders/trigger` with HR token
- [ ] Can call `/api/tasks/reminders/status` with HR token
- [ ] Test data shows correct task categorization
- [ ] Notifications appear in notification center
- [ ] No errors in console logs (check for `❌` prefix)

## Common Testing Scenarios

### Scenario 1: User with No Tasks
```
Expected: No reminder notification sent
Actual: ✅ System skips user silently
```

### Scenario 2: User with Overdue Tasks
```
Expected: Reminder includes "🚨 X overdue tasks"
Actual: ✅ Check via manual trigger endpoint
```

### Scenario 3: User with Due Today
```
Expected: Reminder includes "📅 X due today"
Actual: ✅ Create task with today's date and test
```

### Scenario 4: User with Urgent Tasks
```
Expected: Reminder includes "⚡ X urgent tasks"
Actual: ✅ Create task with URGENT priority and test
```

## Automatic Reminders - When to Expect

### Next Execution Times
- **Today (if before 9 AM)**: Today at 9:00 AM
- **Friday afternoon**: Next Monday at 9:00 AM
- **Weekend/Holiday**: Not sent (weekdays only)

### To Verify Upcoming Execution
```javascript
// In browser console:
const future = new Date();
future.setDate(future.getDate() + 1);
if (future.getDay() >= 1 && future.getDay() <= 5) {
  console.log(`✅ Reminder scheduled for ${future.toDateString()} at 9:00 AM`);
} else {
  console.log('⏹️ No reminder scheduled (weekend)');
}
```

## Troubleshooting

### Problem: Reminders Not Showing Up
- [ ] Check server is running (`console.log` in cron job area)
- [ ] Verify user has at least one incomplete task
- [ ] Check notifications are created (database)
- [ ] Verify frontend is displaying notifications

### Problem: "Authorization" Error on API Call
- [ ] Missing/expired token? Re-login to get new token
- [ ] Not HR/Admin? Only HR/Admin can trigger manually
- [ ] Check token format: `Authorization: Bearer TOKEN`

### Problem: "Task not found" Errors
- [ ] Ensured tasks are assigned to the user
- [ ] Checked tasks aren't marked as deleted
- [ ] Verify task status is not 'completed'

### Problem: Wrong Timezone
- [ ] Edit `server/src/modules/tasks/task.reminder.js` line ~16
- [ ] Change `timezone: "Asia/Kolkata"` to your timezone
- [ ] Restart server

## API Response Examples

### Get Incomplete Summary - Full Response
```json
{
  "success": true,
  "message": "Incomplete tasks summary retrieved",
  "data": {
    "taskCounts": {
      "total": 5,
      "overdue": 2,
      "dueToday": 1,
      "urgent": 2
    },
    "tasks": {
      "overdue": [
        {
          "id": "64f...123",
          "title": "Complete Project Report",
          "priority": "HIGH",
          "dueDate": "2024-12-15T00:00:00Z"
        }
      ],
      "dueToday": [
        {
          "id": "64f...456",
          "title": "Review Team Submissions",
          "priority": "MEDIUM",
          "dueDate": "2024-12-20T00:00:00Z"
        }
      ],
      "urgent": [
        {
          "id": "64f...789",
          "title": "Critical Bug Fix",
          "priority": "URGENT",
          "dueDate": "2024-12-22T00:00:00Z"
        }
      ]
    },
    "retrievedAt": "2024-12-20T10:30:00Z"
  }
}
```

### Trigger Reminder - Full Response
```json
{
  "success": true,
  "message": "Daily reminders sent successfully",
  "data": {
    "success": true,
    "remindersCount": 12,
    "notificationsSent": 12,
    "timestamp": "2024-12-20T09:00:00Z",
    "results": [
      {
        "userId": "user_123",
        "userName": "John Doe",
        "success": true,
        "notificationId": "notif_456"
      }
    ]
  }
}
```

### Get Status - Full Response
```json
{
  "success": true,
  "message": "Reminder system status retrieved",
  "data": {
    "isRunning": true,
    "nextExecution": "Scheduled for 9:00 AM on weekdays",
    "jobId": "Active",
    "schedule": "9:00 AM every weekday (Monday-Friday)"
  }
}
```

## Next Steps

### For Users/Testing
1. ✅ Create some test tasks with different priorities and due dates
2. ✅ Test retrieving your incomplete tasks summary
3. ✅ (If HR/Admin) Trigger a manual reminder
4. ✅ Check notification center for reminder
5. ✅ Verify task counts match what you created

### For Implementation
1. [ ] Customize reminder time if needed (edit `task.reminder.js`)
2. [ ] Connect to email/SMS system for external notifications
3. [ ] Add frontend component to display task summary
4. [ ] Configure reminders per department if needed
5. [ ] Set up dashboard widget showing upcoming reminders

### For Production
1. [ ] Test with realistic load (1000+ tasks)
2. [ ] Set correct timezone for production
3. [ ] Monitor logs during first week
4. [ ] Document SLA for reminder delivery
5. [ ] Set up alerts if reminders fail

## Quick Reference

| Command | Purpose | Auth Needed |
|---------|---------|-------------|
| `GET /api/tasks/my/summary/incomplete` | View your incomplete tasks categories | Any user |
| `POST /api/tasks/reminders/trigger` | Manually send reminders to all users | HR/Admin |
| `GET /api/tasks/reminders/status` | Check reminder system is running | HR/Admin |

## Need Help?

### Check These Files
- System flow: `DAILY_TASK_REMINDER_SYSTEM.md`
- Code implementation: `server/src/modules/tasks/task.reminder.js`
- Service layer: `server/src/modules/tasks/tasks.service.js`
- Routes: `server/src/modules/tasks/tasks.routes.js`

### Enable Debug Logging
In `task.reminder.js`, uncomment extra console.log statements to trace execution.

### Monitor Database
```javascript
// Check notification records created:
db.notifications.find({ type: 'TASK_REMINDER' })
  .sort({ createdAt: -1 })
  .limit(10)
```

---

**Status**: ✅ Ready for Testing  
**Last Updated**: 2024-12-20  
**Cron Schedule**: 0 9 * * 1-5 (9 AM on weekdays)
