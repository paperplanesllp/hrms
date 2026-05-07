# Quick Reference: Multiple Task Assignees

## ✅ Feature Status: **READY TO USE**

Your ERP system is fully configured to assign tasks to **multiple persons**.

---

## How to Assign Tasks to Multiple People

### 1️⃣ Create New Task
- Navigate to **Tasks** → **Create New Task**

### 2️⃣ Fill Task Details
- **Title**: "Mobile App Development"
- **Description**: "Build mobile app for iOS and Android"
- **Priority**: Select one (LOW/MEDIUM/HIGH/URGENT)
- **Due Date**: Pick a date

### 3️⃣ Assign to Multiple Persons
1. Click the **"Assign To"** dropdown field
2. **Search** for employees by name or email
3. **Click** on each person to select them
4. Selected users appear as **blue tags** with an **X** to remove
5. Select as many as needed!

**Example:**
```
Assign To *
[John Doe] [Jane Smith] [Bob Johnson]
Search users...
```

### 4️⃣ Submit & Done!
- Fill remaining fields (estimated time, etc.)
- Click **Create Task**
- Task appears in **all assigned users' "My Tasks"**

---

## What Each Assignee Can Do

✅ **View** task details  
✅ **Update** their progress  
✅ **Add** comments & attachments  
✅ **Request** deadline extensions  
✅ **Mark** task as complete  

❌ Cannot delete task (only creator can)  
❌ Cannot remove other assignees (admin only)  

---

## User Perspectives

### When you assign task to 3 people:

**John Doe sees:**
- "Mobile App Development" → in My Tasks
- Can work on iOS version

**Jane Smith sees:**
- "Mobile App Development" → in My Tasks  
- Can work on Android version

**Bob Johnson sees:**
- "Mobile App Development" → in My Tasks
- Can review and approve

---

## Common Scenarios

### 📊 Project Team Collaboration
```
Task: "Website Redesign"
Assign To: Frontend Dev + Backend Dev + Designer
→ Each works on their part
```

### 🔄 Approval Workflow
```
Task: "Budget Review"
Assign To: Manager → Finance Head → CFO
→ Each reviews in sequence
```

### 🌍 Regional Assignment
```
Task: "Client Outreach"
Assign To: Sales Rep 1 + Sales Rep 2 + Sales Rep 3
→ Each covers their region
```

### 👥 Training Program
```
Task: "Employee Training"
Assign To: HR + Trainer + Department Head
→ All involved in training execution
```

---

## Visual Examples

### Task Card Display
Shows up to 2 assignees with avatars:
```
┌─────────────────────────────────┐
│ Website Redesign     [HIGH]     │
│ This is the description...       │
├─────────────────────────────────┤
│ [JD][JS] +1  ⏰ Due: May 15   │
└─────────────────────────────────┘
```

### Task Details View
Shows all assignees:
```
Assigned To:
├─ John Doe (you) - john@company.com
├─ Jane Smith - jane@company.com  
└─ Bob Johnson - bob@company.com
```

### My Tasks List
Shows only YOUR tasks:
```
Website Redesign       HIGH    May 15
Marketing Campaign     MEDIUM  May 10
Budget Review          URGENT  May 8
```

---

## Update Assignees (Edit Task)

To add or remove assignees from existing task:

1. Open the task
2. Click **Edit**
3. In **"Assign To"** field:
   - Add new users ➕
   - Remove users ❌
4. Save changes

---

## Notifications

When you assign task to multiple people:
- ✅ Each gets **email notification**
- ✅ Each gets **dashboard alert**
- ✅ Each sees it in **"My Tasks"**
- ✅ Real-time updates via **WebSocket**

---

## Task Visibility Rules

### Who can see a task?
- ✅ All assigned users (always)
- ✅ Task creator
- ✅ HR/Admin users
- ❌ Other employees (cannot see)

### Multi-company setup
- Tasks only visible within same company
- Cannot assign users from different companies

---

## Tips & Best Practices

### ✨ Best Practices
1. **Clear roles**: Define what each person does
2. **Few people**: Limit to 2-4 assignees (too many = confusion)
3. **Set expectations**: Clear description of each person's part
4. **Check progress**: Review updates from all assignees
5. **Timely feedback**: Comment to guide collaboration

### ⚠️ Common Mistakes
- ❌ Too many assignees (5+) → confusion
- ❌ Overlapping responsibilities → duplicate work
- ❌ Unclear task → confusion about who does what
- ❌ No communication → failed collaboration

---

## Troubleshooting

### **Q: Users not showing in dropdown?**
A: 
- Check if they're in same company
- Ensure they're active (not deactivated)
- Refresh page and try again

### **Q: User selected but not saving?**
A:
- Check network connection
- Verify user still exists
- Try again or reload

### **Q: Can't see task in another person's list?**
A:
- Verify they were assigned (check task details)
- They may need to refresh "My Tasks"
- Check they're same company

### **Q: Need to change who task is assigned to?**
A:
- Edit task
- Remove person(s) with ❌
- Add new person(s)
- Save

---

## System Requirements

✅ Feature is **fully implemented**  
✅ Works on **all browsers**  
✅ Mobile responsive  
✅ Real-time synchronization  
✅ No special permissions needed  

---

## Performance Notes

- **Up to 10 assignees** per task supported
- **Search** filters 100+ users instantly
- **Real-time updates** within seconds
- No performance impact with multiple assignees

---

## Support

If you need help:
1. Check this quick reference
2. See [MULTIPLE_ASSIGNEES_GUIDE.md](./MULTIPLE_ASSIGNEES_GUIDE.md) for detailed docs
3. Contact HR/Admin team
4. Check system notifications for errors

---

## Key Difference: Single vs Multiple Assignees

| Aspect | Single | Multiple |
|--------|--------|----------|
| Assignees | 1 person | 2-10 people |
| Visibility | Only that person | All assigned people |
| Progress | One person's work | Collaborative work |
| Completion | 1 person marks done | Any can mark done |
| Comments | Track single person's work | Track team discussion |

---

## Summary

✅ **Fully Implemented** - No setup needed  
✅ **Easy to Use** - Just click and select  
✅ **Powerful** - Enables team collaboration  
✅ **Safe** - Proper access control  

**Ready to use right now!** 🚀

