# ERP Project Workspace Exploration Summary

## Overview
This is a **Premium SaaS ERP System** built with React (Vite), Node.js, MongoDB, and Socket.io for real-time features. The application uses role-based access control (ADMIN, HR, USER) with advanced features like secure messaging, attendance tracking, leave management, payroll, and real-time notifications.

---

## 1. ADMIN SIDEBAR STRUCTURE

### Location
- **Component File**: [erp-dashboard/src/components/layout/RoleBasedSidebar.jsx](erp-dashboard/src/components/layout/RoleBasedSidebar.jsx)
- **Related Layout Files**:
  - [AppLayout.jsx](erp-dashboard/src/components/layout/AppLayout.jsx) - Main layout wrapper
  - [HeaderBar.jsx](erp-dashboard/src/components/layout/HeaderBar.jsx) - Top navigation bar

### Sidebar Features
- **Role-Based Navigation**: Different menu items for ADMIN, HR, and regular users
- **Responsive Design**: 
  - Desktop: Fixed sidebar (sticky)
  - Mobile: Collapsible overlay (z-50)
  - Navigation with smooth animations and transitions
- **Visual Design**:
  - Navy blue color scheme (#0A1931 dark background)
  - Light blue accent (#4A7FA7) for active items
  - Icons from `lucide-react` library
  - Active state with scale animation (scale-105)

### Navigation Structure

**Common Links (All Users)**:
```
📊 Dashboard (/)
👤 My Profile (/profile)
💬 Messages (/chat)
🕐 Attendance (/attendance)
📅 Calendar (/calendar)
📋 Leave (/leave)
💰 Payroll (/payroll)
📄 Worksheet (/worksheet)
📢 News (/news)
🔒 Policy Center (/policy)
```

**HR-Specific Links**:
```
⚙️  Manage Leave (/leave/manage)
💰 Manage Payroll (/payroll/manage)
🕐 Attendance Logs (/admin/attendance)
👥 Manage Users (/admin/users)
```

**Admin-Only Links** (extends HR links):
```
⚙️  Manage Leave (/leave/manage)
⚙️  Manage Payroll (/payroll/manage)
🕐 Attendance Logs (/admin/attendance)
👥 Users (/admin/users)
👥 HR Team (/admin/hr)
```

---

## 2. ROUTING & NAVIGATION ORGANIZATION

### Main Routes File
- **Location**: [erp-dashboard/src/app/routes.jsx](erp-dashboard/src/app/routes.jsx)

### Authorization Model
- Built with **ProtectedRoute** component for role-based access
- Three roles: `ADMIN`, `HR`, `USER` (defined in [constants.js](erp-dashboard/src/app/constants.js))
- Token-based auth with JWT stored in localStorage

### Route Structure
```
/                          - Protected App Layout
  /                        - Dashboard
  /profile                 - User Profile
  /chat                    - Premium Chat (All users)
  /attendance              - User Attendance
  /calendar                - Calendar View
  /leave                   - Leave Requests
  /payroll                 - Payroll Info
  /worksheet               - Worksheet
  /news                    - News Feed
  /policy                  - Policy Center
  
  /news-studio             - News Editor (HR only)
  /privacy-policy          - Privacy Policy
  /policy-editor           - Policy Editor (HR only)
  
  /leave/manage            - Leave Management (ADMIN + HR)
  /leave/hr-approval       - HR Leave Approval (ADMIN only)
  /payroll/manage          - Payroll Management (ADMIN + HR)
  /admin/users             - Users Management (ADMIN + HR)
  /admin/hr                - HR Team (ADMIN only)
  /admin/attendance        - Attendance Logs (ADMIN + HR)

/login, /signup, /reset-password - Public auth routes
```

---

## 3. ADMIN FEATURES STRUCTURE

### Admin Module Location
- **Path**: [server/src/modules/admin/](server/src/modules/admin/)
- **Frontend**: [erp-dashboard/src/features/admin/](erp-dashboard/src/features/admin/)

### Current Admin Features

#### A. **User Management** ([UsersPage.jsx](erp-dashboard/src/features/users/UsersPage.jsx))
- **Route**: `/admin/users`
- **Access**: ADMIN + HR
- **Features**:
  - Global staff directory with search
  - Role filtering (Admin, HR, Employee)
  - Stats cards showing role distribution
  - User list with role badges
  - Color-coded by role: Admin (red), HR (blue), Employee (green)

#### B. **HR Team Management** ([HrPage.jsx](erp-dashboard/src/features/users/HrPage.jsx))
- **Route**: `/admin/hr`
- **Access**: ADMIN only
- **Features**:
  - Admin-exclusive view of HR users
  - Gradient dark UI with purple accents
  - User cards with profiles

#### C. **Attendance Logs** ([AdminAttendancePage.jsx](erp-dashboard/src/features/admin/AdminAttendancePage.jsx))
- **Route**: `/admin/attendance`
- **Access**: ADMIN + HR
- **Features**:
  - Filter by user, date range, status
  - Summary stats (Present, Short Hours, Absent)
  - Status badges with color coding
  - Refresh and export capabilities

#### D. **Leave Management** ([LeaveManagePage.jsx](../features/leave/))
- **Route**: `/leave/manage`
- **Access**: ADMIN + HR
- **Features**:
  - Approve/Reject leave requests
  - View all employee leave applications

#### E. **Payroll Management** ([PayrollManagePage.jsx](../features/payroll/))
- **Route**: `/payroll/manage`
- **Access**: ADMIN + HR
- **Features**:
  - Manage employee payroll
  - View salary information

---

## 4. COMPONENT STRUCTURE & ARCHITECTURE

### Directory Layout
```
src/
├── components/
│   ├── common/              # Reusable utilities
│   │   ├── PageTitle.jsx    # Page header component
│   │   ├── StatCard.jsx     # Stats display
│   │   ├── EmptyState.jsx   # Empty states
│   │   └── ProtectedRoute.jsx
│   ├── layout/              # Layout wrappers
│   │   ├── AppLayout.jsx    # Main app shell
│   │   ├── RoleBasedSidebar.jsx
│   │   └── HeaderBar.jsx
│   ├── providers/           # Context providers
│   │   ├── SocketProvider.jsx
│   │   └── ThemeProvider.jsx
│   └── ui/                  # Design system components
│       ├── Card.jsx
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Badge.jsx
│       ├── Modal.jsx
│       ├── Spinner.jsx
│       ├── Table.jsx
│       ├── NotificationCenter.jsx
│       ├── GroupChatModal.jsx
│       └── Toast.jsx
│
├── features/               # Feature modules
│   ├── admin/             # Admin-specific features
│   ├── attendance/
│   ├── auth/
│   ├── calendar/
│   ├── chat/              # Premium chat system
│   ├── dashboard/
│   ├── leave/
│   ├── news/              # News & announcements
│   ├── notifications/     # Notification system
│   ├── payroll/
│   ├── policy/            # Policy management
│   ├── profile/
│   ├── users/             # User management
│   └── worksheet/
│
├── lib/                   # Utility libraries
│   ├── api.js             # Axios interceptor
│   ├── auth.js            # Auth helpers
│   ├── socket.js          # Socket.io setup
│   ├── encryption.js      # Message encryption
│   ├── rbac.js            # Role-based access
│   ├── useNewsNotifications.js
│   └── date.js
│
├── store/                 # Zustand stores
│   ├── authStore.js
│   ├── enterpriseNotificationStore.js
│   ├── notificationStore.js
│   └── toastStore.js
│
├── styles/                # Global styles
└── App.jsx
```

### Component Patterns

**1. Feature Page Pattern**:
```jsx
export default function FeaturePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  const load = async () => {
    try {
      const res = await api.get("/endpoint");
      setData(res.data || []);
    } catch (err) {
      toast({ title: "Error", type: "error" });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle title="Feature" subtitle="Description" />
      {loading ? <Spinner /> : <Contents />}
    </div>
  );
}
```

**2. Card-Based UI**:
- Most pages use `<Card>` components for content blocks
- Consistent padding, borders, shadows
- Color-coded status indicators

**3. Data Tables**:
- `<Table>` component for structured data
- Pagination support
- Inline actions (edit, delete)

---

## 5. REAL-TIME FEATURES (Socket.io)

### Socket Architecture

#### Frontend Socket Setup
- **File**: [erp-dashboard/src/lib/socket.js](erp-dashboard/src/lib/socket.js)
- **Provider**: [SocketProvider.jsx](erp-dashboard/src/components/providers/SocketProvider.jsx)

**Connection Flow**:
1. **Authentication**: Token passed in socket auth handshake
2. **Initialization**: Happens on app mount if user exists
3. **Error Handling**: Automatic reconnection with exponential backoff
4. **Cleanup**: Socket disconnects on logout

**Key Features**:
- Automatic reconnection (up to 10 attempts)
- WebSocket + polling fallback
- Connection monitoring and logging
- Auth token validation

#### Backend Socket Setup
- **File**: [server/src/utils/socket.js](server/src/utils/socket.js)

**Authentication Middleware**:
- Validates JWT token from socket handshake
- Fetches user data (excludes password)
- Tracks online/offline status
- Assigns user to personal room: `user_<userId>`
- HR/Admin assigned to `hr_management` room

### Real-Time Events Implemented

#### 1. **Chat System** (Premium Feature)
- `new_message` - New message received
- `user_typing` - User typing indicator
- `user_stop_typing` - Typing stopped
- `group_updated` - Group chat updated
- `group_member_added/removed` - Group membership changes
- `group_renamed` - Group name changed
- Socket encryption for message security

#### 2. **Online Status**
- `user_online` - User connected (broadcast to all)
- `user_offline` - User disconnected
- `online_users_list` - List of currently online users
- Real-time presence updates

#### 3. **Notifications System**
- Enterprise notifications with database sync
- Real-time notification delivery
- Policy update notifications with viewed tracking
- News announcements with persistence

#### 4. **HR Management Events**
- HR/Admin assigned to `hr_management` room
- Targeted notifications for management tasks
- Leave approval updates
- Payroll notifications

### Notification Store
- **File**: [store/enterpriseNotificationStore.js](erp-dashboard/src/store/enterpriseNotificationStore.js)
- **Status**: Uses Zustand for state management
- **Features**:
  - Fetch notifications from API
  - Mark as read (individual/batch)
  - Unread count tracking
  - Filter by type (policy, news, etc.)

---

## 6. STYLING & DESIGN SYSTEM

### Tailwind Configuration
- **File**: [tailwind.config.js](erp-dashboard/tailwind.config.js)

### Color Palette (Navy + Blue Theme)

**Primary Navy Blue**:
```
navy: {
  50:  #F6FAFD (very light)
  100: #E8F1F7 (light background)
  200: #B3CFE5 (light text)
  300: #4A7FA7 (accent)
  400: #1A3D63 (dark accent)
  900: #0A1931 (near black - sidebar bg)
}
```

**Semantic Colors**:
- ✅ Green: #137333 (Present, Success)
- ⚠️  Orange: Orange-500/600 (Warnings, Short Hours)
- ❌ Red: #C5221F (Absent, Errors)
- ℹ️  Blue: #4A7FA7 (Info, Active states)

### Typography System

**Font Family**: Inter, Plus Jakarta Sans, system-ui

**Text Sizes**:
```
heading-xl:  1.875rem (700 weight)
heading-lg:  1.5rem (600 weight)
heading-md:  1.25rem (600 weight)
heading-sm:  1.125rem (600 weight)
body-base:   1rem (400 weight, 1.6 line-height)
body-sm:     0.875rem (400 weight)
```

### Spacing & Effects

**Border Radius**:
- Standard: `rounded-2xl` (1rem)
- Large: `rounded-3xl` (1.5rem)

**Shadows** (Navy-based):
```
sm:  0 1px 2px 0 rgba(10, 25, 49, 0.05)
md:  0 4px 6px -1px rgba(10, 25, 49, 0.1)
lg:  0 10px 15px -3px rgba(10, 25, 49, 0.1)
xl:  0 20px 25px -5px rgba(10, 25, 49, 0.1)
2xl: 0 25px 50px -12px rgba(10, 25, 49, 0.15)
```

**Dark Mode**: Supported via `dark:` class prefix

### Component Styling Patterns

**Sidebar Navigation Item**:
- Base: Flex, gap, padding, rounded, text-sm, font-semibold
- Active: Navy background, white text, shadow, scale-105
- Inactive: Light blue text, hover to darker color
- Icon: Nested box with navy background

**Card Components**:
- Padding: p-5 to p-6
- Border: Light navy or white/10 (dark mode)
- Shadows: md to lg scale
- Hover: Enhanced shadow on interactive cards

**Status Badges**:
- Text color + background color matching status
- Small font, rounded-lg
- Examples: Green for PRESENT, Orange for SHORT_HOURS, Red for ABSENT

**Buttons**:
- Variants: primary (navy), secondary (outline)
- Size: sm, md, lg
- Icons integrated inline
- Hover: Darker color, shadow enhancement

---

## 7. PREMIUM FEATURES IMPLEMENTED

### A. **Premium Chat System**
- **File**: [features/chat/PremiumChatPage.jsx](erp-dashboard/src/features/chat/PremiumChatPage.jsx)
- **Features**:
  - 1-on-1 and group chats
  - End-to-end encryption (AES encryption)
  - User online/typing status
  - Audio messages (AudioPlayer component)
  - Emoji picker (16 built-in emojis)
  - Message editing and deletion
  - Voice/video call UI (placeholders)
  - Dark/light mode toggle
  - Clear chat history
  - Group creation and management
  - Real-time message sync via Socket.io

### B. **News & Announcements**
- **File**: [features/news/NewsPage.jsx](erp-dashboard/src/features/news/NewsPage.jsx)
- **Features**:
  - Company announcements
  - HR-exclusive news studio for creating content
  - Policy update notifications
  - Viewed tracking (admins see unviewed indicators)
  - Image support for news items
  - CRUD operations (Create, Read, Update, Delete)

### C. **Calendar System**
- **File**: [features/calendar/CalendarPage.jsx](../features/calendar/)
- **Features**:
  - Team calendar view
  - Event scheduling
  - Integration with attendance

### D. **Policy Management**
- **File**: [features/policy/PolicyEditor.jsx](../features/policy/)
- **Features**:
  - HR can create/edit policies
  - Users can view in Policy Center
  - Notification system for policy updates
  - Mark as viewed tracking

### E. **Attendance Tracking**
- User check-in/check-out
- Real-time status monitoring
- Admin attendance logs with filters
- Status badges (Present, Absent, Short Hours)

### F. **Leave Management**
- Employee leave requests
- HR/Admin approval workflow
- HR leave approval queue for admins
- Status tracking

### G. **Payroll System**
- Employee payroll view
- HR/Admin payroll management
- Salary information display

---

## 8. AUTHENTICATION SYSTEM

### Auth Flow
- **File**: [lib/auth.js](erp-dashboard/src/lib/auth.js)
- **Storage**: localStorage with key `erp_auth`
- **Token Type**: JWT with access + refresh tokens

**Auth Object Structure**:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "userId",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "ADMIN"
  }
}
```

### API Interceptor
- **File**: [lib/api.js](erp-dashboard/src/lib/api.js)
- **Features**:
  - Auto-adds Authorization header to all requests
  - 401 handling with automatic token refresh
  - Retry failed requests with new token
  - Redirects to login on persistent 401
  - FormData support (auto Content-Type)

---

## 9. KEY IMPLEMENTATION PATTERNS

### 1. **Data Fetching Pattern**
```javascript
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);

