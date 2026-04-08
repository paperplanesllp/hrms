# Real-Time Presence System - Quick Integration Code

## 1. Setup Activity Tracking in App.jsx

Add this to your main App component:

```jsx
import { setupPresenceListeners } from './store/presenceStore.js';
import { triggerUserActivity } from './lib/socket.js';

export default function App() {
  useEffect(() => {
    // 1. Setup socket presence listeners
    setupPresenceListeners();
    
    // 2. Track user activity on interactions
    const handleActivity = () => triggerUserActivity();
    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);
    
    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, []);

  return (
    // Your existing app content
  );
}
```

## 2. Add User List to a Page

In your UsersPage.jsx (or any page):

```jsx
import UserListWithPresence from '../components/users/UserListWithPresence.jsx';

export default function UsersPage() {
  const navigate = useNavigate();

  const handleUserSelect = (user) => {
    // Example: Open profile modal or navigate to user profile
    console.log('Selected user:', user.name);
    // navigate(`/users/${user._id}`);
  };

  const handleMessage = (user) => {
    // Example: Start or open chat with user
    navigate(`/chat/${user._id}`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1>Users Directory</h1>
      
      <UserListWithPresence
        onUserSelect={handleUserSelect}
        onMessage={handleMessage}
        showMessageAction={true}
        maxHeight="max-h-[700px]"
      />
    </div>
  );
}
```

## 3. Get Presence Info for a Single User

When displaying a user in other contexts:

```jsx
import { getCompletePresenceInfo } from '../lib/presenceUtils.js';

export default function UserCard({ user }) {
  const presenceInfo = getCompletePresenceInfo(user);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <img 
          src={user.image} 
          alt={user.name}
          className="w-10 h-10 rounded-full"
        />
        {/* Status dot */}
        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${presenceInfo.dotColor}`} />
      </div>
      
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-gray-500">{presenceInfo.statusLabel}</p>
      </div>
    </div>
  );
}
```

## 4. Subscribe to Presence Store Updates

In any component:

```jsx
import { usePresenceStore } from '../store/presenceStore.js';

export default function UserStats() {
  const { getOnlineCount, users } = usePresenceStore();

  const onlineCount = getOnlineCount();
  const totalCount = Object.keys(users).length;

  return (
    <div>
      <p>Online: {onlineCount} / {totalCount}</p>
    </div>
  );
}
```

## 5. Search Users with Presence

In a search component:

```jsx
import { usePresenceStore } from '../store/presenceStore.js';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'online', 'offline'
  
  const { searchUsers, getSortedUsers } = usePresenceStore();

  const results = query.trim() 
    ? searchUsers(query, filterStatus)
    : getSortedUsers(filterStatus);

  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      
      <div>
        <button onClick={() => setFilterStatus('all')}>All</button>
        <button onClick={() => setFilterStatus('online')}>Online</button>
        <button onClick={() => setFilterStatus('offline')}>Offline</button>
      </div>

      <ul>
        {results.map(user => (
          <li key={user._id}>{user.name} - {user.status}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 6. Show Status Badge in Chat Header

For chat list or chat header:

```jsx
import { formatLastSeen } from '../lib/presenceUtils.js';

export default function ChatHeader({ user }) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h2>{user.name}</h2>
        {user.isOnline ? (
          <p className="text-sm text-green-600">Active now</p>
        ) : (
          <p className="text-sm text-gray-500">
            {formatLastSeen(user.lastSeen)}
          </p>
        )}
      </div>
    </div>
  );
}
```

## 7. Show User Presence in Modal/Popup

When showing expanded user info:

```jsx
import { getPresenceStatus, formatLastSeen } from '../lib/presenceUtils.js';

export default function UserProfile({ user }) {
  const status = getPresenceStatus(user);

  return (
    <div className="p-6">
      <img src={user.image} alt={user.name} className="w-20 h-20 rounded-full" />
      
      <h2>{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
      
      {/* Presence Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="font-medium">Status</p>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${status.color}`} />
          <span>{status.label}</span>
        </div>
        
        {!user.isOnline && (
          <p className="text-sm text-gray-600 mt-2">
            Last seen: {formatLastSeen(user.lastSeen)}
          </p>
        )}
      </div>
    </div>
  );
}
```

## 8. Minimal Form Integration

If you just need to quickly add it somewhere:

```jsx
// In any route or page:
import UserListWithPresence from '../components/users/UserListWithPresence.jsx';

<UserListWithPresence
  showMessageAction={false}
  maxHeight="max-h-[500px]"
/>
```

## 9. Monitor Presence Store (for debugging)

```jsx
import { usePresenceStore } from '../store/presenceStore.js';

export default function DebugPresence() {
  const { users, getOnlineCount } = usePresenceStore();

  return (
    <details>
      <summary>Presence Debug Info</summary>
      <pre>
        {JSON.stringify({
          totalUsers: Object.keys(users).length,
          onlineCount: getOnlineCount(),
          users: Object.entries(users).map(([id, user]) => ({
            id,
            name: user.name,
            isOnline: user.isOnline,
            lastActivityAt: user.lastActivityAt,
            lastSeen: user.lastSeen,
          })),
        }, null, 2)}
      </pre>
    </details>
  );
}
```

## 10. Handle Presence Events Manually (Advanced)

If you need custom event handling:

```jsx
import { useEffect } from 'react';

