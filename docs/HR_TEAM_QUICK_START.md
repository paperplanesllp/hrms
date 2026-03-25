# 🎯 HR Team Feature - Quick Start & Testing Guide

## ✅ Setup Verification Checklist

Before testing, verify these files were created/updated:

### Frontend Files ✓
- [x] `erp-dashboard/src/features/admin/HRTeamPage.jsx` - Main component  
- [x] `erp-dashboard/src/features/admin/HRDiscussionPanel.jsx` - Discussions
- [x] `erp-dashboard/src/features/admin/HRMeetingPanel.jsx` - Meetings
- [x] `erp-dashboard/src/features/admin/HRActivityFeed.jsx` - Activity feed
- [x] `erp-dashboard/src/app/routes.jsx` - Route updated

### Backend Files ✓
- [x] `server/src/modules/admin/admin.routes.js` - Routes added
- [x] `server/src/modules/admin/admin.controller.js` - Controllers added
- [x] `server/src/modules/admin/admin.service.js` - Services added
- [x] `server/src/utils/socket.js` - Socket events added

---

## 🚀 Running the Application

### Step 1: Start Backend Server
```bash
# Terminal 1 - Backend
cd server
npm install          # If needed
npm run dev          # Should show: Server running on port 5000
```

Expected output:
```
✅ Server running on port 5000
✅ MongoDB connected
Socket.io initialized
```

### Step 2: Start Frontend Server
```bash
# Terminal 2 - Frontend
cd erp-dashboard
npm install          # If needed
npm run dev          # Should show: VITE v... ready in ... ms
```

Expected output:
```
  VITE v... ready in ... ms

  ➜  Local:   http://localhost:5174/
  ➜  Press h to show help
```

---

## 🧪 Testing the Feature

### Step 1: Login as Admin
1. Open browser to `http://localhost:5174`
2. Click **Login**
3. Enter credentials:
   - **Email**: `admin@gmail.com`
   - **Password**: `admin123`
4. Click **Login**
5. Should redirect to Dashboard

### Step 2: Access HR Team
1. Look at left sidebar
2. Find **"HR Team"** link (under admin-exclusive section)
   - Should have a **Users icon** 👥
3. Click it
4. Should load **"HR Team Hub"** page

### Step 3: Verify Overview Tab
✅ Should show:
- **4 stat cards** at top:
  - Blue card: "Team Members" (shows count)
  - Purple card: "Discussions" (shows 0 initially)
  - Pink card: "Meetings" (shows 0 initially)  
  - Green card: "Online Now" (shows count)
- **Tab navigation** with tabs: Overview, Discussions, Meetings, Activity
- **Team Members section** showing all HR staff with:
  - Avatar (colored circle)
  - Name
  - Email
  - Online status (green/gray dot)
  - Message & Video call buttons
- **Activity Feed** showing recent activity

### Step 4: Test Schedule Meeting
1. Click **"Schedule Meeting"** button (on right panel)
2. Fill in modal:
   - Title: "Q1 HR Planning"
   - Description: "Review quarterly objectives"
   - Type: "Video Call" (dropdown)
   - Date: Tomorrow's date
   - Time: "14:00"
   - Attendees: Check 2-3 HR team members
3. Click **"Schedule Meeting"**
4. Should see:
   - ✅ Success toast notification
   - Meeting card appears in Meetings tab
   - Stats updated

### Step 5: Test Discussions Tab
1. Click **"Discussions"** tab
2. Initially empty (0 discussions)
3. In a real scenario, would show discussion threads with:
   - Discussion title
   - Creator name
   - Reply count
   - Attendees count

### Step 6: Test Meetings Tab
1. Click **"Meetings"** tab
2. Should see your scheduled meeting:
   - Meeting card with gradient background
   - Title, description
   - Date & time
   - Meeting type (video call icon)
   - Attendees list
   - "TODAY" or "SOON" badge (if applicable)
   - Action buttons: Complete, Join (for video)

