# Multiple Assignees Implementation Guide

## Overview
Your task management system is fully configured to support **assigning tasks to multiple persons**. This feature allows you to distribute a single task among multiple employees or team members.

---

## Current Implementation Status ✅

### 1. **Database Model** (Backend Ready)
**File:** `server/src/modules/tasks/Task.model.js`

```javascript
assignedTo: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  index: true
}]
```

✅ **Status:** The `assignedTo` field is already an array that supports multiple user IDs.

---

### 2. **API Service** (Backend Ready)
**File:** `server/src/modules/tasks/tasks.service.js`

**Key Features:**
- ✅ `createTask()` - Normalizes assignedTo to array and validates each assignee
- ✅ `getMyTasks()` - Uses MongoDB `$in` operator to find tasks where user is in assignedTo array
- ✅ Automatic conversion of single/multiple values to ObjectId arrays
- ✅ Validation of each assigned user exists in system

**Code Snippet:**
```javascript
// Normalize assignedTo to array
const assignedToRaw = Array.isArray(data.assignedTo)
  ? data.assignedTo
  : data.assignedTo
    ? [data.assignedTo]
    : [];

// Convert to ObjectIds
const assignedToObjectIds = assignedToRaw.map(id => 
  new mongoose.Types.ObjectId(id)
);
```

---

### 3. **Frontend Component** (UI Ready)
**File:** `erp-dashboard/src/components/ui/MultiUserSelect.jsx`

**Features:**
- ✅ Multi-select dropdown with search functionality
- ✅ Visual tags for selected users
- ✅ Max selections limit support (if needed)
- ✅ Real-time filtering by name or email
- ✅ Click-to-remove individual selections
- ✅ Keyboard accessible

**Component Usage in TaskForm:**
```jsx
<MultiUserSelect
  users={users}
  selectedUsers={form.assignedTo}
  onSelectedUsersChange={(selected) => 
    setForm({ ...form, assignedTo: selected })
  }
  required={!isPersonalTask}
  error={errors.assignedTo}
  label="Assign To"
  placeholder="Search and select users..."
/>
```

---

## How to Use Multiple Assignees

### Step 1: Create a New Task
Navigate to the task creation form in your dashboard.

### Step 2: Use "Assign To" Field
1. Click on the **"Assign To"** dropdown field
2. Search for users by name or email
3. Select multiple users by clicking on them
4. Each selected user appears as a tag with an **X** to remove

**Visual Example:**
```
┌─────────────────────────────────────────┐
│ Assign To *                             │
├─────────────────────────────────────────┤
│ [John Doe] [Jane Smith] [Bob Johnson]  │
│ [Search users...]                      │
│                                         │
│ ▼ Search Results:                      │
│  □ Alice Cooper (alice@company.com)   │
│  ☑ Bob Johnson (bob@company.com)      │
│  □ Carol White (carol@company.com)    │
└─────────────────────────────────────────┘
```

### Step 3: Submit Task
- Fill out other required fields (title, description, due date)
- Click **Submit**
- Task is created and **assigned to all selected users**

---

## How Multiple Assignees Work

### Task Creation
```
CREATE TASK
├─ Title: "Website Redesign"
├─ Description: "Update company website design"
├─ Assigned To: [
│    "6507d2f8e4b1a2c9d3e4f5a6",  // John Doe
│    "6507d2f8e4b1a2c9d3e4f5a7",  // Jane Smith
│    "6507d2f8e4b1a2c9d3e4f5a8"   // Bob Johnson
│  ]
└─ Due Date: 2026-05-15
```

### User Perspective
Each assigned user sees the task in their **"My Tasks"** section:
- **John Doe** → Sees "Website Redesign" in My Tasks
- **Jane Smith** → Sees "Website Redesign" in My Tasks  
- **Bob Johnson** → Sees "Website Redesign" in My Tasks

### Task Query (Backend)
```javascript
// When user opens "My Tasks", system queries:
db.tasks.find({ 
  assignedTo: { $in: [userId] },
  isDeleted: false
})
```

---

## Key Features

### 1. Individual Task Management
Each assigned user can:
- ✅ Update their own progress on the task
- ✅ Add comments or attachments
- ✅ Mark task as complete/incomplete
- ✅ Request extensions

### 2. Notifications
When task is created/updated with multiple assignees:
- ✅ Each assigned user receives notification
- ✅ Real-time updates via WebSocket
- ✅ Task appears in their dashboard immediately

### 3. Task Visibility
- ✅ Only assigned users can see the task (unless admin)
- ✅ Task appears in each user's task list separately
- ✅ Task history shows all assignee activities

---

## API Endpoints

