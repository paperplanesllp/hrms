# Tasks Not Showing - Troubleshooting Guide

## Problem Summary
You're seeing "No tasks yet" in the **My Tasks** section even though you've been creating tasks in the **Assign Task** section.

## Root Cause Analysis

The issue is likely one of these:

### 1. **Wrong Section Confusion** (Most Common)
- **Assign Task** section = Create tasks and assign them TO OTHER PEOPLE
- **My Tasks** section = View tasks assigned TO YOU by others

**If you've been using Assign Task to create tasks:**
- Those tickets are for other people, not for you
- You won't see them in "My Tasks" unless you assigned them to yourself
- Check the employee/team member drop-down - is it set to the other person?

**To fix:** 
- In "Assign Task" section, select YOUR name in the "Assign To" drop-down
- Then create the task
- The task should appear in "My Tasks"

### 2. **Data Mismatch** (Likely if you assigned to yourself)
- Task was created but assigned to the wrong user ID
- Backend isn't finding tasks due to ID type mismatch
- Tasks marked as deleted

## How to Diagnose

### Step 1: Check the Diagnostic Endpoint
The backend now has a debug endpoint that shows what's happening:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:
   ```javascript
   fetch('/api/tasks/debug/diagnostics', {
     headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('erp_auth')).accessToken}` }
   }).then(r => r.json()).then(d => console.log(d))
   ```
4. Check the output - it will show:
   - Your user ID
   - Total tasks in database
   - How many tasks are assigned to YOU
   - Which users have tasks assigned
   - Sample of your tasks

### Step 2: Check Server Logs
When you fetch tasks, the backend now logs diagnostic info:

1. Look at your server console (where you ran `npm start`)
2. Search for lines starting with `🔍 [getMyTasks]` or `📋 [getMyTasks]`
3. This shows the query being executed and results found

### Step 3: Verify Task Creation
1. Go to "Assign Task" section
2. Fill in the form:
   - **Task Title**: "Test Task"
   - **Description**: "This is a test"
   - **Assign To**: SELECT YOURSELF (your name)
   - **Department**: Select a department
   - **Due Date**: Tomorrow (future date)
   - **Priority**: Medium
3. Click "Create Task"
4. See success message
5. Go to "My Tasks" tab
6. Refresh the page (F5)
7. Task should appear

## Common Issues & Fixes

### Issue: Task created but doesn't appear in "My Tasks"

**Check 1: Did you assign to yourself?**
```
In Assign Task form:
- Assign To dropdown: Does it show YOUR name selected?
- If not, that's the problem!
```

**Check 2: Run the diagnostic**
```
See "How to Diagnose" → Step 1 above
Check if myTasksCount > 0
If it's 0, tasks aren't being saved with your ID
```

**Check 3: Look at browser console**
```
F12 → Console → When fetching My Tasks, type:
console.log(JSON.parse(localStorage.getItem('erp_auth')).user)
This shows your user ID
```

**Check 4: API response size**
```
F12 → Network tab
Filter: /api/tasks/my
Click on the request
Check response:
- < 100 bytes = Empty or error
- > 1000 bytes = Has data
```

### Issue: "I AM assigned tasks but they don't show"

This means:
1. Other users created tasks and assigned to you
2. But you're not seeing them in "My Tasks"

**Solution:**
1. Ask the person who assigned to verify they selected YOUR name
2. Ask them to re-create the task and double-check the assignment
3. Refresh your browser (F5 or Ctrl+Shift+R for hard refresh)
4. Clear browser cache and try again
5. Log out and log back in

### Issue: I see "Assigned" tasks but need to VIEW as assignee

**You might be looking at "All Tasks" or admin view**
1. Click "My Tasks" tab (not "All Tasks")
2. Verify the tab highlight shows "My Tasks" is active
3. It should show only tasks where YOU are the assignee

## Step-by-Step Test

Follow this test exactly the first time:

### Test 1: Self-Assignment 
1. Login as yourself
2. Go to **Task Management** → **Assign Task**
3. Fill form:
   - Title: `TEST-001`
   - Description: `Testing self-assignment`
   - **Assign To: Your Own Name** ← IMPORTANT
   - Department: Any department
   - Priority: High  
   - Due Date: Tomorrow
4. Click "Create Task"
5. Wait for success toast
6. Click "My Tasks" tab
7. Refresh browser (F5)
8. Expected: See TEST-001 in the list

### Test 2: Assigned BY Others
1. Ask a colleague to:
   - Go to Assign Task
   - Select YOUR name as "Assign To"
   - Create a task
   - Show you the success message
2. You go to MY Tasks
3. Refresh browser
4. Expected: New task appears

### Test 3: Check the Diagnostics
1. After creating tasks, open browser Console
2. Run the diagnostic fetch (see Step 1 above)
3. Look for:
   - `"myTasksCount": 1` or higher
   - Your tasks listed under `"myTasks"`
4. If count is 0, escalate to development team

## Backend Logs You'll See

When everything works:
```
🔍 [getMyTasks] Fetching tasks for userId: 65f...
📋 [getMyTasks] Query: { assignedTo: ObjectId(...), isDeleted: false }
✅ [getMyTasks] Found 2 tasks
```

When no tasks:
```
🔍 [getMyTasks] Fetching tasks for userId: 65f...
📋 [getMyTasks] Query: { assignedTo: ObjectId(...), isDeleted: false }
⚠️ [getMyTasks] No tasks found. Total tasks in DB: 5
📊 [getMyTasks] Sample assignedTo values: [{assignedTo: ObjectId(66a...), ...}]
```

## Quick Checklist

- [ ] You understand "Assign Task" creates tasks FOR others
- [ ] You understand "My Tasks" shows tasks FOR you
- [ ] You've tried assigning a task to yourself
- [ ] You've refreshed the page after creating a task
- [ ] You ran the diagnostic endpoint (checked console logs)
- [ ] You've logged out and back in
- [ ] You've checked the Network tab - response size reasonable
- [ ] You've asked a colleague to test assigning to you

## Still Not Working?

If you've done all checks:
1. Check browser console for error messages (F12 → Console)
2. Check server logs for errors
3. Take a screenshot of:
   - Browser Network tab showing `/api/tasks/my` request/response
   - Server console showing diagnostics logs
   - What appears in "My Tasks" section
4. Contact development team with this info

## Technical Details (For Developers)

### Database Query
```javascript
// Backend queries tasks like this:
{ 
  assignedTo: ObjectId(userId),    // Current user's ID from JWT
  isDeleted: false
}
```

### Common Bugs to Check
1. **Type Mismatch**: userId is string but stored as ObjectId
2. **Wrong ID Field**: Using user.email instead of user.id
3. **Deleted Flag**: Task has `isDeleted: true` from soft-delete
4. **Case Sensitivity**: Status values are lowercase ('pending', not 'Pending')
5. **Two Different Users**: Frontend user ID ≠ Backend JWT user ID

### Debug Endpoint
```
GET /api/tasks/debug/diagnostics
Authorization: Bearer {token}

Returns:
{
  diagnostics: {
    userExists: boolean,
    userId: string,
    totalTasksInDB: number,
    myTasksCount: number,
    myTasks: array,
    assignmentDistribution: array
  },
  recommendation: string
}
```

---

**Last Updated**: March 2026
**Status**: Active Troubleshooting Guide
