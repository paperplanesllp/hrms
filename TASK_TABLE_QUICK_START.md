# 🎯 Premium Task Table - Quick Start

## File Locations
```
erp-dashboard/src/features/tasks/components/table/
├── PremiumTaskTable.jsx       ⭐ Main component (EXPORT THIS)
├── TaskRow.jsx                (Row with inline editing)
├── TaskFilters.jsx            (Filter dropdown system)
├── BulkActionsBar.jsx         (Bulk action buttons)
├── ReminderDropdown.jsx       (Reminder selector)
└── tableUtils.js              (Helper functions - 100+ lines)
```

---

## ⚡ 5-Minute Setup

### 1. Import in Your Page
```jsx
import PremiumTaskTable from './components/table/PremiumTaskTable.jsx';
```

### 2. Prepare Your Data
```jsx
const [tasks, setTasks] = useState([]);
const [users, setUsers] = useState([]);
const [departments, setDepartments] = useState([]);
```

### 3. Add Handlers (Copy-Paste Ready)
```jsx
const handleTaskUpdate = async (taskId, updateData) => {
  const { data } = await api.put(`/tasks/${taskId}`, updateData);
  setTasks(prev => prev.map(t => t._id === taskId ? data : t));
};

const handleTaskDelete = async (taskId) => {
  await api.delete(`/tasks/${taskId}`);
  setTasks(prev => prev.filter(t => t._id !== taskId));
};

const handleBulkDelete = async (taskIds) => {
  await Promise.all(taskIds.map(id => api.delete(`/tasks/${id}`)));
  setTasks(prev => prev.filter(t => !taskIds.includes(t._id)));
};

const handleBulkStatusChange = async (taskIds, status) => {
  await Promise.all(taskIds.map(id => api.put(`/tasks/${id}`, { status })));
  setTasks(prev => prev.map(t =>
    taskIds.includes(t._id) ? { ...t, status } : t
  ));
};

const handleBulkPriorityChange = async (taskIds, priority) => {
  await Promise.all(taskIds.map(id => api.put(`/tasks/${id}`, { priority })));
  setTasks(prev => prev.map(t =>
    taskIds.includes(t._id) ? { ...t, priority } : t
  ));
};

const handleBulkAssign = async (taskIds, userId) => {
  await Promise.all(taskIds.map(id => api.put(`/tasks/${id}`, { assignedTo: userId })));
  setTasks(prev => prev.map(t =>
    taskIds.includes(t._id) ? { ...t, assignedTo: userId } : t
  ));
};
```

### 4. Render Table
```jsx
<PremiumTaskTable
  tasks={tasks}
  onTaskUpdate={handleTaskUpdate}
  onTaskDelete={handleTaskDelete}
  onBulkTasksDelete={handleBulkDelete}
  onBulkStatusChange={handleBulkStatusChange}
  onBulkPriorityChange={handleBulkPriorityChange}
  onBulkAssign={handleBulkAssign}
  onTaskCreate={() => console.log('Create new task')}
  users={users}
  departments={departments}
  isLoading={false}
/>
```

Done! ✅

---

## 📋 Component Props

### PremiumTaskTable Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | Array | ✅ | Task objects array |
| `onTaskUpdate` | Function | ✅ | Called when inline editing saves |
| `onTaskDelete` | Function | ✅ | Called when delete button clicked |
| `onBulkTasksDelete` | Function | ✅ | Called for bulk delete |
| `onBulkStatusChange` | Function | ✅ | Called for bulk status update |
| `onBulkPriorityChange` | Function | ✅ | Called for bulk priority update |
| `onBulkAssign` | Function | ✅ | Called for bulk assign |
| `onTaskCreate` | Function | ✅ | Called for create button |
| `users` | Array | ✅ | User objects for dropdowns |
| `departments` | Array | ✅ | Department objects |
| `isLoading` | Boolean | ❌ | Shows loading spinners |

---

## 🎮 What Users Can Do

| Feature | How It Works |
|---------|-------------|
| **Edit Title** | Click task title → Type new title → Press Enter |
| **Change Priority** | Click priority badge → Select from dropdown |
| **Change Status** | Click status badge → Select from dropdown |
| **Change Assignee** | Click assignee avatar → Select user |
| **Update Due Date** | Click date → Select new date from picker |
| **Sort Tasks** | Click column header (Title, Priority, Status, Due Date) |
| **Filter Tasks** | Click filter buttons above table → Select options |
| **Search Tasks** | Type in search bar (searches title, user, dept) |
| **Select Multiple** | Click checkboxes or drag to select |
| **Bulk Delete** | Select tasks → Click delete button → Confirm |
| **Bulk Change Status** | Select tasks → Click "Change Status" → Pick status |
| **Bulk Change Priority** | Select tasks → Click "Change Priority" → Pick priority |
| **Bulk Assign** | Select tasks → Click "Assign To" → Pick user |
| **Reorder Tasks** | Drag task rows (visual feedback shows on hover) |
| **View Progress** | Progress bar shows task completion % |
| **Set Reminders** | Clock icon in each row (can expand reminder dropdown) |
| **Paginate** | Use Previous/Next buttons at bottom |

---

## 🔌 Backend API Requirements

```javascript
// REQUIRED Endpoints:

// 1. Get all tasks
GET /api/tasks
Response: [{_id, title, priority, status, dueDate, assignedTo, ...}]

// 2. Update one task
PUT /api/tasks/:id
Body: {title?, priority?, status?, dueDate?, assignedTo?, ...}
Return: Updated task object

// 3. Delete one task
DELETE /api/tasks/:id

// 4. Get all users (for dropdowns)
GET /api/users
Response: [{_id, firstName, lastName, email, ...}]

// 5. Get all departments (for filters)
GET /api/departments
Response: [{_id, name, ...}]
```

