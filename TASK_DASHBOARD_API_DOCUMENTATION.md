# Task Analytics Dashboard API Documentation

## Overview
Real-time task analytics dashboard API for MERN HRMS system with efficient MongoDB aggregation queries. All metrics are calculated dynamically with Asia/Kolkata (IST) timezone support.

**Base URL:** `http://localhost:5001/api/tasks`  
**Timezone:** Asia/Kolkata (IST) - UTC+5:30  
**Authentication:** Required (Bearer Token)

---

## Endpoints

### 1. GET `/dashboard` - Personal Task Analytics

Get comprehensive analytics for a single user or the entire team.

#### Request
```bash
curl -X GET "http://localhost:5001/api/tasks/dashboard" \
  -H "Authorization: Bearer <token>"
```

#### Query Parameters
- `userId` (optional): Get analytics for specific user. Defaults to current user.
- `departmentId` (optional): Filter by department ID.

#### Response
```json
{
  "data": {
    "timestamp": "2026-04-07T10:30:45.123Z",
    "timezone": "Asia/Kolkata (IST)",
    "metrics": {
      "totalTasks": 25,
      "completedTasks": 15,
      "pendingTasks": 5,
      "inProgressTasks": 3,
      "onHoldTasks": 1,
      "cancelledTasks": 1,
      "overdueTasks": 2,
      "completedToday": 3,
      "activeTasks": 8,
      "completionRate": 60,
      "goalProgress": 92,
      "onTimeCompletionRate": 58,
      "avgCompletionTime": 24,
      "priority": {
        "urgent": 2,
        "high": 5,
        "medium": 12,
        "low": 6
      },
      "status": {
        "pending": 5,
        "in-progress": 3,
        "completed": 15,
        "on-hold": 1,
        "cancelled": 1,
        "overdue": 2
      }
    },
    "insights": {
      "isHealthy": true,
      "urgentTasksCount": 4,
      "needsAttention": true,
      "estimatedCompletion": "24 hours average"
    }
  },
  "message": "Task analytics dashboard fetched successfully"
}
```

#### Metrics Explained
| Metric | Description |
|--------|-------------|
| `totalTasks` | All tasks assigned (pending + in-progress + on-hold + completed) |
| `completedTasks` | Number of finished tasks |
| `pendingTasks` | Tasks not yet started |
| `inProgressTasks` | Tasks currently being worked on |
| `overdueTasks` | Tasks with `dueDate < today IST` and `status ≠ completed` |
| `completionRate` | `(completed / total) × 100%` |
| `goalProgress` | `((total - overdue) / total) × 100%` - tasks on track |
| `onTimeCompletionRate` | Tasks completed by due date |
| `avgCompletionTime` | Average hours to complete a task |
| `activeTasks` | Pending or in-progress tasks needing attention |

---

### 2. GET `/dashboard/team` - Team Task Analytics

Get performance metrics for all team members (HR/Admin only).

#### Request
```bash
curl -X GET "http://localhost:5001/api/tasks/dashboard/team" \
  -H "Authorization: Bearer <token>"
```

#### Query Parameters
- `departmentId` (optional): Filter by specific department.

#### Response
```json
{
  "data": {
    "timestamp": "2026-04-07T10:30:45.123Z",
    "teamSize": 5,
    "members": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "userName": "John Doe",
        "email": "john@company.com",
        "totalTasks": 25,
        "completed": 18,
        "inProgress": 4,
        "pending": 2,
        "overdue": 1,
        "completionRate": 72
      },
      {
        "userId": "507f1f77bcf86cd799439012",
        "userName": "Jane Smith",
        "email": "jane@company.com",
        "totalTasks": 20,
        "completed": 16,
        "inProgress": 3,
        "pending": 1,
        "overdue": 0,
        "completionRate": 80
      }
    ]
  },
  "message": "Team analytics fetched successfully"
}
```

---

### 3. GET `/dashboard/trends` - Task Trends Over Time

Get task creation and completion trends for the specified period.

#### Request
```bash
curl -X GET "http://localhost:5001/api/tasks/dashboard/trends?days=30" \
  -H "Authorization: Bearer <token>"
```

#### Query Parameters
- `days` (optional): Number of days to analyze (1-365). Default: 30.

#### Response
```json
{
  "data": {
    "period": "30 days",
    "startDate": "2026-03-08T10:30:45.123Z",
    "endDate": "2026-04-07T10:30:45.123Z",
    "data": [
      {
        "_id": "2026-03-08",
        "created": 5,
        "completed": 2
      },
      {
        "_id": "2026-03-09",
        "created": 3,
        "completed": 4
      },
      {
        "_id": "2026-03-10",
        "created": 7,
        "completed": 3
      }
    ]
  },
  "message": "Task trends for 30 days fetched successfully"
}
```

---

## Usage Examples

