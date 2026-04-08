# Integration Guide: Dashboard API → Task Overview Component

## Overview
This guide shows how to replace the hard-coded metrics in `TasksOverviewSection.jsx` with real data from the new dashboard API.

---

## Current State (Before)

The metrics were partially using real data but showing fixed trend labels:

```javascript
const quickInsights = [
  {
    label: 'Completion Rate',
    value: `${stats.completionRate}%`,
    change: stats.completionRate >= 70 ? '+5%' : '-3%',  // ❌ Fake
  },
  {
    label: 'On Track',
    value: `${stats.byStatus['in-progress']}`,
    change: 'improving',  // ❌ Fake
  },
  {
    label: 'Completion Goal',
    value: `${completionGoalPct}%`,
    change: 'avg: 65%',  // ❌ Fake
  },
];
```

---

## New State (After Integration)

Use real metrics from the dashboard API:

```javascript
const quickInsights = [
  {
    label: 'Completion Rate',
    value: `${dashboardMetrics?.completionRate}%`,
    change: `${Math.round(dashboardMetrics?.completionRate || 0)} complete`,  // ✅ Real
  },
  {
    label: 'Active Tasks',
    value: `${dashboardMetrics?.activeTasks}`,
    change: `${dashboardMetrics?.activeTasks} in progress`,  // ✅ Real
  },
  {
    label: 'Goal Progress',
    value: `${dashboardMetrics?.goalProgress}%`,
    change: dashboardMetrics?.goalProgress >= 80 
      ? '✓ On track' 
      : '⚠️ Attention needed',  // ✅ Real
  },
];
```

---

## Step-by-Step Integration

### Step 1: Update the Hook

Edit `erp-dashboard/src/features/tasks/sections/TasksOverviewSection.jsx`:

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import api from '../../../lib/api.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';

