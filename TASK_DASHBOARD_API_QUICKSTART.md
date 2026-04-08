# Task Dashboard API - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Backend API is Ready
The following endpoints are now available:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks/dashboard` | GET | Personal/team task analytics |
| `/api/tasks/dashboard/team` | GET | Team performance metrics (HR/Admin) |
| `/api/tasks/dashboard/trends` | GET | Task trends over time |

### Step 2: Copy the Service Hook (Frontend)

Create `erp-dashboard/src/hooks/useTaskDashboard.js`:

```javascript
import { useState, useEffect } from 'react';
import api from '../lib/api';

export const useTaskDashboard = (userId = null, departmentId = null) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/dashboard', {
        params: { userId, departmentId }
      });
      setData(response.data?.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [userId, departmentId]);

  return { data, loading, error, refetch: fetchDashboard };
};
```

### Step 3: Create Dashboard Component

Create `erp-dashboard/src/features/tasks/TaskDashboardMetrics.jsx`:

```javascript
import React from 'react';
import { useTaskDashboard } from '../../hooks/useTaskDashboard';
import Card from '../../components/ui/Card';
import { Target, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function TaskDashboardMetrics() {
  const { data, loading, error } = useTaskDashboard();

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return <div>No data</div>;

  const { metrics, insights } = data;

  const MetricCard = ({ icon: Icon, label, value, color, suffix = '' }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>
            {value}{suffix}
          </p>
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          label="Total Tasks"
          value={metrics.totalTasks}
          color="text-blue-600"
        />
        <MetricCard
          icon={CheckCircle}
          label="Completed"
          value={metrics.completedTasks}
          color="text-green-600"
        />
        <MetricCard
          icon={Clock}
          label="In Progress"
          value={metrics.inProgressTasks}
          color="text-purple-600"
        />
        <MetricCard
          icon={AlertCircle}
          label="Overdue"
          value={metrics.overdueTasks}
          color="text-red-600"
        />
      </div>

      {/* Rates and progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-600">
            {metrics.completionRate}%
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-2">Goal Progress</p>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${metrics.goalProgress}%` }}
            />
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-600">
            {metrics.goalProgress}%
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-2">Avg Completion Time</p>
          <p className="text-2xl font-bold text-purple-600">
            {metrics.avgCompletionTime}h
          </p>
          <p className="text-xs text-gray-500">per task</p>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card className="p-4">
        <h3 className="font-bold mb-4">Task Breakdown by Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.entries(metrics.status).map(([status, count]) => (
            <div key={status} className="text-center p-2 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-blue-600">{count}</p>
              <p className="text-xs text-gray-600 capitalize">
                {status.replace('-', ' ')}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Priority breakdown */}
      <Card className="p-4">
        <h3 className="font-bold mb-4">Task Breakdown by Priority</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.priority).map(([priority, count]) => (
            <div key={priority} className="text-center p-2 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-orange-600">{count}</p>
              <p className="text-xs text-gray-600 capitalize">{priority}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">📊 Insights</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • Status: {insights.isHealthy ? '✅ Healthy' : '⚠️ Needs attention'}
          </li>
          <li>• Urgent tasks: {insights.urgentTasksCount}</li>
          <li>• Estimated completion: {insights.estimatedCompletion}</li>
          <li>
            • Active tasks: {metrics.activeTasks}/{metrics.totalTasks}
          </li>
        </ul>
      </Card>
    </div>
  );
}
```

### Step 4: Add to Dashboard Page

Edit `erp-dashboard/src/features/dashboard/DashboardPage.jsx`:

```javascript
import TaskDashboardMetrics from '../tasks/TaskDashboardMetrics';

export default function DashboardPage() {
  // ... existing code ...

  return (
    <div className="space-y-8">
      {/* Existing content */}
      
      {/* Add task metrics */}
      <Card>
        <h2 className="text-2xl font-bold mb-4">Task Analytics</h2>
        <TaskDashboardMetrics />
      </Card>
    </div>
  );
}
```

### Step 5: Test the API

```bash
# In your browser console or with curl:
curl -X GET "http://localhost:5001/api/tasks/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "data": {
    "metrics": {
      "totalTasks": 25,
      "completedTasks": 15,
      "completionRate": 60,
      ...
    }
  }
}
```

---

## 📊 Available Data

### Personal Dashboard Metrics
```javascript
metrics: {
  totalTasks,
  completedTasks,
  pendingTasks,
  inProgressTasks,
  onHoldTasks,
  cancelledTasks,
  overdueTasks,           // ⭐ IST-aware
  completedToday,
  activeTasks,
  completionRate,         // %
  goalProgress,          // %
  onTimeCompletionRate,  // %
  avgCompletionTime,     // hours
  priority: { urgent, high, medium, low },
  status: { pending, 'in-progress', completed, ... }
}
```

### Team Analytics
```javascript
teamSize: 5,
members: [
  {
    userId: "...",
    userName: "John Doe",
    email: "john@...",
    totalTasks: 25,
    completed: 18,
    inProgress: 4,
    pending: 2,
    overdue: 1,
    completionRate: 72
  },
  // ...
]
```

---

## 🔄 Real-Time Updates

Auto-refresh the dashboard when tasks are created/updated:

```javascript
import { getSocket } from '../lib/socket';

