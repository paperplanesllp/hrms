# Admin Features Quick Reference

## ⚡ Navigation Quick Links

### Router Configuration
- **File**: `erp-dashboard/src/app/routes.jsx`
- **Sidebar Component**: `erp-dashboard/src/components/layout/RoleBasedSidebar.jsx`
- **Layout Wrapper**: `erp-dashboard/src/components/layout/AppLayout.jsx`

---

## 📊 Admin-Only Pages

### 1. **Staff Directory** (`/admin/users`)
```
File:   erp-dashboard/src/features/users/UsersPage.jsx
Access: ADMIN + HR
UI:     Stats cards + Search + Filter by role + User list
Stats:  Total Staff, Admins, HR, Employees
```
**Key Features**:
- Global search by name/email
- Filter by role
- Role color-coding (Admin=red, HR=blue, Employee=green)
- Responsive grid layout

---

### 2. **HR Team** (`/admin/hr`)
```
File:   erp-dashboard/src/features/users/HrPage.jsx
Access: ADMIN only
UI:     Gradient dark card + HR list
Design: Premium gradient (navy + purple)
```
**Key Features**:
- Admin-exclusive HR team view
- Card-based layout with avatars
- Hover effects

---

### 3. **Attendance Logs** (`/admin/attendance`)
```
File:   erp-dashboard/src/features/admin/AdminAttendancePage.jsx
Access: ADMIN + HR
UI:     Summary stats + Filter panel + Data table
Filters: User, Start Date, End Date, Status
```
**Key Features**:
- Summary bars: Present (green), Short Hours (orange), Absent (red)
- Multi-filter support
- User-by-user attendance records
- Status badges with icons
- Refresh and export options

---

### 4. **Leave Management** (`/leave/manage`)
```
File:   erp-dashboard/src/features/leave/LeaveManagePage.jsx
Access: ADMIN + HR
UI:     Leave requests + Approval workflow
```

---

### 5. **Payroll Management** (`/payroll/manage`)
```
File:   erp-dashboard/src/features/payroll/PayrollManagePage.jsx
Access: ADMIN + HR
UI:     Salary info + Payroll processing
```

---

### 6. **HR Leave Approval** (`/leave/hr-approval`)
```
Access: ADMIN only
Purpose: Special admin queue for HR leave management
```

---

## 🎨 Component System for Admin Pages

### Reusable Components
Location: `erp-dashboard/src/components/ui/`

| Component | File | Usage |
|-----------|------|-------|
| **Card** | `Card.jsx` | Content containers |
| **Button** | `Button.jsx` | Actions (primary, secondary) |
| **Badge** | `Badge.jsx` | Status indicators |
| **Input** | `Input.jsx` | Text/date inputs |
| **Table** | `Table.jsx` | Data tables |
| **Spinner** | `Spinner.jsx` | Loading states |
| **Modal** | `Modal.jsx` | Dialogs |
| **NotificationCenter** | `NotificationCenter.jsx` | Alert notifications |

### Common Layout Components
Location: `erp-dashboard/src/components/common/`

| Component | File | Usage |
|-----------|------|-------|
| **PageTitle** | `PageTitle.jsx` | Page header with title/subtitle |
| **StatCard** | `StatCard.jsx` | Statistics display cards |
| **EmptyState** | `EmptyState.jsx` | No data fallbacks |

---

## 🔐 Role-Based Access Control

### ROLES Definition
Location: `erp-dashboard/src/app/constants.js`

```javascript
export const ROLES = {
  ADMIN: "ADMIN",        // Full access
  HR: "HR",              // Management functions
  USER: "USER"           // Basic employee access
}
```

### How It Works
1. User logs in → Token with role stored in localStorage
2. `useAuthStore` provides current `user.role`
3. `ProtectedRoute` component checks role before rendering
4. Sidebar conditionally shows links based on role
5. API calls auto-add Authorization header

