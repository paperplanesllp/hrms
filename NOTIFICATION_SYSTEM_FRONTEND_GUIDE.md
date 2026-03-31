# Dual Notification System - Frontend Integration Guide

## Quick Start

### 1. Socket.io Connection Setup

The notification system uses Socket.io for real-time updates. Update your Socket provider:

```javascript
// erp-dashboard/src/components/providers/SocketProvider.jsx

import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function useNotifications() {
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    
    // Listen for notifications
    socket.on('notification', (data) => {
      console.log('🔔 New notification:', data);
      
      // Dispatch to Redux or state management
      // dispatch(addNotification(data));
      
      // Show toast
      toast.info(data.title + ': ' + data.message);
    });
    
    return () => socket.disconnect();
  }, []);
}
```

### 2. Notification API Calls

#### Fetch Notifications

```javascript
import axios from 'axios';

// Get all notifications for current user
async function getNotifications() {
  try {
    const response = await axios.get('/api/notifications');
    return response.data; // Array of notifications
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
}

// Usage
useEffect(() => {
  const notifications = await getNotifications();
  setNotifications(notifications);
}, []);
```

#### Mark as Read

```javascript
// Mark single notification as read
async function markNotificationRead(notificationId) {
  try {
    const response = await axios.patch(
      `/api/notifications/${notificationId}/read`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  try {
    const response = await axios.patch('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
}
```

### 3. NotificationBell Component

```javascript
// erp-dashboard/src/components/NotificationBell.jsx

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch initial unread count
    fetchUnreadCount();
    
    // Listen for new notifications
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    
    socket.on('notification', (data) => {
      // Increment unread count when new notification arrives
      setUnreadCount(prev => prev + 1);
      
      // Show toast
      console.log('🔔 New notification:', data.title);
    });
    
    return () => socket.disconnect();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count');
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-200 rounded-lg"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {showDropdown && <NotificationDropdown />}
    </div>
  );
}
```

### 4. NotificationDropdown Component

```javascript
// erp-dashboard/src/components/NotificationDropdown.jsx

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notifications?limit=50');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    await axios.patch(`/api/notifications/${notification._id}/read`);
    
    // Navigate to task
    if (notification.taskId) {
      window.location.href = `/tasks/${notification.taskId}`;
    }
    
    // Update UI
    setNotifications(prev =>
      prev.map(n =>
        n._id === notification._id ? { ...n, isRead: true } : n
      )
    );
  };

  const handleMarkAllRead = async () => {
    await axios.patch('/api/notifications/read-all');
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg z-50">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Notifications</h3>
        <button
          onClick={handleMarkAllRead}
          className="text-sm text-blue-600 hover:underline"
        >
          Mark all read
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

## Notification Types & Event Triggers

### Task Assigned
**Event**: User assigned to task  
**Recipient**: Assigned user  
**Notification Type**: `task-assigned`

```javascript
// API trigger
POST /api/tasks
{
  "title": "Project Report",
  "assignedTo": "user-id",
  "dueDate": "2024-01-20T10:00:00Z"
}
```

### Task Accepted
**Event**: Assignee accepts task  
**Recipient**: Task creator/assigner  
**Notification Type**: `task-accepted`

```javascript
// API trigger
PATCH /api/tasks/{taskId}/accept
```

### Task Rejected
**Event**: Assignee rejects task  
**Recipient**: Task creator/assigner  
**Notification Type**: `task-rejected`

```javascript
// API trigger
PATCH /api/tasks/{taskId}/reject
{
  "reason": "Cannot complete due to resource constraints"
}
```

### Task Completed
**Event**: Task marked complete  
**Recipient**: Task creator/assigner  
**Notification Type**: `task-completed`

```javascript
// API trigger
PATCH /api/tasks/{taskId}/complete
```

### Task Reassigned
**Event**: Task reassigned to different user  
**Recipient**: New assignee  
**Notification Type**: `task-reassigned`

```javascript
// API trigger
POST /api/tasks/{taskId}/reassign
{
  "toUserId": "new-user-id",
  "reason": "Better suited for this skill"
}
```

### Task Forwarded
**Event**: Task forwarded to another user  
**Recipient**: Forwarded-to user  
**Notification Type**: `task-forwarded`

```javascript
// API trigger
POST /api/tasks/{taskId}/forward
{
  "toUserId": "forward-user-id",
  "message": "Please handle this task"
}
```

### Due Date Reminder
**Event**: Task due in 1h, 1d, or 2d (automated)  
**Recipient**: Assigned user  
**Notification Type**: `task-due-reminder`

```javascript
// Automatic - sent by scheduler
// No API call needed - runs every minute
```

### Task Overdue
**Event**: Task due date passed (automated)  
**Recipient**: Assigned user + Task creator  
**Notification Type**: `task-overdue`

```javascript
// Automatic - sent by scheduler
// No API call needed - runs every minute
```

## Handling Different Notification Types

```javascript
function getNotificationIcon(type) {
  const icons = {
    'task-assigned': '📋',
    'task-accepted': '✅',
    'task-rejected': '❌',
    'task-completed': '🎉',
    'task-reassigned': '🔄',
    'task-forwarded': '➡️',
    'task-due-reminder': '⏰',
    'task-overdue': '⚠️'
  };
  return icons[type] || '🔔';
}