### Example 1: Get Personal Dashboard
```javascript
// Frontend code (React)
import api from './lib/api';

const fetchMyDashboard = async () => {
  try {
    const response = await api.get('/tasks/dashboard');
    console.log('Analytics:', response.data.data);
    // Display metrics in UI
    setCompletionRate(response.data.data.metrics.completionRate);
    setTotalTasks(response.data.data.metrics.totalTasks);
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
  }
};
```

### Example 2: Get Team Analytics with Department Filter
```javascript
const fetchTeamAnalytics = async (departmentId) => {
  try {
    const response = await api.get('/tasks/dashboard/team', {
      params: { departmentId }
    });
    const members = response.data.data.members;
    // Sort by completion rate
    members.sort((a, b) => b.completionRate - a.completionRate);
    displayTeamLeaderboard(members);
  } catch (error) {
    console.error('Failed to fetch team analytics:', error);
  }
};
```

### Example 3: Real-Time Updates with Socket.io
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

// Fetch initial data
fetchMyDashboard();

// Listen for real-time task updates
socket.on('task:created', () => {
  // Refresh dashboard
  fetchMyDashboard();
});

socket.on('task:status-changed', () => {
  // Refresh dashboard
  fetchMyDashboard();
});
```

### Example 4: Display Team Leaderboard
```javascript
const displayTeamPerformance = async () => {
  const response = await api.get('/tasks/dashboard/team');
  const { teamSize, members } = response.data.data;

  console.log(`📊 Team Performance Summary (${teamSize} members):`);
  members.forEach((member, index) => {
    console.log(
      `${index + 1}. ${member.userName} - ${member.completionRate}% complete ` +
      `(${member.completed}/${member.totalTasks} tasks)`
    );
  });
};
```

---

## Performance Optimization

### MongoDB Aggregation Features
- ✅ **Single aggregation query** for all metrics (efficient)
- ✅ **$facet stage** for parallel metric calculation
- ✅ **Index-optimized** on frequently queried fields
- ✅ **IST timezone handling** in date calculations
- ✅ No N+1 queries - all data in one pipeline

### Indexes Created for Performance
```javascript
// In Task.model.js
taskSchema.index({ assignedTo: 1, status: 1 });      // Fast user filtering
taskSchema.index({ assignedBy: 1, createdAt: -1 });  // Creator queries
taskSchema.index({ dueDate: 1, status: 1 });         // Overdue detection
taskSchema.index({ priority: 1, status: 1 });        // Priority breakdown
taskSchema.index({ createdAt: -1 });                 // Time-based queries
```

### Query Time: ~5-50ms per request (depending on data volume)

---

## Error Handling

### Common Errors

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "User ID not found in request",
  "statusCode": 401
}
```

#### 403 Forbidden (Team Analytics)
```json
{
  "success": false,
  "message": "Unauthorized: Only HR and Admin can access team analytics",
  "statusCode": 403
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Days parameter must be between 1 and 365",
  "statusCode": 400
}
```

---

## IST Timezone Implementation

All overdue calculations use **Asia/Kolkata (IST)** timezone (+UTC 5:30):

```javascript
// IST offset: 5.5 hours = 19800 seconds
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // milliseconds

// Calculate today IST (00:00:00)
const now = new Date();
const istNow = new Date(now.getTime() + IST_OFFSET);
const todayIST = new Date(istNow);
todayIST.setUTCHours(0, 0, 0, 0);
todayIST.setTime(todayIST.getTime() - IST_OFFSET);

// Overdue query
const overdueCount = await Task.countDocuments({
  status: { $ne: 'completed' },
  dueDate: { $lt: todayIST }
});
```

---

## Real-Time Integration with Socket.io

The dashboard automatically updates when tasks change:

```javascript
// Frontend SocketProvider listens to these events
socket.on('task:created', refreshDashboard);
socket.on('task:updated', refreshDashboard);
socket.on('task:status-changed', refreshDashboard);
socket.on('task:deleted', refreshDashboard);
```

When these events occur, call the dashboard endpoint again for fresh metrics.

---

## Database Schema Fields Used

```javascript
{
  title: String,
  status: String, // pending, in-progress, on-hold, completed, overdue, cancelled
  priority: String, // LOW, MEDIUM, HIGH, URGENT
  dueDate: Date,
  completedAt: Date,
  createdAt: Date,
  assignedTo: [ObjectId], // Array of user IDs
  assignedBy: ObjectId,
  department: ObjectId,
  isDeleted: Boolean,
  progress: Number, // 0-100
  actualHours: Number,
  estimatedHours: Number
}
```

---

## API Response Format

All responses follow this standard format:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Success message"
}
```

---

## Rate Limiting

- ✅ Recommended: 10 requests per second per user
- ✅ Implement client-side caching: 30-60 seconds
- ✅ Dashboard auto-refresh: Every 60 seconds or on task update

---

## Related Documentation

- [Task Management System](./TASK_MANAGEMENT_IMPLEMENTATION.md)
- [IST Timezone Implementation](./IST_TIMEZONE_GUIDE.md)
- [Real-Time Socket Events](./SOCKET_IO_EVENTS.md)
- [MongoDB Performance Optimization](./DATABASE_OPTIMIZATION.md)