---

## 🎨 Styling

The table is fully styled with **Tailwind CSS**:
- ✅ Dark mode support (`dark:` classes)
- ✅ Responsive design
- ✅ Smooth animations
- ✅ Color-coded badges
- ✅ Hover effects
- ✅ Focus states

Change Tailwind colors in component files:
```jsx
// Example: Change primary color
className="bg-indigo-600"  // Change 'indigo' to 'blue', 'purple', etc.
```

---

## 🧩 Individual Components

### TaskRow (Inline Editing)
```jsx
<TaskRow
  task={taskObject}
  onUpdate={(taskId, updates) => {...}}
  onDelete={(taskId) => {...}}
  onSelect={(taskId) => {...}}
  isSelected={true/false}
  isDragging={true/false}
  onDragStart={(taskId) => {...}}
  onDragEnd={() => {...}}
  users={userArray}
/>
```

### TaskFilters (Advanced Search)
```jsx
<TaskFilters
  filters={{ status: [], priority: [], ... }}
  onFilterChange={(filterType, values) => {...}}
  onSearchChange={(query) => {...}}
  searchQuery="search text"
  users={userArray}
  departments={departmentArray}
/>
```

### BulkActionsBar (Bulk Ops)
```jsx
<BulkActionsBar
  selectedCount={5}
  onBulkDelete={() => {...}}
  onBulkStatusChange={(status) => {...}}
  onBulkPriorityChange={(priority) => {...}}
  onBulkAssign={(userId) => {...}}
  onClearSelection={() => {...}}
  users={userArray}
/>
```

### ReminderDropdown (Reminders)
```jsx
<ReminderDropdown
  taskId="task_123"
  currentReminder={{ reminderType: '1d', reminderTime: Date }}
  onReminderChange={(taskId, reminderData) => {...}}
/>
```

---

## 🐛 Debugging

### Enable Console Logging
All components log to console with prefixes:
- `✏️` [TaskRow] - Inline edit events
- `🔍` [TaskTable] - Filter/sort events
- `✅` [TaskTable] - Selection events
- `🗑️` [BulkActionsBar] - Bulk delete
- `🔔` [ReminderDropdown] - Reminder change

Look at browser DevTools Console (F12) to see real-time logs!

### Common Errors

**"Cannot read property 'map' of undefined"**
- Check: Are you passing `tasks`, `users`, `departments` arrays?

**"404 Not Found" errors**
- Check: Backend endpoint exists at correct path
- Check: API base URL in `.env` file

**Inline editing not saving**
- Check: `onTaskUpdate` handler is working
- Check: Browser console for error messages
- Check: Network tab for failed requests

---

## 📊 Example Data Structure

```javascript
// Sample task object
{
  _id: "507f1f77bcf86cd799439011",
  title: "Implement user authentication",
  description: "Add login, signup, password reset",
  priority: "HIGH",
  status: "in-progress",
  dueDate: "2024-04-15",
  assignedTo: "507f1f77bcf86cd799439012",  // User ID
  assignedBy: "507f1f77bcf86cd799439013",  // User ID
  department: "507f1f77bcf86cd799439014",  // Dept ID
  progress: 65,
  estimatedHours: 8,
  actualHours: 5.5,
  tags: ["backend", "security"],
  reminderType: "1d",
  reminderTime: "2024-04-14",
  createdAt: "2024-04-08T10:30:00Z",
  updatedAt: "2024-04-10T14:20:00Z"
}

// Sample user object
{
  _id: "507f1f77bcf86cd799439012",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com"
}

// Sample department object
{
  _id: "507f1f77bcf86cd799439014",
  name: "Engineering"
}
```

---

## 🚀 Performance Tips

1. **Pagination**: Table shows 15 items per page (configurable)
2. **Memoization**: Components use `React.memo()` to skip re-renders
3. **Callback Hooks**: All handlers use `useCallback()` for stability
4. **Efficient Filtering**: Uses `useMemo()` - only recalculates when deps change

For **1000+ tasks**, consider:
- Virtual scrolling library (react-window)
- Server-side pagination
- Indexed search
- Cache management

---

## ✅ Testing Checklist

Before shipping to production:

- [ ] All inline edits save to backend
- [ ] Sorting works in both directions
- [ ] Filters work individually and combined
- [ ] Bulk delete shows confirmation
- [ ] Bulk status/priority changes apply to all selected
- [ ] Search finds tasks by title/user/dept
- [ ] Pagination navigates correctly
- [ ] Dark mode renders properly
- [ ] Mobile responsive (if needed)
- [ ] All form validations work
- [ ] API error handling shows user-friendly messages
- [ ] Console has no JavaScript errors

---

## 📦 What's Included

- ✅ 5 React components (~1500 lines)
- ✅ 1 utility file (~400 lines)
- ✅ 40+ Tailwind CSS classes
- ✅ Dark mode support
- ✅ Inline editing
- ✅ Sorting & filtering
- ✅ Bulk operations
- ✅ Pagination
- ✅ Drag & drop ready
- ✅ Reminder system
- ✅ Comprehensive documentation
- ✅ Console logging for debugging

---

## 🎓 Learn More

See `PREMIUM_TASK_TABLE_GUIDE.md` for:
- Detailed component breakdown
- Advanced customization
- Socket.io real-time updates
- All exported utility functions
- Production deployment checklist

---

**Ready to use?** Just copy the 5 files from `components/table/` and follow the 4-step setup above! ⚡