function getNotificationColor(type) {
  const colors = {
    'task-assigned': 'blue',
    'task-accepted': 'green',
    'task-rejected': 'red',
    'task-completed': 'green',
    'task-reassigned': 'purple',
    'task-forwarded': 'indigo',
    'task-due-reminder': 'yellow',
    'task-overdue': 'red'
  };
  return colors[type] || 'gray';
}
```

## Notification Preferences

Users can control which email notifications they receive:

### Get User Preferences
```javascript
import axios from 'axios';

async function getUserPreferences() {
  try {
    const response = await axios.get('/api/users/me/notification-preferences');
    return response.data;
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
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
  }
}
```

### Update Preferences
```javascript
async function updateNotificationPreference(key, enabled) {
  try {
    const response = await axios.patch(
      '/api/users/me/notification-preferences',
      {
        [key]: enabled
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update preference:', error);
  }
}

// Usage
await updateNotificationPreference('taskCompleted', false);
// User won't receive email when tasks are completed
```

### Preferences UI Component

```javascript
// erp-dashboard/src/components/NotificationPreferences.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState({});

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    const prefs = await getUserPreferences();
    setPreferences(prefs);
  };

  const handleToggle = async (key) => {
    const newValue = !preferences[key];
    await updateNotificationPreference(key, newValue);
    setPreferences(prev => ({ ...prev, [key]: newValue }));
  };

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Email Notification Preferences</h2>
      
      <div className="space-y-4">
        {Object.entries(preferences).map(([key, enabled]) => (
          <div key={key} className="flex items-center justify-between p-4 border rounded">
            <label className="font-medium capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => handleToggle(key)}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing Notifications

### Test Task Creation
```javascript
// In browser console
async function testTaskNotification() {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Test Task',
      description: 'Testing notification system',
      assignedTo: 'target-user-id',
      dueDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
      priority: 'HIGH'
    })
  });
  
  const task = await response.json();
  console.log('Task created:', task);
  console.log('Check your notifications!');
}

testTaskNotification();
```

### Real-time Socket.io Testing
```javascript
// In browser console
socket.on('notification', (data) => {
  console.log('🔔 Notification received:', data);
});

// When socket receives notification, you'll see it logged
```

## Error Handling

```javascript
// Handle notification fetch errors
async function fetchNotificationsWithFallback() {
  try {
    const response = await axios.get('/api/notifications');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // User not authenticated
      redirectToLogin();
    } else if (error.response?.status === 500) {
      // Server error
      showToast('Failed to load notifications', 'error');
    } else {
      // Network error
      console.error('Network error:', error);
    }
    return [];
  }
}
```

## Performance Tips

✅ **Lazy Load Notifications**
- Load notifications only when drawer opens
- Use pagination for large datasets
- Cache notifications locally

✅ **Batch Socket Events**
- Socket emits are fast, but limit frequency
- Use debouncing for rapid notifications

✅ **Optimize Re-renders**
- Use React.memo for NotificationBell
- Track only unreadCount for performance
- Virtual scroll for large notification lists

## Integrating with Redux

```javascript
// Redux action
export const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0
  },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount++;
      }
    },
    markAsRead: (state, action) => {
      const notification = state.items.find(n => n._id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount--;
      }
    }
  }
});

// In Socket Provider
socket.on('notification', (data) => {
  dispatch(notificationSlice.actions.addNotification(data));
});
```

## Environment Variables (Frontend)

```env
# .env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Summary of Key Points

✅ Real-time notifications via Socket.io  
✅ Persistent storage in database  
✅ Email notifications with HTML templates  
✅ User preference management  
✅ Automatic reminders and overdue tracking  
✅ Full error handling and logging  
✅ Production-ready implementation  

---

**Frontend Integration Complete** ✅

For backend setup, see NOTIFICATION_SYSTEM_SETUP.md