### Step 7: Test Activity Tab
1. Click **"Activity"** tab
2. Should see activity entry for the meeting you just created:
   - Activity message
   - Timestamp
   - Your name
   - Activity type badge

### Step 8: Test Real-Time Updates
1. Open HR Team in **two browsers** (same admin account)
2. In Browser 1: Schedule a new meeting
3. In Browser 2: Watch in real-time:
   - Meeting stat count increases
   - New meeting appears in meetings list
   - Activity feed updates automatically
   - **No page refresh needed!**

---

## 🔍 Console Testing

### Check Socket Connection
Open browser DevTools (F12) → Console:

```javascript
// Should see logs like:
📱 SocketProvider: Initializing socket for admin@gmail.com
🔌 Initializing socket connection...
✅ SocketProvider: Socket initialized successfully
✅ Socket connected to hr_management room
```

### Test Socket Event
```javascript
// In console, when you create a meeting:
// You should see event logs like:
socket.on("new_hr_meeting"):
  Received meeting: {
    _id: "...",
    title: "Q1 HR Planning",
    type: "video-call",
    ...
  }
```

### Check API Calls
DevTools → Network tab:

**After scheduling meeting, should see:**
```
POST /admin/hr-team/meetings    201 Created
GET  /admin/hr-team/meetings    200 OK
GET  /admin/hr-team/discussions 200 OK
```

---

## 🎨 Visual Verification

