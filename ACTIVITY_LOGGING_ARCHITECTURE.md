# Activity Logging System - Architecture & Data Flow

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTIONS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐       │
│   │  Login   │      │ Logout   │      │ Update   │      │ Request  │       │
│   │ [Staff]  │      │ [Staff]  │      │ Profile  │      │  Leave   │       │
│   └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘       │
│        │                 │                  │                 │              │
│        └─────────────────┴──────────────────┴─────────────────┘              │
│                                  │                                            │
│                         ┌─────────▼────────────┐                            │
│                         │  Auth Service        │                            │
│                         │  Users Controller    │                            │
│                         │  Leave Controller    │                            │
│                         │  (etc.)              │                            │
│                         └─────────┬────────────┘                            │
│                                  │                                            │
│                    ┌─────────────▼──────────────┐                           │
│                    │ createActivityLog()        │                           │
│                    │ (Centralized Service)      │                           │
│                    └─────────────┬──────────────┘                           │
│                                  │                                            │
│         ┌────────────────────────┴────────────────────────┐                 │
│         │         MongoDB ActivityLog Collection          │                 │
│         │                                                  │                 │
│         │  {                                              │                 │
│         │    _id: ObjectId,                               │                 │
│         │    actorId, actorName, actorRole,              │                 │
│         │    targetUserId, targetUserName,                │                 │
│         │    actionType, module, description,            │                 │
│         │    metadata, visibility, createdAt             │                 │
│         │  }                                              │                 │
│         │                                                  │                 │
│         └────────────────────────┬────────────────────────┘                 │
│                                  │                                            │
│   ┌──────────────────────────────┼──────────────────────────────┐            │
│   │                              │                              │            │
│   ▼                              ▼                              ▼            │
│ ┌────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│ │ getHRTimeline()    │  │ getAdminTimeline()  │  │ getUserActivities() │  │
│ │                    │  │                     │  │                     │  │
│ │ Staff activities   │  │ HR + Admin actions  │  │ Personal history    │  │
│ │ (monitored by HR)  │  │ (monitored by Admin)│  │                     │  │
│ └────┬───────────────┘  └──────┬──────────────┘  └──────┬──────────────┘  │
│      │                         │                         │                   │
│      └─────────────────────────┼─────────────────────────┘                   │
│                                │                                              │
└────────────────────────────────┼──────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   API Routes           │
                    │  /api/activity/*       │
                    │                        │
                    │ ✓ requireAuth          │
                    │ ✓ Role checks          │
                    │ ✓ Filtering & paginate │
                    └────────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────────┐          ┌──────────────┐      ┌─────────────┐
   │  Frontend   │          │   Frontend   │      │  Frontend   │
   │ HR Timeline │          │Admin Timeline│      │  Widgets    │
   │  Component  │          │  Component   │      │             │
   └─────────────┘          └──────────────┘      └─────────────┘
        │                        │                        │
        └────────────┬───────────┴────────────┬───────────┘
                     │                        │
                     │         Render        │
                     │      Beautiful        │
                     │      Timeline         │
                     │        Cards          │
                     │                       │
                     └───────────┬───────────┘
                                 │
                         ┌───────▼──────┐
                         │  User Sees   │
                         │  Activities  │
                         │   Timeline   │
                         └──────────────┘
```

---

## Data Flow Diagram

### 1. ACTION TRIGGERED (Login Example)

```
User clicks Login
        │
        ▼
auth.controller.js: postLogin()
        │
        ├─ Validate credentials
        │
        ├─ Create tokens
        │
        ├─ auth.service.js: login()
        │  │
        │  ├─ Find user
        │  ├─ Verify password
        │  ├─ Mark isActive = true
        │  │
        │  └─ createActivityLog({
        │      actorId: user._id,
        │      actorName: user.name,
        │      actorRole: "HR", (or "USER" or "ADMIN")
        │      actionType: "LOGIN",
        │      module: "AUTH",
        │      description: "HR John Doe logged in",
        │      metadata: { email: "john@company.com" }
        │    })
        │
        ├─ Save refreshTokenHash
        │
        └─ Return tokens + user data
```

### 2. ACTIVITY LOGGED (Database Write)

```
createActivityLog()
        │
        ├─ Validate inputs (all required fields)
        │
        ├─ Create ActivityLog document:
        │  {
        │    actorId: ObjectId,
        │    actorName: "John Doe",
        │    actorRole: "HR",
        │    actionType: "LOGIN",
        │    module: "AUTH",
        │    description: "HR John Doe logged in",
        │    metadata: { email: "john@company.com" },
        │    visibility: "PUBLIC",
        │    createdAt: Date.now(),
        │    updatedAt: Date.now()
        │  }
        │
        ├─ Save to MongoDB
        │
        └─ Return activity or null (if error)
        
        (Non-blocking - errors don't crash main operation)
```

### 3. RETRIEVE ACTIVITIES (Read Request)

#### HR wants to see staff activities:

```
HR visits: /hr/activity-timeline
        │
        ▼
Frontend: HRTimeline component
        │
        ├─ useEffect(...) calls useActivityTimeline()
        │
        ├─ fetch("/api/activity/hr-timeline", {
        │    headers: { Authorization: "Bearer $token" }
        │  })
        │
        ▼
Backend: activity.controller.js: getHRTimelineController()
        │
        ├─ requireAuth middleware
        │  └─ Verify JWT token ✓
        │
        ├─ Check role
        │  └─ Must be HR or ADMIN ✓
        │
        ├─ activity.service.js: getHRTimeline({
        │    limit: 50,
        │    skip: 0,
        │    startDate: undefined,
        │    endDate: undefined
        │  })
        │
        ├─ Query ActivityLog collection:
        │  Find({
        │    $or: [
        │      { module: "PROFILE" },
        │      { module: "LEAVE" },
        │      { module: "ATTENDANCE" },
        │      { module: "DOCUMENT" },
        │      { actionType: "EMPLOYEE_UPDATE" }
        │    ]
        │  })
        │  .populate("actorId", "name email role profileImageUrl")
        │  .populate("targetUserId", "name email role profileImageUrl")
        │  .sort({ createdAt: -1 })
        │  .limit(50)
        │  .skip(0)
        │  .lean()
        │
        ├─ Get total count
        │
        └─ Return {
            data: [...activities],
            total: 145,
            limit: 50,
            skip: 0,
            pages: 3
          }
            │
            ▼
Frontend: ActivityTimeline component
        │
        ├─ Render activities
        │  │
        │  ├─ TimelineCard for each
        │  │  └─ Icon, colors, dates, details
        │  │
        │  └─ Pagination button (if hasMore)
        │
        └─ User sees beautiful timeline with:
            - Actor name & role badge
            - Action description
            - Target user if applicable
            - Formatted timestamp
            - Expandable metadata
            - Hover effects & animations
```

---

## Component Hierarchy

```
HRTimeline (Component)
    │
    ├─ useActivityTimeline("hr-timeline")
    │  │
    │  ├─ Returns: activities, loading, error, etc.
    │  │
    │  └─ Fetches from: GET /api/activity/hr-timeline
    │
    └─ ActivityTimeline (Component)
        │
        ├─ maps activities.map()
        │
        └─ ├─ TimelineCard (Component)
           │  │
           │  ├─ getActionIcon(actionType)
           │  │  └─ "🔓" for LOGIN, "👤" for PROFILE_UPDATE, etc.
           │  │
           │  ├─ getActionColor(actionType)
           │  │  └─ bg-green-50 for LOGIN, bg-blue-50 for PROFILE_UPDATE, etc.
           │  │
           │  ├─ getRoleColor(role)
           │  │  └─ bg-red-100 for ADMIN, bg-orange-100 for HR, etc.
           │  │
           │  ├─ formatDate(createdAt)
           │  │  └─ "10:32 AM" or "Yesterday, 3:45 PM" or "Mar 14, 10:32 AM"
           │  │
           │  └─ Render:
           │     - Left border (colored)
           │     - Icon + Role badge (top right)
           │     - Actor name (bold)
           │     - Description
           │     - Target user if applicable
           │     - Expandable metadata JSON
           │     - Timestamp (top right)
           │
           └─ "Load More" button
              └─ Calls: loadMore() hook
                 └─ Fetches next page
                    └─ Appends to activities list
```

---

## Database Schema (Detailed)

```
ActivityLog
├── _id: ObjectId (auto) ✓ Indexed for sorting
├── 
├─ ACTOR INFORMATION (who did it)
├── actorId: ObjectId → User ✓ Indexed with createdAt
├── actorName: String (e.g., "John Doe")
├── actorRole: String (enum: ADMIN | HR | USER) ✓ Indexed
├──
├─ TARGET INFORMATION (who was affected)
├── targetUserId: ObjectId → User (optional)
├── targetUserName: String (e.g., "Sarah Smith")
├──
├─ ACTION DETAILS (what happened)
├── actionType: String (enum: LOGIN | LOGOUT | PROFILE_UPDATE | ...) ✓ Indexed
├── module: String (enum: AUTH | PROFILE | LEAVE | ATTENDANCE | ...) ✓ Indexed
├── description: String (human-readable, e.g., "HR John approved leave")
├──
├─ METADATA (extra context)
├── metadata: Mixed (flexible object)
│  └─ Can contain:
│     ├── updatedFields: ["phone", "email"]
│     ├── changes: { phone: "+1-555-0100", email: "new@email.com" }
│     ├── leaveType: "Annual Leave"
│     ├── startDate: "2024-03-20"
│     ├── approvalReason: "..."
│     └── ... any custom fields
├──
├─ REQUEST INFO (for security tracking)
├── ipAddress: String (optional, e.g., "192.168.1.100")
├── userAgent: String (optional, e.g., "Mozilla/5.0...")
├──
├─ VISIBILITY (access control)
├── visibility: String (enum: PUBLIC | HR_ONLY | ADMIN_ONLY | PRIVATE)
│  ├─ PUBLIC: Visible to all in their timelines
│  ├─ HR_ONLY: HR can see, not shown to regular staff
│  ├─ ADMIN_ONLY: Admin only
│  └─ PRIVATE: Stored but not displayed
├──
└─ TIMESTAMPS
   ├── createdAt: Date ✓ Indexed
   └── updatedAt: Date

INDEXES:
├── { createdAt: -1 } - For sorting newest first
├── { actorRole: 1, createdAt: -1 } - HR timeline queries
├── { module: 1, createdAt: -1 } - Filter by module
├── { actionType: 1, createdAt: -1 } - Filter by action
└── { visibility: 1, createdAt: -1 } - Filter by visibility
```

---

## Request-Response Examples

### REQUEST 1: Get HR Timeline

```http
GET /api/activity/hr-timeline?limit=50&skip=0 HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**RESPONSE 200 OK:**
```json
{
  "data": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "actorId": {
        "_id": "607f1f77bcf86cd799439010",
        "name": "John Doe",
        "email": "john@company.com",
        "role": "HR",
        "profileImageUrl": "/uploads/profile-images/john.jpg"
      },
      "actorName": "John Doe",
      "actorRole": "HR",
      "targetUserId": {
        "_id": "607f1f77bcf86cd799439012",
        "name": "Sarah Smith",
        "email": "sarah@company.com",
        "role": "USER",
        "profileImageUrl": "/uploads/profile-images/sarah.jpg"
      },
      "targetUserName": "Sarah Smith",
      "actionType": "LEAVE_APPROVAL",
      "module": "LEAVE",
      "description": "HR John Doe approved leave request for Sarah Smith",
      "metadata": {
        "leaveId": "leave_123",
        "leaveType": "Annual Leave",
        "startDate": "2024-03-20",
        "endDate": "2024-03-22",
        "approvalReason": "Approved - Within quota"
      },
      "visibility": "PUBLIC",
      "createdAt": "2024-03-14T10:30:00Z",
      "updatedAt": "2024-03-14T10:30:00Z"
    },
    {
      "_id": "607f1f77bcf86cd799439013",
      "actorId": {
        "_id": "607f1f77bcf86cd799439012",
        "name": "Sarah Smith",
        "email": "sarah@company.com",
        "role": "USER",
        "profileImageUrl": "/uploads/profile-images/sarah.jpg"
      },
      "actorName": "Sarah Smith",
      "actorRole": "USER",
      "targetUserId": null,
      "targetUserName": null,
      "actionType": "PROFILE_UPDATE",
      "module": "PROFILE",
      "description": "User Sarah Smith updated personal profile (phone, emergencyContact)",
      "metadata": {
        "updatedFields": ["phone", "emergencyContact"],
        "changes": {
          "phone": "+1-555-0123",
          "emergencyContact": "Jane Doe"
        }
      },
      "visibility": "PUBLIC",
      "createdAt": "2024-03-14T09:15:00Z",
      "updatedAt": "2024-03-14T09:15:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "skip": 0,
  "pages": 1,
  "message": "HR timeline retrieved successfully"
}
```

### REQUEST 2: Get Admin Timeline

```http
GET /api/activity/admin-timeline?limit=50&skip=0 HTTP/1.1
Host: localhost:5000
Authorization: Bearer <ADMIN_TOKEN>
```

**RESPONSE 200 OK:**
```json
{
  "data": [
    {
      "_id": "607f1f77bcf86cd799439014",
      "actorId": {
        "_id": "607f1f77bcf86cd799439010",
        "name": "John Doe",
        "email": "john@company.com",
        "role": "HR",
        "profileImageUrl": "/uploads/profile-images/john.jpg"
      },
      "actorName": "John Doe",
      "actorRole": "HR",
      "actionType": "LOGIN",
      "module": "AUTH",
      "description": "HR John Doe logged in",
      "metadata": {
        "email": "john@company.com",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
      },
      "visibility": "PUBLIC",
      "createdAt": "2024-03-14T08:00:00Z"
    }
  ],
  "total": 32,
  "limit": 50,
  "skip": 0,
  "pages": 1,
  "message": "Admin timeline retrieved successfully"
}
```

---

## Error Handling Flow

```
Request to /api/activity/hr-timeline
        │
        ├─ Check Authorization header
        │  ├─ Missing?  → 401 Unauthorized
        │  ├─ Invalid?  → 401 Unauthorized
        │  └─ Valid ✓   → Continue
        │
        ├─ Check user role
        │  ├─ Not HR/ADMIN? → 403 Forbidden
        │  └─ Is HR/ADMIN ✓ → Continue
        │
        ├─ Validate query parameters
        │  ├─ Invalid limit/skip? → 400 Bad Request
        │  └─ Valid ✓ → Continue
        │
        ├─ Query database
        │  ├─ Connection error? → Return cached or [] with error
        │  └─ Success ✓ → Continue
        │
        └─ Return 200 OK with activities
```

---

## Security Checkpoints

```
┌─────────────────────────────────────────────────────┐
│        GET /api/activity/hr-timeline                │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────▼───────┐
         │ Checkpoint 1  │  requireAuth middleware
         │ TOKEN VALID?  │  
         └───────┬───────┘  Verifies JWT signature
                 │
        ┌────────▼────────────┐
        │  Checkpoint 2       │  Custom role check
        │  USER ROLE HR/ADMIN?│  
        └────────┬────────────┘
                 │
        ┌────────▼────────────┐
        │  Checkpoint 3       │  Service layer filter
        │  SHOW CORRECT DATA? │  Only staff activities
        └────────┬────────────┘
                 │
        ┌────────▼────────────┐
        │  Checkpoint 4       │  Response serialization
        │  NO SENSITIVE DATA? │  No passwords/tokens
        └────────┬────────────┘
                 │
            ✓ 200 OK
            with activities
```

---

## Scaling Considerations

The system is designed to scale:

```
OPERATIONS PER DAY:
├─ 1,000 daily activities
│  └─ ~100MB/year storage
│
├─ 10,000 daily activities
│  └─ ~1GB/year storage
│
└─ 100,000 daily activities
   └─ ~10GB/year storage
   
   SOLUTION: Archive activities older than 2 years
            to separate collection

QUERY PERFORMANCE:
├─ With indexes:  <100ms for 50 records
├─ First 1M recs: <500ms for paginated query
└─ Archival:      Move old records → separate collection
   
SOLUTIONS IF SLOWER:
├─ Add Redis caching for recent activities
├─ Add read replicas for heavy read load
├─ Use MongoDB aggregation pipeline
└─ Implement full-text search with Elasticsearch
```

---

## State Flow Diagram (Frontend)

```
Component Mounted
        │
        ├─ useActivityTimeline("hr-timeline")
        │  │
        │  └─ State initialized:
        │     activities: []
        │     loading: true
        │     error: null
        │     page: 0
        │
        └─ useEffect triggered
           │
           ├─ fetchActivities(0, 50, {})
           │  │
           │  └─ fetch("/api/activity/hr-timeline")
           │     │
           │     ├─ Response received
           │     │  │
           │     │  └─ State updated:
           │     │     loading: false
           │     │     activities: [...data]
           │     │     total: 145
           │     │     hasMore: true
           │     │
           │     └─ Component re-renders ✓
           │
           └─ Loading skeleton shown
              │
              └─ Replaced with actual activities
                 │
                 ├─ User scrolls down
                 │  │
                 │  └─ Clicks "Load More"
                 │     │
                 │     └─ loadMore() called
                 │        │
                 │        ├─ Fetches page 2
                 │        └─ Appends to activities
                 │
                 └─ User sees more activities

User Interaction Complete
```

---

## Testing Flows

### Scenario 1: Basic Login Activity

```
ARRANGE:
├─ Start server
├─ Clear ActivityLog collection (optional)
└─ Browser open to login page

ACT:
├─ Fill email: staff@company.com
├─ Fill password: correct_password
└─ Click Login

ASSERT:
├─ Redirected to dashboard ✓
├─ ActivityLog has 1 new entry
│  ├─ actionType: "LOGIN"
│  ├─ actorName: "Staff Name"
│  ├─ description: "User Staff Name logged in"
│  └─ visibility: "PUBLIC"
└─ Can fetch via GET /api/activity/my-activities
```

### Scenario 2: Profile Update Activity

```
ARRANGE:
├─ Logged in as staff user
└─ Navigate to profile page

ACT:
├─ Update phone field
├─ Update email field
└─ Click Save

ASSERT:
├─ Profile saved ✓
├─ ActivityLog has new entry
│  ├─ actionType: "PROFILE_UPDATE"
│  ├─ module: "PROFILE"
│  ├─ metadata.updatedFields: ["phone", "email"]
│  └─ metadata.changes: { phone: "...", email: "..." }
└─ Shows in HR timeline (for HR users)
```

### Scenario 3: HR Timeline Access

```
ARRANGE:
├─ Multiple activities in database
├─ Logged in as HR user
└─ Navigate to /hr/activity-timeline

ACT:
├─ Page loads
├─ Hook fetches /api/activity/hr-timeline
└─ Activities render

ASSERT:
├─ Only staff activities shown
├─ HR and Admin actions NOT shown
├─ Pagination works
├─ Filtering works (optional)
└─ Timestamps are correct
```

---

## Performance Monitoring

```
KEY METRICS TO MONITOR:

1. Response Time
   - Target: <500ms for HR timeline
   - If >1000ms: Check indexes, add caching

2. Database Size
   - Growth: ~300KB/day for 1000 activities
   - If >10GB: Archive old records

3. Query Count
   - Per page load: ~5 queries
   - Monitor for N+1 issues

4. Error Rate
   - Target: <1%
   - Monitor for token/role issues

5. Active Users
   - Watch: Concurrent timeline viewers
   - Cache if >100 concurrent users

QUERIES TO RUN:
├─ db.activitylogs.count() → Total documents
├─ db.activitylogs.totalSize() → Collection size
├─ db.activitylogs.getIndexes() → Verify indexes
└─ db.activitylogs.stats() → Performance metrics
```

---

**Ready to implement?** Start with the Quickstart guide and refer back to this architecture document as needed!