### Example: Role Check in Sidebar
```javascript
const isAdmin = user?.role === ROLES.ADMIN;
const isHR = user?.role === ROLES.HR;

// Show links based on role
const adminLinks = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/hr", label: "HR Team" },
  { to: "/admin/attendance", label: "Attendance Logs" }
];

const finalLinks = [
  ...commonLinks,
  ...(isHR ? hrLinks : []),
  ...(isAdmin ? adminLinks : [])
];
```

---

## 🎨 Styling & Colors Quick Reference

### Theme Configuration
Location: `erp-dashboard/tailwind.config.js`

### Color Palette
```
Primary Navy Blue:
  navy-50:  #F6FAFD (backgrounds)
  navy-100: #E8F1F7 (light sections)
  navy-200: #B3CFE5 (light text - hover)
  navy-300: #4A7FA7 (accent - active)
  navy-400: #1A3D63 (dark - icons)
  navy-900: #0A1931 (sidebar bg)

Status Colors (Semantic):
  ✅ Green:   #137333 (Present, Success)
  ⚠️  Orange:  Orange-500/600 (Short Hours, Warnings)
  ❌ Red:     #C5221F (Absent, Errors)
  ℹ️  Blue:    #4A7FA7 (Info, Links)
```

### How to Use in Components
```jsx
// Inactive sidebar item
className="text-[#B3CFE5] hover:text-white bg-[#1A3D63]/60"

// Active sidebar item
className="bg-[#4A7FA7] text-white"

// Sidebar background
className="bg-[#0A1931]"

// Card with navy accents
className="border-l-4 border-l-[#4A7FA7]"
```

---

## 📡 Real-Time Features for Admin

### Socket.io Events Available

#### User Presence
```javascript
socket.on("user_online", (userData) => {
  // userData: { userId, userName, userEmail, status: "online" }
});

socket.on("user_offline", (userData) => {
  // Handle user going offline
});

socket.on("online_users_list", (users) => {
  // Array of all currently online users
});
```

#### Notifications
```javascript
// Real-time notifications
socket.on("notification", (notificationData) => {
  // Handle incoming notification
});

// Policy updates
socket.on("policy_update", (policyData) => {
  // Handle policy change
});

// News announcements
socket.on("news_published", (newsData) => {
  // Handle new news
});
```

#### Chat Events
```javascript
socket.on("new_message", (messageData) => {});
socket.on("group_updated", (groupData) => {});
socket.on("group_member_added", (data) => {});
socket.on("user_typing", () => {});
```

### Notification Store
Location: `erp-dashboard/src/store/enterpriseNotificationStore.js`

```javascript
// Get notifications
const notifications = useNotificationStore(s => s.notifications);

// Mark as read
useNotificationStore(s => s.markAsRead(notificationId));

// Mark all as read
useNotificationStore(s => s.markAllAsRead());

// Get unread count
const unreadCount = useNotificationStore(s => s.unreadCount);
```

---

## 🚀 Adding New Admin Features

### Step 1: Create Route
```javascript
// In routes.jsx
<Route
  path="admin/new-feature"
  element={
    <ProtectedRoute roles={[ROLES.ADMIN]}>
      <NewFeaturePage />
    </ProtectedRoute>
  }
/>
```

### Step 2: Add to Sidebar
```javascript
// In RoleBasedSidebar.jsx
const adminLinks = [
  { to: "/admin/new-feature", icon: <Icon />, label: "New Feature" },
  // ... other links
];
```

### Step 3: Create Feature Component
```javascript
// features/admin/NewFeaturePage.jsx
export default function NewFeaturePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/admin/new-feature");
        setData(res.data || []);
      } catch (err) {
        toast({ title: "Error", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle title="New Feature" subtitle="Description" />
      {loading ? <Spinner /> : (
        // Your content
      )}
    </div>
  );
}
```