### Check Design Elements
- [ ] Dark background (#0A1931 navy base)
- [ ] Blue accent colors for buttons
- [ ] Purple gradient for discussions
- [ ] Pink gradient for meetings
- [ ] Green for online/active status
- [ ] Smooth animations on hover
- [ ] Responsive on mobile (zoom to 50%)
- [ ] Loading states work (show skeleton)

### Check Responsive Design
**Mobile** (< 768px):
```
- Single column layout
- Stats cards stacked
- Team members full width
- Meeting cards 100% width
```

**Tablet** (768px):
```
- 2 columns for stats
- Main content + quick actions side by side
- Team members cards in grid
```

**Desktop** (1024px+):
```
- 4 columns for stats  
- 2/3 width main + 1/3 width actions
- Optimal reading width
```

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to load HR team data"
```
✅ Fix:
1. Check backend running on port 5000
2. Check auth token in localStorage
   - F12 → Application → Local Storage → erp_auth
   - Should have: { accessToken, user, refreshToken }
3. Check CORS allows frontend port
```

### Issue: Real-time updates not working
```
✅ Fix:
1. Verify socket is connected (check console logs)
2. Check WebSocket connection:
   - DevTools → Network → filter by WS
   - Should see ws://localhost:5000/socket.io/...
3. Verify JWT token in socket auth
4. Refresh page and try again
```

### Issue: Meeting form won't submit
```
✅ Fix:
1. Ensure all required fields filled:
   - Title (text)
   - Date (future date)
   - Time (HH:MM format)
2. Check console for validation errors
3. Try scheduling for tomorrow at 14:00
4. Check if server is responding
```

### Issue: Page shows "No HR users loaded"
```
✅ Fix:
1. Verify logged in as Admin:
   - Should see "admin@gmail.com" in profile
2. Check database has HR users
3. Check backend /admin/hr-team endpoint:
   - curl http://localhost:5000/admin/hr-team (with auth header)
```

---

## 📝 Example Test Scenarios

### Scenario 1: Schedule a Weekly Meeting
```
1. Go to HR Team → Schedule Meeting
2. Title: "Weekly HR Sync"
3. Type: Video Call
4. Date: Next Monday
5. Time: 10:00 AM
6. Attendees: All HR staff
7. Submit → Verify appears in Meetings tab
8. Open in another browser → Verify real-time update
```

### Scenario 2: Track Meeting Progress
```
1. Schedule a meeting
2. See it in "Upcoming" section
3. Wait for the date/time to pass
4. See it move to "Past" section
5. Click "Complete" button
6. Verify status change
```

### Scenario 3: Activity Monitoring
```
1. Schedule 2-3 meetings
2. Add 2-3 discussion replies (if any exist)
3. Go to Activity tab
4. Should see recent 50 activities listed
5. Check timestamps and user names
6. 50+ items should be correct limit
```

---

## 🎯 Feature Checklist

- [ ] Dashboard stats cards display correctly
- [ ] Team members list shows all HR users
- [ ] Online status indicators work (green/gray dots)
- [ ] Can schedule meetings
- [ ] Real-time meeting notifications (if dual browser test)
- [ ] Meetings appear in correct tab (upcoming/past)
- [ ] Can mark meetings complete
- [ ] Can delete meetings
- [ ] Activity feed shows recent activity
- [ ] All buttons are clickable
- [ ] Gradients render correctly
- [ ] Dark theme looks premium
- [ ] No console errors
- [ ] No network 404 errors
- [ ] Socket events logged in console
- [ ] Responsive on mobile

---

## 📊 Expected Behavior Summary

### Overview Tab
```
┌─ Stat Cards ─────────────────────────────────────┐
│ Team Members: N  Discussions: 0  Meetings: M  ... │
└──────────────────────────────────────────────────┘
        ↓ Tabs ↓
    [Overview] [Discussions] [Meetings] [Activity]
        ↓ Content ↓
┌─ Team Members (Left) ─────┬─ Quick Actions (Right) ─┐
│ • Member 1 (online) ......│ [Start Discussion]     │
│ • Member 2 (offline) .....│ [Schedule Meeting]     │
│ • Member 3 (online) ......│ [Start Video Call]     │
│                           │ ┌─ Activity ─────────┐ │
│                           │ • Recent activity... │ │
│                           │ • Timestamps...      │ │
└───────────────────────────┴────────────────────────┘
```

### Meetings Tab
```
┌─ Upcoming Meetings ──────────────────────────────┐
│ ┌─ Meeting Card ───────────────────────────────┐ │
│ │ 📅 Q1 HR Planning                      [×]   │ │
│ │ Review quarterly objectives                  │ │
│ │ 2026-03-15 at 14:00 | Video Call            │ │
│ │ 👥 5 attending                               │ │
│ │ [✓ Complete] [🎥 Join]                       │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Activity Tab
```
┌─ Recent Activity ────────────────────────────────┐
│ 🎯 Admin User scheduled meeting: "Q1 Planning"   │
│    14:32:15 Mar 6                                │
│ 📝 Team Member added reply to discussion         │
│    14:25:08 Mar 6                                │
│ 👥 HR Member came online                        │
│    14:15:42 Mar 6                                │
└──────────────────────────────────────────────────┘
```

---

## 🎓 Learning Resources

- **Socket.io**: Real-time events → See `socket.js` for event names
- **React Hooks**: useEffect, useState used throughout
- **Tailwind CSS**: Gradient utilities, responsive design
- **API Integration**: RESTful endpoints via axios
- **Component Architecture**: Feature-based folder structure

---

## 📞 Quick Reference

| Action | Location | Button | Result |
|--------|----------|--------|--------|
| View HR Team | Sidebar | "HR Team" link | Load HR Team Hub |
| Schedule Meeting | Right Panel | "Schedule Meeting" | Open meeting modal |
| View Meetings | Tabs | "Meetings" tab | Show meetings list |
| View Activity | Tabs | "Activity" tab | Show activity feed |
| Mark Complete | Meeting Card | "✓ Complete" | Update meeting status |
| Join Video Call | Meeting Card | "🎥 Join" | Launch video interface |
| Delete Meeting | Meeting Card | "Delete" icon | Remove meeting |

---

## ✨ Next Steps After Testing

1. ✅ Verify all features work
2. 👥 Add more HR team discussions
3. 📅 Schedule more meetings
4. 🎥 Test video call integration
5. 🔔 Test notifications in real-time
6. 📱 Test on mobile device
7. 💾 Consider database persistence for meetings/discussions
8. 📧 Add email notifications for meetings

---

**Last Updated**: March 6, 2026  
**Status**: ✅ Ready for Testing  
**Feature Version**: 1.0.0 Premium HR Team