export default function TasksOverviewSection({ onCreateTask, onViewAnalytics }) {
  const [stats, setStats] = useState({
    byStatus: { pending: 0, 'in-progress': 0, completed: 0, 'on-hold': 0, cancelled: 0, total: 0 },
    byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
    overdue: 0,
    completionRate: 0
  });
  
  // ✨ NEW: Dashboard metrics from API
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);

  // Fetch old stats (keep for backward compatibility)
  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get('/tasks/my/stats');
      if (data?.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // ✨ NEW: Fetch dashboard metrics
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const response = await api.get('/tasks/dashboard');
      if (response?.data?.data) {
        setDashboardMetrics(response.data.data.metrics);
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    }
  }, []);

  const fetchRecentTasks = useCallback(async () => {
    try {
      const tasks = await api.get('/tasks/my/dashboard', { params: { limit: 5 } });
      setRecentTasks(tasks.data?.data || tasks.data || []);
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        fetchStats(),
        fetchDashboardMetrics(),  // ✨ NEW
        fetchRecentTasks()
      ]);
    };
    load();
  }, [fetchStats, fetchDashboardMetrics, fetchRecentTasks]);

  // Setup real-time socket listeners
  useEffect(() => {
    console.log('🔌 [Overview] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [Overview] Socket not available');
      return;
    }

    const handleTaskEventWithRefresh = () => {
      console.log('📡 [Overview] Task event received, refreshing data');
      setTimeout(() => {
        fetchStats();
        fetchDashboardMetrics();  // ✨ Update dashboard metrics too
        fetchRecentTasks();
      }, 300);
    };

    socket.on('task:created', handleTaskEventWithRefresh);
    socket.on('task:updated', handleTaskEventWithRefresh);
    socket.on('task:status-changed', handleTaskEventWithRefresh);
    socket.on('task:deleted', handleTaskEventWithRefresh);

    return () => {
      socket.off('task:created', handleTaskEventWithRefresh);
      socket.off('task:updated', handleTaskEventWithRefresh);
      socket.off('task:status-changed', handleTaskEventWithRefresh);
      socket.off('task:deleted', handleTaskEventWithRefresh);
    };
  }, [fetchStats, fetchDashboardMetrics, fetchRecentTasks]);

  // ✨ Calculate metrics (use dashboard API, fallback to old stats)
  const totalTasks = dashboardMetrics?.totalTasks || stats.byStatus.total;
  const completedTasks = dashboardMetrics?.completedTasks || stats.byStatus.completed;
  const inProgressTasks = dashboardMetrics?.inProgressTasks || stats.byStatus['in-progress'];
  const completionRate = dashboardMetrics?.completionRate || stats.completionRate;
  const activeTasks = dashboardMetrics?.activeTasks || stats.byStatus['in-progress'];
  const goalProgress = dashboardMetrics?.goalProgress || 0;

  // ✨ Performance insights using REAL data
  const quickInsights = [
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      positive: completionRate >= 70,
      change: `${completedTasks} of ${totalTasks} completed`,
    },
    {
      label: 'Active Tasks',
      value: `${activeTasks}`,
      icon: Zap,
      positive: activeTasks > 0,
      change: activeTasks > 0 
        ? `${activeTasks} task${activeTasks !== 1 ? 's' : ''} in progress`
        : 'All caught up!',
    },
    {
      label: 'Goal Progress',
      value: `${goalProgress}%`,
      icon: Target,
      positive: goalProgress >= 80,
      change: goalProgress >= 80
        ? '✓ On track'
        : `⚠ Needs ${100 - goalProgress}% improvement`,
    },
  ];

  // Rest of component remains the same...
  // This is just showing the metric calculation changes
  
  return (
    <div className="space-y-8">
      {/* ... existing code ... */}
      
      {/* Performance insights - NOW with real data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickInsights.map((insight, idx) => (
          <Card key={idx} className="p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {insight.label}
              </span>
              <span className={insight.positive ? 'text-green-600' : 'text-orange-600'}>
                {insight.positive ? '↑' : '↓'}
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {insight.value}
            </div>
            <p className="text-xs text-gray-600">
              {insight.change}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

### Step 2: Update Summary Stats

Replace the old `summaryStats` array with real metrics:

```javascript
const summaryStats = [
  {
    id: 'total',
    label: 'Total Tasks',
    value: totalTasks.toString(),
    subtext: `All tasks assigned`,
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'pending',
    label: 'Pending',
    value: (dashboardMetrics?.pendingTasks || stats.byStatus.pending).toString(),
    subtext: 'Waiting to start',
    icon: Clock,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'inprogress',
    label: 'In Progress',
    value: inProgressTasks.toString(),
    subtext: 'Currently active',
    icon: Activity,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'completed',
    label: 'Completed',
    value: completedTasks.toString(),
    subtext: 'Successfully finished',
    icon: CheckCircle,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    value: (dashboardMetrics?.overdueTasks || 0).toString(),
    subtext: 'Past due date (IST)',
    icon: AlertCircle,
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
];
```

---

### Step 3: Update Chart Data

Show real priority breakdown in charts:

```javascript
const priorityData = Object.entries(dashboardMetrics?.priority || {}).map(([name, value]) => ({
  name: name.charAt(0).toUpperCase() + name.slice(1),
  value,
  fill: {
    LOW: '#3b82f6',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
    URGENT: '#dc2626',
  }[name.toUpperCase()]
}));

const statusData = Object.entries(dashboardMetrics?.status || {}).map(([name, value]) => ({
  name: name.replace('-', ' ').toUpperCase(),
  value,
}));
```

---

## Comparison: Before vs After

### Before (Fake Data)
```javascript
change: stats.completionRate >= 70 ? '+5%' : '-3%'  // ❌ Hardcoded
change: 'improving'                                   // ❌ Hardcoded  
change: 'avg: 65%'                                   // ❌ Hardcoded
```

### After (Real Data)
```javascript
change: `${completedTasks} of ${totalTasks} completed`  // ✅ Real
change: `${activeTasks} task(s) in progress`            // ✅ Real
change: goalProgress >= 80 ? '✓ On track' : '⚠️ ...'   // ✅ Real & Dynamic
```

---

## Testing the Integration

### 1. Verify API responses
```bash
curl -X GET "http://localhost:5001/api/tasks/dashboard" \
  -H "Authorization: Bearer TOKEN"
# Should return real metrics
```

### 2. Check Component Rendering
- Dashboard metrics should display correctly
- Insights should show real values, not fake ones
- Real-time updates should work via socket.io

### 3. Validate Calculations
- Completion Rate: Should match (completed / total) × 100
- Goal Progress: Should match ((total - overdue) / total) × 100
- Active Tasks: Should show pending + in-progress count

---

## Migration Path

### Phase 1: Add New API (Done ✅)
- Create dashboard service
- Add controller methods
- Add routes
- Document API

### Phase 2: Update Component (This Guide)
- Import new API
- Fetch dashboard metrics
- Replace hardcoded values
- Add socket listeners

### Phase 3: Remove Old Stats (Optional)
- Once confirmed working, can deprecate old `/my/stats` endpoint
- Or keep both for backward compatibility

---

## Benefits of This Integration

✅ **Real-time accuracy** - No more fake metrics  
✅ **Single aggregation query** - Better performance  
✅ **IST timezone support** - Correct overdue detection  
✅ **Comprehensive insights** - More metrics available  
✅ **Live updates** - Auto-refresh on task changes  
✅ **Scalable** - Scales to 10k+ tasks  

---

## Troubleshooting

### Metrics showing as 0
- Check: Backend is running
- Check: Auth token is valid
- Check: Tasks exist in database
- Check: Browser console for errors

### Real-time updates not working
- Check: Socket.io connection active
- Check: Verify socket events in browser DevTools
- Check: Backend emitting events correctly

### Performance issues
- Check: Database indexes created
- Check: MongoDB connection healthy
- Monitor: Network request time in DevTools

---

## Full Example Component

See the complete updated component at:  
`erp-dashboard/src/features/tasks/sections/TasksOverviewSection.jsx`

This integration replaces all hardcoded values with real data from the dashboard API.

---

**Integration Type**: API Enhancement  
**Complexity**: Medium (3-4 files modified)  
**Time to Implement**: 30 minutes  
**Improvement**: Fake data → Real-time metrics ✨