const DashboardWithRealtime = () => {
  const { data, refetch } = useTaskDashboard();
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      setTimeout(() => refetch(), 300); // Delay for backend update
    };

    socket.on('task:created', handleUpdate);
    socket.on('task:updated', handleUpdate);
    socket.on('task:status-changed', handleUpdate);
    socket.on('task:deleted', handleUpdate);

    return () => {
      socket.off('task:created', handleUpdate);
      socket.off('task:updated', handleUpdate);
      socket.off('task:status-changed', handleUpdate);
      socket.off('task:deleted', handleUpdate);
    };
  }, [socket, refetch]);

  return <TaskDashboardMetrics />;
};
```

---

## 🎯 Common Use Cases

### 1. Show Team Leaderboard
```javascript
const TeamLeaderboard = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get('/tasks/dashboard/team').then(res => {
      const sorted = res.data.data.members.sort(
        (a, b) => b.completionRate - a.completionRate
      );
      setMembers(sorted);
    });
  }, []);

  return (
    <ol>
      {members.map((m, i) => (
        <li key={m.userId}>
          {i + 1}. {m.userName} - {m.completionRate}%
        </li>
      ))}
    </ol>
  );
};
```

### 2. Show Task Trends Chart
```javascript
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const TaskTrendChart = () => {
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    api.get('/tasks/dashboard/trends?days=30').then(res => {
      setTrends(res.data.data.data);
    });
  }, []);

  return (
    <LineChart width={500} height={300} data={trends}>
      <XAxis dataKey="_id" />
      <YAxis />
      <Line type="monotone" dataKey="created" stroke="#8884d8" />
      <Line type="monotone" dataKey="completed" stroke="#82ca9d" />
    </LineChart>
  );
};
```

### 3. Alert on Overdue Tasks
```javascript
useEffect(() => {
  if (data?.metrics.overdueTasks > 0) {
    toast({
      title: '⚠️ Overdue Tasks',
      message: `You have ${data.metrics.overdueTasks} overdue task(s)`,
      type: 'warning'
    });
  }
}, [data?.metrics.overdueTasks]);
```

---

## 🔐 Authorization

- ✅ Personal dashboard: Accessible to own user
- ✅ Team dashboard: HR/Admin only
- ✅ All endpoints require valid auth token

---

## ✅ Testing Checklist

- [ ] Backend running on `localhost:5001`
- [ ] MongoDB connection active
- [ ] Auth token valid
- [ ] Dashboard fetches data (no 401/403 errors)
- [ ] Metrics display correctly
- [ ] Real-time updates on task changes
- [ ] Performance acceptable (<100ms)

---

## 📚 Full API Documentation

See [TASK_DASHBOARD_API_DOCUMENTATION.md](./TASK_DASHBOARD_API_DOCUMENTATION.md) for complete reference.
