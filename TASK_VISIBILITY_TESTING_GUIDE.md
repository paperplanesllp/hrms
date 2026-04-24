# Task Visibility & Real-Time Updates - Testing Guide

## Overview
All 4 improvements have been successfully implemented:
1. ✅ UI improvements showing assigned users in toast
2. ✅ Socket listener hook for real-time updates
3. ✅ Real-time refresh integrated across all task pages
4. ✅ No compilation errors detected

---

## Pre-Testing Checklist

### Prerequisites
- [ ] Backend server is running (Socket.io enabled)
- [ ] Frontend dev server is running
- [ ] You are logged in with an HR/Admin account (can create tasks)
- [ ] Have another user account ready (e.g., "Hari", "Priya") to test assignment
- [ ] Open browser DevTools Console (F12) to see logging

---

## Test Suite

### Test 1: Basic Task Assignment with User Display
**Goal:** Verify assigned users are shown in success toast

**Steps:**
1. Navigate to **Tasks → Assign Task** (or Dashboard → Assign New Task)
2. Fill in form:
   - Task Title: `"Quarterly Report Review"`
   - Description: `"Please review Q1 results"`
   - Assign To: Select **Hari** (single assignee)
   - Department: Select appropriate department
   - Due Date: Tomorrow's date
   - Priority: **High**
3. Click **Submit**

**Expected Results:**
- [ ] Success toast appears
- [ ] Toast shows: `"Quarterly Report Review has been assigned. Task visible to: Hari"`
- [ ] Toast appears for 2-3 seconds
- [ ] Form resets automatically

**Console Logs:**
```
✅ Tasks loaded: X tasks
📥 Loading tasks with params: {...}
🔗 Setting up task socket listeners
✅ Task socket listeners registered
```

---

### Test 2: Multiple Assignees
**Goal:** Verify multiple assigned users are all listed in the toast

**Steps:**
1. Navigate to **Assign Task**
2. Fill in form:
   - Task Title: `"Website Redesign Phase 2"`
   - Assign To: **Select multiple users** (yourself + Hari + Priya)
   - Other fields: Fill as desired
3. Click **Submit**

**Expected Results:**
- [ ] Success toast shows: `"Task visible to: [Your Name], Hari, Priya"`
- [ ] All 3 users are listed in the toast
- [ ] No typos or missing names

**Console Logs Should Show:**
```
📨 Socket: task:created received
   taskId: "60a7b8c9d1e2f3g4h5i6j7k8"
   taskTitle: "Website Redesign Phase 2"
   message: "New task assigned: Website Redesign Phase 2"
```

---

### Test 3: Real-Time Task List Refresh (Self-Assignment)
**Goal:** Verify that when you assign a task to yourself, it appears in your "My Tasks"

**Steps:**
1. Open **My Tasks** page in current browser tab
2. Count current tasks (e.g., 5 tasks)
3. **Open another browser tab** → Navigate to **Assign Task**
4. Assign new task **to yourself**:
   - Title: `"Test Task - Real Time Refresh"`
   - Assign To: **[Your account]**
   - Due Date: Today
5. Click **Submit** and check success toast
6. **Switch back to first tab** with My Tasks page

**Expected Results:**
- [ ] Task list in first tab **automatically updated** without refresh
- [ ] New task `"Test Task - Real Time Refresh"` appears at top
- [ ] Task count increased by 1
- [ ] No page reload was needed

**Console Logs (First Tab):**
```
📨 Socket: task:created received
   taskId: "..."
   taskTitle: "Test Task - Real Time Refresh"
   message: "New task assigned: Test Task - Real Time Refresh"
🔄 TaskRefresh: Immediate refresh triggered
✅ Tasks loaded: 6 tasks
```

---

### Test 4: Real-Time Update for Other User
**Goal:** Verify that when you assign a task to Hari, he sees it automatically in his "My Tasks"

**Prerequisites:** You need 2 browser windows/tabs with different user logins

**Setup:**
- Tab 1: Logged in as **You** (Admin/HR)
- Tab 2: Logged in as **Hari** (Employee)

**Steps:**
1. **In Tab 2 (Hari):** Navigate to **My Tasks** page
2. **In Tab 1 (You):** Navigate to **Assign Task**
3. Create task assigned **to Hari**:
   - Title: `"Marketing Campaign - Q2 Planning"`
   - Assign To: **Hari**
   - Description: `"Please prepare Q2 marketing strategy"`
   - Due Date: 2 weeks from today
