# Premium Task Execution System - Quick Reference

## File Map

### Backend Files
```
server/src/modules/tasks/
├── Task.model.js                      # Updated MongoDB schema
├── taskExecution.utils.js             # Core calculations (new)
├── taskExecution.service.js           # Business logic (new)
├── taskExecution.controller.js        # HTTP endpoints (new)
└── tasks.routes.enhanced.js           # Added new routes

Key Changes:
- Task schema: executionStatus, dueHealth, sessions[], pauses[], blockers[], activityLog[]
- New fields: startedAt, completedAt, lastActivityAt, totalActiveMinutes, totalPausedMinutes
```

### Frontend Files
```
erp-dashboard/src/features/tasks/
├── components/
│   ├── PremiumTaskCard.jsx            # Premium task display (new)
│   └── ActivityTimeline.jsx           # Activity log timeline (new)
├── modals/
│   └── PremiumTaskDetailsModal.jsx    # Task detail view (new)
├── utils/
│   └── taskExecutionUtils.js          # Frontend helpers (new)
└── taskService.js                     # Updated with new methods
```

## API Endpoints Quick Reference

### Execution Actions
```bash
# Start task
POST /tasks/:id/start

# Pause with reason
POST /tasks/:id/pause
{ "reason": "Waiting for feedback" }

# Resume task
POST /tasks/:id/resume

# Complete task
POST /tasks/:id/complete

# Block task
POST /tasks/:id/block
{ "reason": "Missing documentation" }

# Unblock task
POST /tasks/:id/unblock/:blockerId

# Send for review
POST /tasks/:id/send-for-review

# Reopen completed task
POST /tasks/:id/reopen
{ "reason": "Found issues" }

# Get execution details
GET /tasks/:id/execution-details
```

## Frontend Component Usage

### PremiumTaskCard
```jsx
import PremiumTaskCard from './components/PremiumTaskCard.jsx';

<PremiumTaskCard
  task={task}
  onStart={handleStart}
  onPause={handlePause}
  onResume={handleResume}
  onComplete={handleComplete}
  onBlock={handleBlock}
  onSendForReview={handleSendForReview}
  onReopen={handleReopen}
  onViewDetails={handleViewDetails}
  isLoading={false}
/>
```

### PremiumTaskDetailsModal
```jsx
import PremiumTaskDetailsModal from './modals/PremiumTaskDetailsModal.jsx';

<PremiumTaskDetailsModal
  task={task}
  isOpen={isModalOpen}
  onClose={handleCloseModal}
  onExecutionAction={handleExecutionAction}
  isLoading={false}
/>
```

### ActivityTimeline
```jsx
import ActivityTimeline from './components/ActivityTimeline.jsx';

<ActivityTimeline activityLog={task.activityLog} />
```

## Utility Functions

### Backend (taskExecution.utils.js)
```javascript
// Calculations
calculateTaskProgress(task)
calculateActiveMinutes(sessions)
calculatePausedMinutes(pauses)
calculateIdleMinutes(createdAt, startedAt)
getDueHealth(task)
getEstimatedTimeRemaining(task)
getEstimateVariance(task)
getEstimateVariancePercent(task)

// Status checks
isTaskOverdue(dueDate, executionStatus)
isTaskBlocked(blockers)
getDaysUntilDue(dueDate)

// Summaries
getTaskExecutionSummary(task)
getTaskAnalytics(task)

// Management
addActivityLogEntry(task, action, user, details)
startWorkSession(task, currentTime)
endWorkSession(task, currentTime)
addPause(task, reason, currentTime)
resumeFromPause(task, currentTime)
addBlocker(task, reason, currentTime)
resolveBlocker(task, blockerId, unblockerUser, currentTime)

// Formatting
formatDuration(minutes) => "2h 30m"
getExecutionStatusLabel(status)
getDueHealthLabel(health)
getExecutionStatusColor(status)
getDueHealthColor(health)
```