### Create Task (Multiple Assignees)
```
POST /api/tasks/create
Content-Type: application/json

{
  "title": "Website Redesign",
  "description": "Update company website",
  "assignedTo": [
    "userId1",
    "userId2",
    "userId3"
  ],
  "dueDate": "2026-05-15",
  "priority": "HIGH"
}
```

### Get My Tasks (Auto-includes all tasks assigned to me)
```
GET /api/tasks/my-tasks

Response includes all tasks where:
- Current user is in assignedTo array
- Task is not deleted
```

### Update Task (Assign More Users)
```
PATCH /api/tasks/{taskId}
Content-Type: application/json

{
  "assignedTo": [
    "userId1",
    "userId2",
    "userId3",
    "userId4"  // Add new user
  ]
}
```

---

## Task Display Components

### TaskCard Component
**File:** `erp-dashboard/src/features/tasks/TaskCard.jsx`

Shows all assigned users with avatars

### TaskTable Component
**File:** `erp-dashboard/src/features/tasks/TaskTable.jsx`

Displays list of assignees in table format

### TaskDetailsModal Component
**File:** `erp-dashboard/src/features/tasks/TaskDetailsModal.jsx`

Full assignee information in detail view

---

## Example Scenarios

### Scenario 1: Collaborative Project
```
Task: "Mobile App Development"
Assigned To: 
  - Frontend Developer (React)
  - Backend Developer (Node.js)
  - QA Tester
```

Each team member sees the task and contributes their part.

### Scenario 2: Approval Chain
```
Task: "Budget Review"
Assigned To:
  - Department Head (Submit)
  - Finance Manager (Review)
  - CFO (Approve)
```

### Scenario 3: Parallel Execution
```
Task: "Client Outreach"
Assigned To:
  - Sales Rep 1 (Region A)
  - Sales Rep 2 (Region B)
  - Sales Rep 3 (Region C)
```

---

## Current Form Validation

The TaskForm validates:
- ✅ **At least one assignee** for non-personal tasks
- ✅ **Valid user IDs** (each user exists in system)
- ✅ **Task title** (required, min 3 characters)
- ✅ **Description** (required)
- ✅ **Due date** (required, cannot be in past)
- ✅ **Estimated time** (required)

---

## Troubleshooting

### Issue: Users not appearing in dropdown
**Solution:**
1. Ensure users are in same company
2. Check user is not deactivated
3. Refresh page and try again

### Issue: Task not visible to assigned user
**Solution:**
1. Verify assignedTo array contains user ID
2. Check task isDeleted flag is false
3. User may need to refresh "My Tasks"

### Issue: Cannot assign multiple users
**Solution:**
1. Check MultiUserSelect component is loaded
2. Ensure user has permission to create tasks
3. Check browser console for errors

---

## Permissions & Access Control

### Who can assign multiple users?
- ✅ HR/Admin users
- ✅ Department managers (for their team)
- ✅ Task creators (task owner)

### What can assigned users do?
- ✅ View task details
- ✅ Update progress
- ✅ Add comments
- ✅ Request extensions
- ✅ Mark as complete

### What can't assigned users do?
- ❌ Delete task (only creator)
- ❌ Remove other assignees (only admin)
- ❌ Assign new users (unless admin)

---

## Database Queries

### Find all tasks assigned to multiple users
```javascript
db.tasks.find({
  assignedTo: { $size: { $gt: 1 } }
})
```

### Find tasks assigned to specific user
```javascript
db.tasks.find({
  assignedTo: { $in: [userId] }
})
```

### Find tasks assigned to BOTH users
```javascript
db.tasks.find({
  assignedTo: { $all: [userId1, userId2] }
})
```

---

## Summary

Your ERP system is **fully configured** for multiple assignees:

| Component | Status | Notes |
|-----------|--------|-------|
| Database Model | ✅ Ready | assignedTo is array |
| API Service | ✅ Ready | Handles arrays properly |
| UI Component | ✅ Ready | MultiUserSelect working |
| Task Queries | ✅ Ready | Uses $in operator |
| Validation | ✅ Ready | Validates each user |
| Notifications | ✅ Ready | Sends to all assignees |

## Next Steps

1. **Test the feature:**
   - Create a task with 2-3 assignees
   - Verify each user sees it in their My Tasks
   - Check notifications are sent

2. **Train users:**
   - Show how to use multi-select dropdown
   - Explain what each assignee can do
   - Share approval workflow examples

3. **Monitor usage:**
   - Track collaboration patterns
   - Check if feature improves productivity
   - Gather user feedback

---

## Support

For issues or questions about multiple assignees feature:
1. Check this guide's troubleshooting section
2. Review API responses for error messages
3. Check browser console for client-side errors
4. Review server logs for backend validation errors