### Step 4: Style with Tailwind
```jsx
// Use navy colors
className="bg-[#0A1931] text-[#B3CFE5] hover:bg-[#1A3D63]"

// Use semantic colors for status
className="border-l-4 border-l-[#137333] bg-green-50"
```

---

## 🔧 Common Admin Operations

### Fetching Admin Data
```javascript
import api from "../../lib/api.js";

// With error handling and loading state
const load = async () => {
  setLoading(true);
  try {
    const res = await api.get("/admin/endpoint");
    setData(res.data || []);
  } catch (err) {
    const message = err.response?.status === 403 
      ? "Access denied"
      : "Failed to load data";
    toast({ title: message, type: "error" });
  } finally {
    setLoading(false);
  }
};
```

### Sending Admin Actions
```javascript
// Create
const create = async () => {
  try {
    const res = await api.post("/admin/endpoint", { data });
    toast({ title: "Created successfully", type: "success" });
    load(); // Refresh
  } catch (err) {
    toast({ title: "Failed to create", type: "error" });
  }
};

// Update
const update = async (id) => {
  try {
    await api.patch(`/admin/endpoint/${id}`, { updates });
    toast({ title: "Updated successfully", type: "success" });
    load();
  } catch (err) {
    toast({ title: "Failed to update", type: "error" });
  }
};

// Delete
const remove = async (id) => {
  if (!window.confirm("Delete this item?")) return;
  try {
    await api.delete(`/admin/endpoint/${id}`);
    toast({ title: "Deleted successfully", type: "success" });
    load();
  } catch (err) {
    toast({ title: "Failed to delete", type: "error" });
  }
};
```

### Showing Confirmation Dialogs
```javascript
const handleDelete = async (id) => {
  if (window.confirm("Are you sure you want to delete this?")) {
    // Delete logic
  }
};
```

---

## 📱 Responsive Breakpoints

### Tailwind Breakpoints
- **Mobile**: No prefix (max-width: 640px)
- **Tablet**: `md:` (640px+)
- **Desktop**: `lg:` (1024px+)
- **Wide**: `xl:` (1280px+)

### Example
```jsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>...</Card>
</div>

// Sidebar: hidden on mobile, visible on desktop
<aside className="hidden lg:block">Sidebar</aside>
```

---

## 🔍 Debugging Admin Features

### Check User Role
```javascript
// In browser console
JSON.parse(localStorage.getItem('erp_auth')).user.role
// Should return: "ADMIN" or "HR" or "USER"
```

### Check Socket Connection
```javascript
// In browser console
// Should see: "✅ Socket connected successfully"
// Check for "❌ Socket connection error" warnings
```

### Check API Headers
```javascript
// In Network tab
// Authorization header should be: "Bearer <token>"
```

### Common Issues
| Issue | Check |
|-------|-------|
| Can't access page | Verify role in localStorage |
| 401 errors | Check token exists and hasn't expired |
| Socket not connecting | Check backend on port 5000 |
| Styles not applying | Check Tailwind config + npm run build |

---

## 📁 File Structure for Reference

```
erp-dashboard/src/
├── components/layout/
│   ├── RoleBasedSidebar.jsx ← Admin nav configuration
│   ├── AppLayout.jsx
│   └── HeaderBar.jsx
├── features/
│   ├── admin/
│   │   └── AdminAttendancePage.jsx ← Admin feature example
│   ├── users/
│   │   ├── UsersPage.jsx ← Staff directory
│   │   └── HrPage.jsx ← HR team
│   ├── leave/
│   │   ├── LeaveManagePage.jsx ← Leave management
│   │   └── HRLeaveApprovalPage.jsx
│   ├── payroll/
│   │   └── PayrollManagePage.jsx
│   ├── chat/
│   │   └── PremiumChatPage.jsx
│   └── news/
│       └── NewsPage.jsx
├── app/
│   ├── routes.jsx ← All routes defined here
│   └── constants.js ← ROLES defined here
└── tailwind.config.js ← Color palette
```