### Frontend (taskExecutionUtils.js)
```javascript
// Formatting
formatDuration(minutes)
formatDurationLabel(minutes)
formatRelativeTime(date)
formatActivityMessage(activityLog)

// Styling
getExecutionStatusStyle(status)
getDueHealthStyle(health)
getActionColor(action)
getProgressColor(progress)
getPriorityColor(priority)

// Calculations
calculateProgress(totalActiveMinutes, estimatedMinutes)
getTimeRemaining(totalActiveMinutes, estimatedMinutes)
getVarianceScore(totalActiveMinutes, estimatedMinutes)
getVariancePercent(totalActiveMinutes, estimatedMinutes)

// Status checks
isTaskActionable(executionStatus)
isOverdue(dueDate, executionStatus)
isTaskStalled(executionStatus, lastActivityAt, createdAt)
getDaysUntilDue(dueDate)

// Actions
getAvailableActions(executionStatus)
getActionLabel(action)

// Icons
getActivityIcon(action)
getTaskStatusColor(executionStatus, dueHealth)
```

## Task Service Methods

### New Premium Methods
```javascript
taskService.blockTask(taskId, reason)
taskService.unblockTask(taskId, blockerId)
taskService.sendForReview(taskId)
taskService.reopenTask(taskId, reason)
taskService.getExecutionDetails(taskId)
```

### Existing Methods (Still Works)
```javascript
taskService.startTask(taskId)
taskService.pauseTask(taskId, reason)
taskService.resumeTask(taskId)
taskService.completeTask(taskId)
```

## Data Structures

### Task Object (Focused on Execution Fields)
```javascript
{
  _id: ObjectId,
  title: string,
  description: string,
  
  // Execution state
  executionStatus: 'not_started' | 'in_progress' | 'paused' | 'blocked' | 'waiting_review' | 'completed' | 'completed_late' | 'reopened',
  dueHealth: 'on_track' | 'due_today' | 'at_risk' | 'overdue' | 'completed_on_time' | 'completed_late',
  
  // Timestamps
  createdAt: Date,
  startedAt: Date | null,
  completedAt: Date | null,
  lastActivityAt: Date | null,
  dueDate: Date,
  
  // Time tracking
  estimatedMinutes: number,
  totalActiveMinutes: number,
  totalPausedMinutes: number,
  totalIdleMinutes: number,
  
  // Sessions
  sessions: [{
    _id: ObjectId,
    startedAt: Date,
    endedAt: Date | null,
    durationMinutes: number,
    isActive: boolean
  }],
  
  // Pauses
  pauses: [{
    _id: ObjectId,
    reason: string,
    pausedAt: Date,
    resumedAt: Date | null,
    durationMinutes: number
  }],
  
  // Blockers
  blockers: [{
    _id: ObjectId,
    reason: string,
    blockedAt: Date,
    unblockedAt: Date | null,
    unblocker: ObjectId | null,
    status: 'active' | 'resolved'
  }],
  
  // Activity
  activityLog: [{
    _id: ObjectId,
    action: string,
    user: ObjectId,
    userName: string,
    timestamp: Date,
    details: {...}
  }],
  
  // Assignment
  assignedTo: [ObjectId],
  assignedBy: ObjectId,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  
  // Other
  progress: number (0-100),
  comments: [],
  ...otherFields
}
```

### Analytics Response
```javascript
{
  executionStatus: string,
  dueHealth: string,
  progress: number,
  isBlocked: boolean,
  activeBlockers: [],
  totalActiveMinutes: number,
  totalPausedMinutes: number,
  totalIdleMinutes: number,
  timeRemaining: number | null,
  variance: number | null,
  variancePercent: number | null,
  sessionCount: number,
  pauseCount: number,
  blockerCount: number,
  activityLogCount: number,
  createdAt: Date,
  startedAt: Date | null,
  lastActivityAt: Date | null,
  completedAt: Date | null,
  dueDate: Date,
  estimatedMinutes: number,
  priority: string,
  assignedTo: [User],
  lifecycleDuration: number | null,
  daysSinceCreation: number,
  daysUntilDue: number
}
```

## Common Patterns

### Check if Can Perform Action
```javascript
import { getAvailableActions } from '@/features/tasks/utils/taskExecutionUtils';

const availableActions = getAvailableActions(task.executionStatus);
if (availableActions.includes('pause')) {
  // Show pause button
}
```

