# Daily Task Reminder System - Implementation Guide

## Overview
The Daily Task Reminder System automatically sends reminders to users about their incomplete tasks, helping them stay on top of their work and priorities. The system categorizes tasks by urgency and sends daily notifications.

## Features

### 1. **Automated Daily Reminders**
- **Schedule**: Every weekday (Monday-Friday) at 9:00 AM IST
- **Scope**: Reminds users about incomplete tasks
- **Categories**:
  - ⏰ **Overdue Tasks**: Tasks past their due date
  - 📅 **Due Today**: Tasks due within the current day
  - ⚡ **Urgent Tasks**: Tasks marked with URGENT priority

### 2. **Task Categorization**
- **Overdue**: `dueDate < Today` and `status != completed`
- **Due Today**: `dueDate = Today` (regardless of status)
- **Urgent**: Tasks with `priority = URGENT`

### 3. **User-Friendly Notifications**
- Grouped by category with counts
- Task titles and priority levels included
- Direct link to task dashboard
- Sent only if user has tasks in any category

## API Endpoints

### 1. Get Incomplete Tasks Summary
**Endpoint**: `GET /api/tasks/my/summary/incomplete`
**Auth**: Required (any authenticated user)
**Response**:
```json
{
  "taskCounts": {
    "total": 5,
    "overdue": 2,
    "dueToday": 1,
    "urgent": 2
  },
  "tasks": {
    "overdue": [
      {
        "id": "task_id",
        "title": "Complete Q4 Report",
        "priority": "HIGH",
        "dueDate": "2024-12-15T00:00:00Z"
      }
    ],
    "dueToday": [...],
    "urgent": [...]
  },
  "retrievedAt": "2024-12-20T09:00:00Z"
}
```

### 2. Trigger Daily Reminders (Manual)
**Endpoint**: `POST /api/tasks/reminders/trigger`
**Auth**: Required (HR/Admin only)
**Response**:
```json
{
  "success": true,
  "remindersCount": 15,
  "notificationsSent": 15,
  "message": "Daily reminders sent. 15 notifications delivered...",
  "timestamp": "2024-12-20T09:30:00Z"
}
```

### 3. Get Reminder System Status
**Endpoint**: `GET /api/tasks/reminders/status`
**Auth**: Required (HR/Admin only)
**Response**:
```json
{
  "isRunning": true,
  "nextExecution": "Scheduled for 9:00 AM on weekdays",
  "jobId": "Active",
  "schedule": "9:00 AM every weekday (Monday-Friday)"
}
```

## Backend Implementation Details

### Service Method: `sendDailyIncompleteTasksReminder()`
**Location**: `server/src/modules/tasks/tasks.service.js`

Finds all users with incomplete tasks and returns reminder data:
```javascript
// Returns:
{
  success: true,
  remindersCount: 15,
  timestamp: Date,
  reminders: [
    {
      userId: ObjectId,
      userName: "John Doe",
      email: "john@example.com",
      taskCounts: {
        total: 5,
        overdue: 2,
        dueToday: 1,
        urgent: 2
      },
      tasks: {
        overdue: [...],
        dueToday: [...],
        urgent: [...]
      }
    }
  ]
}
```

### Task Reminder Module: `task.reminder.js`
**Location**: `server/src/modules/tasks/task.reminder.js`

Core functions:
- `initializeTaskReminders()`: Initializes the cron job (called at server startup)
- `sendDailyTaskReminders()`: Executes reminder logic and sends notifications
- `triggerTaskReminderManually()`: Allows on-demand reminder triggering
- `stopTaskReminders()`: Stops the reminder job
- `restartTaskReminders()`: Restarts the reminder job
- `getTaskReminderStatus()`: Returns current status

### Cron Job Integration
**Location**: `server/src/utils/cronJobs.js`

The reminder system is initialized when the server starts:
```javascript
// In startCronJobs() function:
import { initializeTaskReminders } from "../modules/tasks/task.reminder.js";

try {
  initializeTaskReminders();
  console.log('✅ Daily task reminders initialized');
} catch (error) {
  console.error('[DAILY_REMINDERS] Failed:', error);
}
```

