# Dual Notification System Implementation

## Overview

This document describes the complete deployment and configuration of the dual notification system for task management. The system sends both in-app and email notifications automatically when task events occur.

## Features

✅ **In-App Notifications**
- Real-time notifications via Socket.io
- Persistent storage in MongoDB
- Mark as read functionality
- Notification history and retrieval

✅ **Email Notifications**
- HTML-formatted professional emails
- User preference settings for each notification type
- Template-based email generation
- Error handling and retry logic

✅ **Automated Scheduling**
- Due date reminders (1h, 1d, 2d before due)
- Overdue task notifications
- Runs every minute in background

✅ **Task Events Covered**
- Task Assigned
- Task Accepted
- Task Rejected
- Task Completed
- Task Reassigned
- Task Forwarded
- Due Date Reminder
- Task Overdue

## Prerequisites

```bash
# Required npm packages (already installed)
npm install nodemailer
npm install node-cron
npm install socket.io
```

## Setup Instructions

### 1. Environment Variables Configuration

Update your `.env` file with email credentials:

```env
# Email Service Configuration (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=HRMS Task Management System
```

#### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App Password**:
   - Go to myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password
   - Copy this into `EMAIL_PASSWORD` environment variable

3. **Do NOT use your regular Gmail password** - use the generated App Password instead

#### Alternative Email Providers

For other email providers, update the EMAIL_SERVICE:

```env
# Office 365
EMAIL_SERVICE=outlook

# Custom SMTP
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
```

### 2. Database Schema Updates

The following models have been automatically updated:

#### Notification.model.js
- Added `taskId` field for task-specific notifications
- Expanded `type` enum to include task events
- Added `emailSent` and `emailSentAt` tracking fields
- Added `triggeredBy` field to track who started the action

#### User.model.js
- Added `emailNotificationPreferences` object with toggles for:
  - `taskAssigned` (default: true)
  - `taskAccepted` (default: true)
  - `taskRejected` (default: true)
  - `taskCompleted` (default: true)
  - `taskReassigned` (default: true)
  - `taskForwarded` (default: true)
  - `dueReminder` (default: true)
  - `taskOverdue` (default: true)

#### Task.model.js
- Added `isOverdueNotified` field to prevent duplicate notifications
- Added `acceptedBy`, `acceptedAt` fields for task acceptance tracking
- Added `rejectedBy`, `rejectedAt`, `rejectionReason` fields for task rejection tracking

### 3. New Files Created

#### Backend Services

**`server/src/services/emailNotification.service.js`**
- Handles all email sending via Nodemailer
- Contains HTML email templates for each notification type
- Supports batch email sending
- Includes email verification functionality

**`server/src/services/taskScheduler.service.js`**
- Runs every minute to check for due reminders
- Monitors for overdue tasks
- Sends notifications automatically
- Logs all scheduler activities

**`server/src/utils/notificationHelper.js`**
- Centralized notification creation logic
- Coordinates in-app and email notifications
- Provides specific functions for each task event
- Checks user preferences before sending emails

**`server/src/utils/notifications.js`**
- Wrapper for backward compatibility with existing code
- Integrates notificationHelper with existing controllers
- Maps old notification types to new format
- Provides bulk notification sending

#### Task Controller Enhancements

**`tasks.controller.enhanced.js` - New Methods**
```javascript
// Task acceptance
async acceptTask(req, res) { ... }

// Task rejection
async rejectTask(req, res) { ... }
```

**Task Routes Update - New Endpoints**
```
PATCH /:id/accept    - Accept a task
PATCH /:id/reject    - Reject a task with reason
```

### 4. Service Integration

The following task operations now trigger notifications automatically:

```javascript
// When task is created and assigned
POST /api/tasks
→ notifyTaskAssigned(taskId, assignedToUserId, assignedByUserId)

// When assignee accepts task
PATCH /api/tasks/:id/accept
→ notifyTaskAccepted(taskId, acceptedByUserId, assignedByUserId)

// When assignee rejects task
PATCH /api/tasks/:id/reject
→ notifyTaskRejected(taskId, rejectedByUserId, assignedByUserId, reason)

// When task is completed
PATCH /api/tasks/:id/complete
→ notifyTaskCompleted(taskId, completedByUserId, assignedByUserId)

// When task is reassigned
POST /api/tasks/:id/reassign
→ notifyTaskReassigned(taskId, newAssigneeUserId, reassignedByUserId)

// When task is forwarded
POST /api/tasks/:id/forward
→ notifyTaskForwarded(taskId, forwardedToUserId, forwardedByUserId, reason)

// Automatic (every minute)
→ notifyDueReminder(taskId, assignedToUserId)
→ notifyTaskOverdue(taskId)
```

### 5. API Endpoints

#### Get Notifications
```http
GET /api/notifications
Headers:
  Authorization: Bearer <token>

Response:
[
  {
    _id: "...",
    userId: "...",
    type: "task-assigned",
    title: "New Task Assigned: Project Report",
    message: "You have been assigned...",
    taskId: "...",
    isRead: false,
    emailSent: true,
    createdAt: "2024-01-15T10:30:00Z"
  }
]
```

#### Mark Notification as Read
```http
PATCH /api/notifications/:id/read
Headers:
  Authorization: Bearer <token>

Response:
{
  ok: true,
  notification: { ... }
}
```

#### Mark All Notifications as Read
```http
PATCH /api/notifications/read-all
Headers:
  Authorization: Bearer <token>

Response:
{
  ok: true,
  modifiedCount: 5
}
```

#### Get Unread Count
```http
GET /api/notifications/unread-count
Headers:
  Authorization: Bearer <token>

Response:
{
  unreadCount: 3
}
```

## Email Templates

Each notification type has a customized HTML email template:

### Task Assigned Email
- Task title, description, priority
- Assigned by name
- Due date
- Button: "View Task"

### Task Completed Email
- Task title
- Completed by name
- Completion time
- Status: COMPLETED ✓
- Button: "View Task"

### Due Reminder Email
- Task title, due date/time
- Priority level
- Time remaining until due
- Button: "Complete Task"

### Task Overdue Email
- ⚠️ Warning header
- Days overdue
- Status: OVERDUE
- Button: "Complete Task Now"

### Task Accepted/Rejected/Reassigned/Forwarded Emails
- Similar structure to above
- Customized for each event type
- Color-coded by priority/status

## User Preferences Management

Users can control which notifications they receive via email:

```javascript
// Check user preferences
const user = await User.findById(userId);
console.log(user.emailNotificationPreferences);
// {
//   taskAssigned: true,
//   taskAccepted: true,
//   taskRejected: true,
//   taskCompleted: true,
//   taskReassigned: true,
//   taskForwarded: true,
//   dueReminder: true,
//   taskOverdue: true
// }

// Update preferences
await User.findByIdAndUpdate(userId, {
  'emailNotificationPreferences.taskCompleted': false
});
// User won't receive emails when tasks are completed
```

## Testing the System

### 1. Verify Email Service
```bash
# Add to your test file
import { verifyEmailService } from './services/emailNotification.service.js';

const isVerified = await verifyEmailService();
console.log(isVerified); // true if working
```

### 2. Test Task Creation with Notifications
```javascript
// Create task with API
POST /api/tasks
{
  "title": "Test Task",
  "description": "Testing notification system",
  "assignedTo": "user-id-here",
  "dueDate": "2024-01-20T10:00:00Z",
  "priority": "HIGH"
}

// Result:
// ✅ In-app notification created
// ✅ Email sent to assignee
// ✅ Socket.io event emitted for real-time update
```

### 3. Check Notifications in Browser
```javascript
// Open browser console
// Check Socket.io connection
console.log(socket.connected); // true if connected

// Check for notifications in listening
socket.on('notification', (data) => {
  console.log('🔔 New notification received:', data);
});
```