### Display Time Tracking
```javascript
import { formatDuration, calculateProgress } from '@/features/tasks/utils/taskExecutionUtils';

const activeTime = formatDuration(task.totalActiveMinutes); // "2h 30m"
const progress = calculateProgress(task.totalActiveMinutes, task.estimatedMinutes); // 75
```

### Style Status Badge
```javascript
import { getExecutionStatusStyle } from '@/features/tasks/utils/taskExecutionUtils';

const style = getExecutionStatusStyle(task.executionStatus);
// Returns: { label, bgColor, textColor, icon, ... }

<span className={`${style.bgColor} ${style.textColor}`}>
  {style.icon} {style.label}
</span>
```

### Handle Execution Action
```javascript
const handleExecutionAction = async (action, taskId, payload) => {
  try {
    let result;
    switch (action) {
      case 'start':
        result = await taskService.startTask(taskId);
        break;
      case 'pause':
        result = await taskService.pauseTask(taskId, payload.reason);
        break;
      case 'resume':
        result = await taskService.resumeTask(taskId);
        break;
      case 'complete':
        result = await taskService.completeTask(taskId);
        break;
      case 'block':
        result = await taskService.blockTask(taskId, payload.reason);
        break;
      case 'send_for_review':
        result = await taskService.sendForReview(taskId);
        break;
      case 'reopen':
        result = await taskService.reopenTask(taskId, payload.reason);
        break;
    }
    // Update local state with result
    setTask(result);
    showNotification('success', `Task ${action}ed successfully`);
  } catch (error) {
    showNotification('error', error.message);
  }
};
```

## Status Transitions

```
NOT_STARTED
  ├─→ IN_PROGRESS (start)
  ├─→ BLOCKED (block)
  └─→ WAITING_REVIEW (send for review)

IN_PROGRESS
  ├─→ PAUSED (pause)
  ├─→ BLOCKED (block)
  ├─→ COMPLETED (complete - on time)
  ├─→ COMPLETED_LATE (complete - if overdue)
  └─→ WAITING_REVIEW (send for review)

PAUSED
  ├─→ IN_PROGRESS (resume)
  ├─→ BLOCKED (block)
  ├─→ COMPLETED (complete)
  └─→ COMPLETED_LATE (complete - if overdue)

BLOCKED
  └─→ IN_PROGRESS (unblock - if no more blockers)

WAITING_REVIEW
  ├─→ IN_PROGRESS (resume)
  └─→ REOPENED (reopen)

COMPLETED / COMPLETED_LATE
  ├─→ REOPENED (reopen)
  └─→ IN_PROGRESS (from reopened)

REOPENED
  ├─→ IN_PROGRESS (automatically)
  ├─→ PAUSED (pause)
  ├─→ BLOCKED (block)
  ├─→ COMPLETED (complete)
  └─→ COMPLETED_LATE (complete - if overdue)
```

## Color Palette

### Execution Status Colors
- **not_started**: Slate
- **in_progress**: Blue
- **paused**: Yellow
- **blocked**: Red
- **waiting_review**: Purple
- **completed**: Green
- **completed_late**: Orange
- **reopened**: Amber

### Due Health Colors
- **on_track**: Green
- **due_today**: Yellow
- **at_risk**: Orange
- **overdue**: Red
- **completed_on_time**: Green
- **completed_late**: Orange

## Debugging Tips

### Check Task Execution State
```javascript
// In browser console
const task = await taskService.getExecutionDetails('taskId');
console.log(task.analytics); // See all calculations
```

### Verify Activity Log
```javascript
task.activityLog.forEach(log => {
  console.log(`${log.action} by ${log.userName} at ${log.timestamp}`);
});
```

### Check Work Sessions
```javascript
const totalActive = task.sessions
  .filter(s => s.endedAt)
  .reduce((sum, s) => sum + s.durationMinutes, 0);
console.log(`Total active work: ${totalActive} minutes`);
```

## Integration Notes

- All new features are **backward compatible**
- Existing task CRUD operations still work
- New execution fields have sensible defaults
- Activity logging is automatic
- No breaking changes to existing APIs

---

**Last Updated**: April 2026
**Version**: 1.0
**Status**: Production Ready ✅