## Database Requirements

### Task Model Fields (Already Present)
- `assignedTo`: User ID(s) assigned to task
- `dueDate`: Task due date
- `dueAt`: Task due time (if applicable)
- `priority`: Task priority level (LOW, MEDIUM, HIGH, URGENT)
- `status`: Task status (pending, in-progress, completed, etc.)
- `isDeleted`: Soft delete flag

### User Model Fields (Required)
- `_id`: User ID
- `name`: User name
- `email`: User email
- `isDeleted`: Soft delete flag

### Notification Model (Already Exists)
- Stores notification records
- Linked to user ID
- Type: 'TASK_REMINDER'

## Notification Integration

### Notification Service Method
The system uses: `notificationService.createNotification()`

**Parameters**:
```javascript
{
  userId: ObjectId,
  type: 'TASK_REMINDER',
  title: 'Daily Task Reminder',
  message: 'Task summary string',
  data: {
    taskCounts: {...},
    taskIds: [...],
    reminderType: 'DAILY_INCOMPLETE_TASKS'
  }
}
```

## Testing & Verification

### 1. Test Manual Trigger
```bash
# Terminal 1: Run server
npm start

# Terminal 2: Make API request
curl -X POST http://localhost:5000/api/tasks/reminders/trigger \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Check Reminder Status
```bash
curl http://localhost:5000/api/tasks/reminders/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### 3. Get User's Incomplete Tasks
```bash
curl http://localhost:5000/api/tasks/my/summary/incomplete \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### 4. Monitor Console Logs
Watch for logs like:
```
📅 [REMINDERS] Starting daily task reminders process...
📧 [REMINDERS] Notification sent to John Doe
✅ [REMINDERS] Daily reminder process completed. Sent 15 notifications
```

## Scheduling Details

### Cron Expression: `0 9 * * 1-5`
- **Minute**: 0 (every hour's 0th minute)
- **Hour**: 9 (9 AM)
- **Day of Month**: * (every day)
- **Month**: * (every month)
- **Day of Week**: 1-5 (Monday-Friday only)

### Timezone: IST (Asia/Kolkata)
- Configured in `task.reminder.js`
- Set to match company timezone
- Can be customized as needed

## Configuration Customization

### Change Reminder Time
Edit `server/src/modules/tasks/task.reminder.js`:
```javascript
// Line: cron.schedule('0 9 * * 1-5', ...)
// Change first parameter to different cron expression
// Examples:
// '0 10 * * 1-5' = 10 AM on weekdays
// '0 9 * * *'    = 9 AM every day (including weekends)
// '30 8 * * 1-5' = 8:30 AM on weekdays
```

### Change Affected Days
```javascript
// Current: 1-5 = Monday to Friday
// Change to:
// '0 9 * * 0-6' = Every day (0=Sunday, 6=Saturday)
// '0 9 * * 0'   = Only Sunday
// '0 9 * * 5'   = Only Friday
```

### Customize Notification Message
Edit `createTaskSummary()` function in `task.reminder.js` to modify the notification text format.

## Frontend Integration

### Display Incomplete Tasks Summary
```javascript
// In your dashboard component:
const response = await fetch('/api/tasks/my/summary/incomplete', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Display counts:
console.log(`📋 Incomplete: ${data.taskCounts.total}`);
console.log(`🚨 Overdue: ${data.taskCounts.overdue}`);
console.log(`📅 Due Today: ${data.taskCounts.dueToday}`);
console.log(`⚡ Urgent: ${data.taskCounts.urgent}`);
```

### Real-Time Updates via Socket.IO
When a reminder is sent, a socket event could be emitted:
```javascript
// In task.reminder.js (future enhancement):
io.to(`user_${userId}`).emit('task_reminder', reminderData);
```

## Error Handling

### Common Issues & Solutions

**Issue**: Reminders not sent at scheduled time
- **Check**: Server is running (cron job runs server-side only)
- **Check**: Check console for errors: `[DAILY_REMINDERS]` prefix
- **Solution**: Verify timezone setting in cronJobs.js

**Issue**: Reminders sent despite no incomplete tasks
- **Expected**: System will skip silent if no tasks found
- **Check**: Verify task status values match filter conditions

**Issue**: Wrong users receiving reminders
- **Check**: Verify user's `isDeleted` flag is false
- **Check**: Verify task is assigned to correct users

## Performance Considerations

### Query Optimization
- **Current**: Finds tasks per user in a loop
- **Optimization**: Could use aggregation pipeline for large numbers

### Notification Queue
- **Current**: Sends synchronously
- **Enhancement**: Implement queue system (Bull, RabbitMQ) for large scale

### Disable for Testing
```javascript
// Temporarily disable by commenting in cronJobs.js:
// import { initializeTaskReminders } from "../modules/tasks/task.reminder.js";
// initializeTaskReminders();
```

## Production Checklist

- [ ] Database indexes on `assignedTo`, `status`, `dueDate` fields
- [ ] Test with realistic task volume (1000+ tasks)
- [ ] Verify notification delivery (check notification table)
- [ ] Monitor server logs during first scheduled execution
- [ ] Test manual trigger with different user roles
- [ ] Verify users receive appropriate reminders (privacy/permissions)
- [ ] Set correct timezone for production environment
- [ ] Configure backup/fallback notification system
- [ ] Document SLA for reminder delivery

## Monitoring & Maintenance

### Log Patterns to Monitor
```
✅ [REMINDERS] Task reminder system initialized
📅 [REMINDERS] Starting daily task reminders process...
📧 [REMINDERS] Notification sent to [UserName]
✅ [REMINDERS] Daily reminder process completed
❌ [REMINDERS] Error - indicates failures
```

### Database Queries for Verification
```javascript
// Check notification records:
db.notifications.find({ type: 'TASK_REMINDER' })
  .sort({ createdAt: -1 })
  .limit(10)

// Count tasks assigned to user (last 24h):
db.tasks.countDocuments({
  assignedTo: userId,
  isDeleted: false,
  status: { $nin: ['completed', 'rejected', 'cancelled'] }
})
```

## Future Enhancements

1. **Smart Scheduling**: Learn user preferences for best reminder times
2. **Contextual Reminders**: Different messages based on task type
3. **Escalation**: Send to manager if task not completed by deadline
4. **SMS/Email**: Send via multiple channels (not just in-app)
5. **Frequency Control**: Let users configure reminder frequency
6. **Batch Size**: Limit reminders if user has too many pending tasks
7. **Priority-based**: Only remind about HIGH/URGENT tasks
8. **Department-wise**: Stagger reminders by department to load balance

## Related Files

- **Service**: `server/src/modules/tasks/tasks.service.js` (sendDailyIncompleteTasksReminder method)
- **Reminder System**: `server/src/modules/tasks/task.reminder.js`
- **Controller**: `server/src/modules/tasks/tasks.controller.js` (new endpoint handlers)
- **Routes**: `server/src/modules/tasks/tasks.routes.js` (new routes)
- **Cron Jobs**: `server/src/utils/cronJobs.js` (initialization)
- **Notification Service**: `server/src/modules/notifications/notification.service.js`
- **Task Model**: `server/src/modules/tasks/Task.model.js`

## Support & Debugging

### Enable Verbose Logging
Add additional console logs at key points in `task.reminder.js` for debugging:
```javascript
console.log('🔍 [DEBUG] Processing reminder for user:', userId);
console.log('📊 [DEBUG] Tasks found:', incompleteTasks.length);
```

### Test Email Transmission
Verify notification model stores data correctly:
```javascript
// Check last 5 reminders:
const recent = await Notification.find({ type: 'TASK_REMINDER' })
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();
console.log(JSON.stringify(recent, null, 2));
```

## Version History

- **v1.0** (Current): Initial implementation
  - Daily reminders at 9 AM weekdays
  - Categorized by overdue, due today, urgent
  - Manual trigger for HR/Admin
  - Status monitoring

- **v1.1** (Planned): 
  - Email integration
  - User preference customization
  - Performance optimization for 10K+ users
