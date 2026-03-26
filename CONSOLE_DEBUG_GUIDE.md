# Console Debugging Guide - Task Management

## What to Look For in Browser Console

I've added **comprehensive logging** throughout the application. Here's what you'll see:

---

## 1️⃣ When Page Loads

### Expected Logs:
```
📄 [TasksPage] Component mounted
👤 [TasksPage] User: {id: "69ba68715a629d907c1e53c8", name: "Your Name", ...}
🔐 [TasksPage] Access Token exists: true
✅ [TasksPage] User is authenticated
👤 [TasksPage] User ID: 69ba68715a629d907c1e53c8
👤 [TasksPage] User Name: Your Name
```

### If You See Auth Errors:
```
📄 [TasksPage] Component mounted
👤 [TasksPage] User: null
🔐 [TasksPage] Access Token exists: false
❌ [TasksPage] Not authenticated, redirecting to login
```
**FIX**: You need to log in. Go to `/login`

---

## 2️⃣ When You Click "My Tasks" Tab

### Expected Logs Sequence:

#### A. Component Starts Loading
```
🎯 [MyTasks] useEffect triggered
🔄 [MyTasks] Starting fetch with filter: all
```

#### B. Service Makes API Call
```
📡 [taskService] getMyTasks called with filters: {}
🚀 [taskService] Making API call to /tasks/my with params: {}
```

#### C. API Request Interceptor
```
🔐 [API Request] URL: /api/tasks/my
🔐 [API Request] Method: get
🔐 [API Request] Has token: true
🔐 [API Request] Auth header added
```

#### D. Success Response
```
✅ [API Response] URL: /api/tasks/my
✅ [API Response] Status: 200
✅ [API Response] Data: {success: true, message: "Tasks fetched...", data: [...]}
```

#### E. Service Processes Response
```
✅ [taskService] API response received
📦 [taskService] Response status: 200
📦 [taskService] Full response: {success: true, ...}
📋 [taskService] Returning tasks: [...]
📊 [taskService] Tasks count: 1
```

#### F. Component Updates
```
✅ [MyTasks] Fetch successful
📋 [MyTasks] Retrieved tasks count: 1
📊 [MyTasks] Tasks data: [...]
✔️ [MyTasks] Fetch completed (loading set to false)
```

---

## 3️⃣ When Tasks Don't Show

### If you see:
```
✅ [MyTasks] Fetch successful
📋 [MyTasks] Retrieved tasks count: 0
📊 [MyTasks] Tasks data: []
⚠️ [MyTasks] No tasks returned from API
```

**Problem**: API returned 0 tasks
**Next Step**: Check server logs (see Section 4 below)

---

## 4️⃣ Check Server Console

When you fetch My Tasks, your backend should show:

### Step A - Request Received
```
📡 [Controller] getMyTasks called
👤 [Controller] req.user: { id: '69ba68715a629d907c1e53c8', role: 'USER', name: 'Your Name' }
✅ [Controller] User ID extracted: 69ba68715a629d907c1e53c8
```

### Step B - Database Query Executed
```
🔍 [getMyTasks] Fetching tasks for userId: 69ba68715a629d907c1e53c8 Type: string
✅ [getMyTasks] Converted to ObjectId: 69ba68715a629d907c1e53c8
📋 [getMyTasks] Query object: { assignedTo: ObjectId(...), isDeleted: false }
🔎 [getMyTasks] Executing find with query...
```

### Step C - Results Found
```
✅ [getMyTasks] Found 1 tasks
📦 [Controller] Returning 1 tasks
```

### If 0 Tasks Found
```
✅ [getMyTasks] Found 0 tasks
⚠️ [getMyTasks] No tasks found for this user. Total tasks in DB: 1
📊 [getMyTasks] Sample assignedTo values: [
  { assignedTo: '69ba68715a629d907c1e53c8', title: 'Digital marketing' }
]
🔍 [getMyTasks] Comparing: Looking for: 69ba68715a629d907c1e53c8
```

---

## 5️⃣ If You See 401 Error

### Browser Console:
```
❌ [API Error] URL: /api/tasks/my
❌ [API Error] Status: 401
❌ [API Error] Data: {success: false, message: "Unauthorized"}
```

### Backend Console:
```
❌ Missing access token
// or
❌ Invalid/expired access token
```

**FIXES**:
1. Refresh page (F5)
2. Log out and log back in
3. Check localStorage: `console.log(localStorage.getItem('erp_auth'))`

---

## 6️⃣ If You See 500 Error

### Browser Console:
```
❌ [API Error] URL: /api/tasks/my
❌ [API Error] Status: 500
❌ [API Error] Data: {success: false, message: "Internal server error"}
```

### Backend Console:
```
❌ [taskService] ERROR in getMyTasks
Error: <some error message>
```

**ACTION**: Check backend error details and fix

---

## 7️⃣ How to Use This for Debugging

### Step 1: Open Console
- Press `F12` on your keyboard
- Click "Console" tab
- Clear existing logs: `clear()`

### Step 2: Perform Action
- Click "My Tasks" tab
- Watch the logs appear

### Step 3: Identify Issues
- Look for red ❌ errors
- Look for yellow ⚠️ warnings
- Compare with expected logs in this guide

### Step 4: Take Screenshot
- Right-click in console
- "Save as" → Share with developer
- Include your User ID and task database ID

---

## 8️⃣ Copy for Reporting

When reporting issues, copy this info from console:

```javascript
// GET YOUR USER ID
JSON.parse(localStorage.getItem('erp_auth')).user.id

// GET YOUR AUTH TOKEN (first 50 chars)
JSON.parse(localStorage.getItem('erp_auth')).accessToken.substring(0, 50)

// TEST API CALL MANUALLY
fetch('/api/tasks/my', {
  headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('erp_auth')).accessToken}` }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
```

---

## 🔍 Quick Checklist

- [ ] I see ✅ [TasksPage] logs when page loads
- [ ] I see ✅ [API Request] logs when clicking My Tasks
- [ ] I see ✅ [API Response] Status 200 (not 401/500)
- [ ] I see ✅ [MyTasks] Fetch successful
- [ ] I see 📊 [MyTasks] Tasks count: 1 or more (not 0)
- [ ] Task appears in the UI

If any of these fail, the corresponding error section tells you what to fix.

---

## 🛠️ Common Issues & Console Signs

| Issue | Console Sign | Fix |
|-------|------------|-----|
| Not logged in | No ✅ Auth logs | Log in again |
| Token expired | ❌ 401 error | Refresh page or log in |
| Wrong user ID | ⚠️ Tasks found: 0 | Check assignedTo in database |
| API broken | ❌ 500 error | Check backend logs |
| Frontend bug | ✅ API works but UI empty | Reload page or clear browser cache |

---

**Updated**: March 26, 2026
**Version**: 1.0