const load = async () => {
  try {
    setLoading(true);
    const res = await api.get("/endpoint");
    setData(res.data || []);
  } catch (err) {
    toast({ title: "Error", type: "error" });
  } finally {
    setLoading(false);
  }
};

useEffect(() => { load(); }, []);
```

### 2. **State Management**
- **Zustand** for global state (auth, notifications, toast)
- **Local useState** for component-level state
- No Redux - keeps dependencies minimal

### 3. **Error Handling**
- Status code checking (401, 403, 500)
- User-friendly error messages
- Toast notifications for errors
- Fallback UI when data missing

### 4. **Loading States**
- Spinner component for full-page loading
- Skeleton placeholders for gradual loading
- Disabled buttons during submit
- "No data" empty states

### 5. **Type Safety**
- PropTypes for component props
- Environment variables via import.meta.env
- Consistent naming (singular/plural)

### 6. **Responsive Design**
- Mobile-first Tailwind classes
- `md:` breakpoint for tablets
- `lg:` breakpoint for desktop
- `hidden`/`flex` for mobile/desktop switching

### 7. **Real-Time Updates**
- Socket listeners in useEffect cleanup
- Store updates trigger component re-renders
- Zustand for consistent state

---

## 10. SERVER ARCHITECTURE OVERVIEW

### Backend Structure
```
server/src/
├── modules/
│   ├── admin/        - Admin operations
│   ├── attendance/   - Attendance tracking
│   ├── auth/         - Authentication
│   ├── calendar/     - Calendar events
│   ├── chat/         - Chat messages & conversations
│   ├── dashboard/    - Dashboard stats
│   ├── leave/        - Leave requests
│   ├── news/         - News announcements
│   ├── notifications/- Notification system
│   ├── payroll/      - Payroll data
│   ├── policy/       - Policy management
│   ├── users/        - User management
│   └── worksheet/    - Worksheet tracking
├── middleware/       - Auth, CORS, error handling
├── routes/           - API routes
├── config/           - Database, environment
└── utils/
    ├── socket.js     - Socket.io initialization
    ├── cronJobs.js   - Scheduled tasks
    └── email.js      - Email utilities