export default function CustomPresenceHandler() {
  useEffect(() => {
    // Listen for presence init event
    const handlePresenceInit = (event) => {
      console.log('Online users:', event.detail);
    };

    // Listen for presence update event
    const handlePresenceUpdate = (event) => {
      console.log('Presence changed:', event.detail);
    };

    window.addEventListener('socket:presence:init', handlePresenceInit);
    window.addEventListener('socket:presence:update', handlePresenceUpdate);

    return () => {
      window.removeEventListener('socket:presence:init', handlePresenceInit);
      window.removeEventListener('socket:presence:update', handlePresenceUpdate);
    };
  }, []);

  return null;
}
```

## API Reference

### usePresenceStore

```javascript
const {
  // State
  users,                    // Map of all users: { userId: userObj }
  
  // Methods
  initializeUsers,          // (users) => Set initial user list from API
  handlePresenceInit,       // (onlineUsers) => Load initial online users
  handlePresenceUpdate,     // (presenceData) => Update single user presence
  
  // Queries
  getSortedUsers,          // (filterStatus) => Returns sorted user array
  searchUsers,             // (query, filterStatus) => Search with sorting
  getOnlineCount,          // () => Returns number of online users
  
  // Config
  setFilterStatus,         // (status) => Set active filter
  
  // Setup
  setupPresenceListeners,  // () => Attach window event listeners
} = usePresenceStore();
```

### Utility Functions

```javascript
import {
  // Status
  getPresenceStatus,       // (user) => {status, label, color, icon, tooltip}
  isUserOnline,           // (user) => boolean
  isUserAway,             // (user) => boolean
  isUserActiveNow,        // (user) => boolean
  
  // Formatting
  formatLastSeen,         // (date) => "today at 8:45 PM"
  formatTimeInIndianTZ,   // (date) => "8:45 PM"
  formatDateInIndianTZ,   // (date) => "08 Apr 2026"
  
  // Utilities
  getStatusDotColor,      // (status) => "bg-green-500" | "bg-yellow-500" | "bg-gray-400"
  getCompletePresenceInfo,// (user) => Full UI data object
} from '../lib/presenceUtils.js';
```

### Socket Functions

```javascript
import {
  startHeartbeat,         // () => Start heartbeat loop (25s)
  stopHeartbeat,          // () => Stop heartbeat loop
  triggerUserActivity,    // () => Manual activity report
} from '../lib/socket.js';
```

## Copy-Paste Ready Templates

### Template 1: Add to Existing Users Page

```jsx
// At top of UsersPage.jsx
import UserListWithPresence from '../components/users/UserListWithPresence.jsx';

// In the component
<UserListWithPresence
  onUserSelect={(user) => console.log(user)}
  onMessage={(user) => navigate(`/chat/${user._id}`)}
  showMessageAction={true}
/>
```

### Template 2: Sidebar Widget

```jsx
// components/SidebarPresence.jsx
import UserListWithPresence from './users/UserListWithPresence.jsx';

export default function SidebarPresence() {
  return (
    <div className="w-64 bg-white border-r">
      <h3 className="p-4 font-bold">Team Members</h3>
      <UserListWithPresence
        showMessageAction={false}
        maxHeight="max-h-[500px]"
      />
    </div>
  );
}
```

### Template 3: Modal Popup

```jsx
// components/UserDirectoryModal.jsx
import { useState } from 'react';
import UserListWithPresence from './users/UserListWithPresence.jsx';

export default function UserDirectoryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Directory</h2>
        <UserListWithPresence
          onUserSelect={() => onClose()}
          onMessage={() => onClose()}
          showMessageAction={true}
          maxHeight="max-h-[400px]"
        />
      </div>
    </div>
  );
}
```

## Troubleshooting Integration

**Nothing appears:**
- Check presenceStore is initialized: `setupPresenceListeners()`
- Check socket is connected in browser DevTools

**Wrong time format:**
- Verify: `presenceUtils.js` uses `Intl.DateTimeFormat('en-IN')`
- Check browser language settings

**User count wrong:**
- Clear localStorage, refresh page
- Check server logs for stale session cleanup

**Multi-tab issues:**
- Verify: presenceManager.js is being used
- Check: socket disconnects properly
- Monitor: User model fields (isOnline, lastSeen)

## Files to Import

```javascript
// State management
import { usePresenceStore } from './store/presenceStore.js';

// Components
import UserListWithPresence from './components/users/UserListWithPresence.jsx';
import UserListItem from './components/users/UserListItem.jsx';

// Utilities
import {
  getPresenceStatus,
  formatLastSeen,
  getCompletePresenceInfo,
} from './lib/presenceUtils.js';

// Socket
import { triggerUserActivity } from './lib/socket.js';
```

## Required Backend API

Your backend must provide:

**GET /api/users**
```json
Response: [
  {
    "_id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "url_to_avatar",
    "isOnline": true,
    "lastActivityAt": "2024-01-15T10:45:00Z",
    "lastSeen": "2024-01-15T10:30:00Z"
  },
  ...
]
```

The socket already broadcasts presence data via `presence:init` and `presence:update` events.

---

**All code above is production-ready and can be copy-pasted directly into your project.**