4. Click **Submit**
5. **Check Tab 2 (Hari)** immediately

**Expected Results:**
- [ ] Success toast in Tab 1 shows: `"Task visible to: Hari"`
- [ ] **Hari's My Tasks in Tab 2 updates automatically**
- [ ] New task `"Marketing Campaign - Q2 Planning"` appears
- [ ] **Zero page refresh was performed** in Tab 2
- [ ] Hari can immediately start working on the task

**Console Logs (Tab 2):**
```
📨 Socket: task:created received
   taskId: "..."
   taskTitle: "Marketing Campaign - Q2 Planning"
🔄 TaskRefresh: Immediate refresh triggered
✅ Tasks loaded: [updated count] tasks
```

---

### Test 5: Task Update Notification
**Goal:** Verify real-time refresh when task is updated

**Steps:**
1. **In Tab 1:** Go to **My Tasks** → Open a task details
2. Click **Edit** or **Update Status** 
3. Make a change (e.g., change status to "in-progress")
4. Save changes
5. **In Tab 2 (Assigned User):** Watch their My Tasks page

**Expected Results:**
- [ ] **Tab 2 automatically refreshes** with updated task status
- [ ] Change reflects immediately without manual refresh
- [ ] Socket event logged: `task:status-changed`

---

### Test 6: Attachments with Assignment
**Goal:** Verify file attachments are mentioned in the toast

**Steps:**
1. Navigate to **Assign Task**
2. Fill form normally
3. **Upload 2 files** (e.g., PDF, image)
4. Assign to user
5. Click **Submit**

**Expected Results:**
- [ ] Toast shows: `"... Task visible to: Hari + 2 attachment(s)"`
- [ ] Attachment count is correct in toast
- [ ] Task is created with attachments

---

## Debugging & Verification

### Check Socket Connection
```javascript
// In browser console, run:
console.log(socketDebugInfo);
```

Expected output:
```
{
  connected: true,
  status: "connected",
  socketBaseUrl: "http://localhost:5000"
}
```

### Monitor Socket Events in Real-Time
```javascript
// In browser console, run:
const socket = getSocket();
socket.on('task:created', (payload) => {
  console.log('🎯 TASK CREATED:', payload.task.title);
});
socket.on('task:updated', (payload) => {
  console.log('🔄 TASK UPDATED:', payload.task.title);
});
socket.on('task:status-changed', (payload) => {
  console.log('🔁 STATUS CHANGED:', payload.task.status);
});
```

### Verify TaskRefresh Context
```javascript
// Open browser console and watch for:
console.log('📋 TaskRefresh - refreshKey changed');
// This should log whenever a refresh is triggered
```

---

## Troubleshooting

### Issue: Task doesn't appear in My Tasks after assignment
**Solution:**
1. Check browser console for socket errors
2. Verify server is emitting `task:created` events
3. Check network tab for API call responses
4. Manually refresh page to verify task was created on backend

### Issue: Toast doesn't show assigned users
**Solution:**
1. Check browser console for errors in AssignTaskSection
2. Verify users array is populated (should see users list)
3. Ensure assigned users IDs match user objects in array

### Issue: Real-time refresh not working
**Solution:**
1. Check Socket.io connection status
2. Verify `useTaskSocketListener` hook is mounted
3. Check browser console for "Task socket listeners registered" log
4. Verify firewall isn't blocking WebSocket

### Issue: Assigned user doesn't see the task
**Solution:**
1. Verify task was assigned to correct user ID
2. Check user is viewing the correct page (My Tasks)
3. Try manual page refresh to verify backend stored it correctly
4. Check API endpoint `/tasks/my` returns the task

---

## Performance Verification

### Expected Behavior
- **Task appearance:** < 1 second after assignment
- **Toast display:** 2-3 seconds
- **Form reset:** Immediate after toast
- **Real-time update:** < 500ms after socket event

### Monitor Performance
```javascript
// In console, add timing:
console.time('task-creation');
// ... perform task creation ...
console.timeEnd('task-creation');
```

---

## Success Criteria ✅

All tests should show:
- [ ] Assigned users visible in success toast
- [ ] Real-time refresh working for multiple users
- [ ] No compilation errors
- [ ] Socket events logging properly
- [ ] Zero manual page refreshes needed
- [ ] Proper fallback if socket disconnects

---

## Sign-Off

When all tests pass, the implementation is complete and production-ready.

**Tests Passed:** ☐ Yes  ☐ No
**Date Tested:** _______________
**Tested By:** _______________
**Notes:** _______________________________________________________________