```

### Socket.io Backend Features
- JWT token validation
- Online user tracking
- Room management (personal rooms + management rooms)
- Event broadcasting
- Authentication middleware

---

## 11. ENVIRONMENT & DEPLOYMENT

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (.env)
```
PORT=5000
DATABASE_URL=mongodb://...
JWT_ACCESS_SECRET=secret
JWT_REFRESH_SECRET=secret
NODE_ENV=development
```

### CORS Configuration
```javascript
// Socket.io CORS
origin: ["http://localhost:5173", "http://localhost:5174"]
// Supports both Vite dev ports
```

---

## 12. KEY FILES FOR ADMIN FEATURES

### Critical Admin Files
1. **Sidebar**: [RoleBasedSidebar.jsx](erp-dashboard/src/components/layout/RoleBasedSidebar.jsx)
2. **Routes**: [routes.jsx](erp-dashboard/src/app/routes.jsx)
3. **Constants**: [constants.js](erp-dashboard/src/app/constants.js)
4. **User Management**: [UsersPage.jsx](erp-dashboard/src/features/users/UsersPage.jsx)
5. **Attendance**: [AdminAttendancePage.jsx](erp-dashboard/src/features/admin/AdminAttendancePage.jsx)
6. **Chat**: [PremiumChatPage.jsx](erp-dashboard/src/features/chat/PremiumChatPage.jsx)
7. **Socket Provider**: [SocketProvider.jsx](erp-dashboard/src/components/providers/SocketProvider.jsx)
8. **Tailwind Config**: [tailwind.config.js](erp-dashboard/tailwind.config.js)

---

## 13. NEXT STEPS FOR EXPANSION

### Ready for Admin Enhancement
1. ✅ Sidebar structure supports new admin-only routes
2. ✅ Role-based route protection in place
3. ✅ Socket.io infrastructure for real-time updates
4. ✅ Notification system ready for broadcasts
5. ✅ Design system established (colors, typography, components)

### Suggested New Admin Features
- Dashboard analytics/charts
- System settings panel
- Audit logs
- Backup/restore functionality
- User activity monitoring
- Bulk operations (import/export)
- Advanced reporting
- Department management
- Role customization