### 4. Monitor Logs
```bash
# In terminal, you should see:
✅ Email sent to user@email.com for task-assigned: <messageId>
✅ Notification created and email sent for task-assigned (userId)
✅ Due reminder sent for task: Project Report (1 day)
✅ Overdue notification sent for task: Project Report
```

## Troubleshooting

### Email Not Sending

**Problem**: "Failed to send email to user@email.com"

**Solutions**:
1. Verify EMAIL_USER and EMAIL_PASSWORD in .env
2. For Gmail: Ensure "Less secure app access" is enabled OR use App Password
3. Check email credentials are correct
4. Verify SMTP port (587 is standard)

### Notifications Not Appearing

**Problem**: Notifications created but not shown in app

**Solutions**:
1. Check Socket.io connection: `socket.connected` in browser console
2. Verify user is logged in (token in localStorage)
3. Check network tab for Socket.io handshake
4. Restart server: scheduler might not be initialized

### Scheduler Not Running

**Problem**: Due reminders not being sent

**Solutions**:
1. Check server logs for "Task scheduler initialized"
2. Verify node-cron is installed: `npm list node-cron`
3. Check Task model for reminders field
4. Monitor logs for "Due reminder sent for task:"

### Duplicate Notifications

**Problem**: Receiving same notification multiple times

**Solutions**:
1. Check `isOverdueNotified` field in Task
2. Verify scheduler is not running multiple times
3. Check browser Network tab - might be duplicate socket events
4. Restart server and clear browser cache

## Database Migration

If updating existing database:

```bash
# For existing users, add default email preferences
db.users.updateMany(
  { emailNotificationPreferences: { $exists: false } },
  { $set: {
    emailNotificationPreferences: {
      taskAssigned: true,
      taskAccepted: true,
      taskRejected: true,
      taskCompleted: true,
      taskReassigned: true,
      taskForwarded: true,
      dueReminder: true,
      taskOverdue: true
    }
  }}
);

# For existing tasks, add notification tracking
db.tasks.updateMany(
  { isOverdueNotified: { $exists: false } },
  { $set: { isOverdueNotified: false } }
);
```

## Performance Optimization

### Email Sending
- Emails are sent asynchronously (non-blocking)
- Failed emails are logged but don't block task creation
- Batch email sending available for multiple recipients

### Scheduler
- Runs every minute with efficient database queries
- Uses indexes on dueDate, status, and isOverdueNotified
- Prevents duplicate notifications with tracking fields

### Socket.io
- Emits to specific user rooms: `io.to(user_${userId})`
- Reduces bandwidth by not broadcasting to all users
- Real-time updates without polling

## Monitoring & Logging

All notifications are logged with timestamps:

```javascript
// Logs display:
✅ Email sent to user@example.com for task-assigned: <messageId>
✅ Notification created and email sent for task-completed (userId)
⏭️ Email skipped for task-due-reminder (preference disabled or no email)
❌ Failed to send email: SMTP connection error
```

## Security Considerations

✅ **Implemented**:
- Authentication required for all notification endpoints
- Email credentials stored in .env (not in code)
- User preferences respected (can opt-out)
- No email addresses exposed in notifications
- Timezone-aware scheduling
- No sensitive data in email body

## Next Steps

1. **Configure Environment Variables**
   - Update .env with your email credentials
   - Set APP_URL to your frontend URL

2. **Start Server**
   ```bash
   npm run dev
   # Or: npm start
   ```

3. **Monitor Logs**
   - Watch for "Task scheduler initialized"
   - Test by creating a task
   - Check for notifications

4. **Build UI Components**
   - NotificationBell component (shows count)
   - NotificationDropdown component (displays notifications)
   - See frontend documentation for implementation

5. **Customize Email Templates**
   - Edit emailNotification.service.js
   - Update HTML templates
   - Add company branding/logo

## Support & Maintenance

- Monitor email delivery logs
- Check scheduler status periodically
- Update notification preferences in user settings
- Keep node-cron and nodemailer updated
- Test email service monthly

---

**System Status**: ✅ Complete and Ready for Production

**Version**: 1.0
**Last Updated**: 2024
