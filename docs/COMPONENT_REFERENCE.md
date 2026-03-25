# 🚀 Quick Component Reference - Premium Dashboard

## Frequently Used Patterns

### 1. Dashboard Page Layout
```jsx
import PageTitle from "../../components/common/PageTitle.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";

export default function MyPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <PageTitle
        title="Page Title"
        subtitle="A brief description of what this page does"
        icon={IconComponent}
      />

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Metric 1" value={42} hint="Description" />
        <StatCard title="Metric 2" value={28} hint="Description" />
        <StatCard title="Metric 3" value={15} hint="Description" />
        <StatCard title="Metric 4" value={9} hint="Description" />
      </div>

      {/* Content Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {/* Main content */}
        </Card>
        <Card>
          {/* Sidebar */}
        </Card>
      </div>
    </div>
  );
}
```

### 2. Simple Form
```jsx
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";

export default function FormPage() {
  const [formData, setFormData] = useState({ name: "", role: "" });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <Input
          label="Full Name"
          placeholder="Enter name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        >
          <option value="">Select Role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>

        <div className="flex gap-3">
          <Button variant="primary">Save</Button>
          <Button variant="ghost">Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
```

### 3. Data Table with Actions
```jsx
import Table, { TableCell } from "../../components/ui/Table.jsx";
import Badge from "../../components/ui/Badge.jsx";

export default function UsersList() {
  const users = [
    { id: 1, name: "John", email: "john@example.com", role: "Admin" },
    { id: 2, name: "Jane", email: "jane@example.com", role: "User" },
  ];

  return (
    <Table
      columns={["Name", "Email", "Role", "Actions"]}
      rows={users}
      renderRow={(user) => (
        <>
          <TableCell>{user.name}</TableCell>
          <TableCell>{user.email}</TableCell>
          <TableCell>
            <Badge variant="primary">{user.role}</Badge>
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">Edit</Button>
              <Button size="sm" variant="danger">Delete</Button>
            </div>
          </TableCell>
        </>
      )}
    />
  );
}
```

### 4. Card with Header & Content
```jsx
<Card>
  {/* Header */}
  <div className="p-6 border-b border-[#B3CFE5]/30">
    <h2 className="text-lg font-semibold text-[#0A1931]">Card Title</h2>
    <p className="text-sm text-[#4A7FA7] mt-1">Card description</p>
  </div>

  {/* Content */}
  <div className="p-6">
    {/* Main content here */}
  </div>
</Card>
```

### 5. Empty State
```jsx
import EmptyState from "../../components/common/EmptyState.jsx";
import { Package } from "lucide-react";

// In your component
{data.length === 0 ? (
  <EmptyState
    icon={Package}
    title="No Items Found"
    subtitle="Start by creating your first item"
  />
) : (
  {/* Render data */}
)}
```

### 6. Modal with Form
```jsx
import Modal from "../../components/ui/Modal.jsx";
import Input from "../../components/ui/Input.jsx";

export default function UserModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add User</Button>

      <Modal
        open={isOpen}
        title="Create New User"
        onClose={() => setIsOpen(false)}
        size="md"
      >
        <div className="space-y-6">
          <Input label="Name" placeholder="John Doe" />
          <Input label="Email" type="email" placeholder="john@example.com" />
          
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary">Create</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
```

### 7. Loading State
```jsx
import Spinner from "../../components/ui/Spinner.jsx";

{loading ? (
  <div className="flex justify-center items-center h-64">
    <Spinner size="lg" />
  </div>
) : (
  {/* Render data */}
)}
```

### 8. List with Badges & Icons
```jsx
<div className="space-y-4">
  {items.map((item) => (
    <div
      key={item.id}
      className="p-5 rounded-2xl border border-[#B3CFE5]/50 bg-[#F6FAFD] hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-[#1A3D63] group-hover:text-[#0A1931] transition-colors">
          {item.title}
        </h3>
        <Badge variant={item.status === "active" ? "success" : "warning"}>
          {item.status}
        </Badge>
      </div>
      <p className="text-sm text-[#4A7FA7]">{item.description}</p>
    </div>
  ))}
</div>
```

## Color Palette Quick Reference

### Text Colors
```jsx
className="text-[#0A1931]"  // Headings (Deep Navy)
className="text-[#1A3D63]"  // Emphasis (Corporate Blue)
className="text-[#4A7FA7]"  // Secondary text (Steel Blue)
```

### Background Colors
```jsx
className="bg-[#0A1931]"    // Dark sections (Deep Navy)
className="bg-[#1A3D63]"    // Primary sections (Corporate Blue)
className="bg-[#4A7FA7]"    // Secondary sections (Steel Blue)
className="bg-[#B3CFE5]"    // Light sections (Mist Blue)
className="bg-[#F6FAFD]"    // Light backgrounds (Off-White)
```

### Border Colors
```jsx
className="border-[#B3CFE5]"        // All borders
className="border-[#B3CFE5]/30"     // Subtle borders
className="border-[#B3CFE5]/50"     // Medium borders
```

## Spacing Standards

### Padding Inside Cards
```jsx
className="p-6"  // Most cards (24px)
className="p-4"  // Compact cards (16px)
className="p-8"  // Spacious sections (32px)
```

### Gaps Between Elements
```jsx
className="gap-4"  // Between items (16px)
className="gap-6"  // Between cards (24px)
className="space-y-4"  // Vertical spacing (16px)
```

## Typography Utilities

### Headings
```jsx
className="text-3xl font-bold"      // Page title
className="text-2xl font-semibold"  // Card title
className="text-lg font-semibold"   // Section title
className="text-base font-semibold" // Item heading
```

### Body Text
```jsx
className="text-base"        // Main text
className="text-sm"          // Secondary text
className="text-xs"          // Help text, captions
className="uppercase tracking-wider"  // Labels
```

## Common Patterns

### Active/Hover Effects
```jsx
// For list items
className="hover:bg-[#F6FAFD] hover:shadow-md transition-all duration-300"

// For buttons
className="active:scale-95 transition-all duration-300"

// For cards
className="hover:shadow-[0_8px_24px_rgba(10,25,49,0.12)] transition-all duration-300"
```

### Focus States
```jsx
// Input focus
className="focus:border-[#4A7FA7] focus:ring-2 focus:ring-[#4A7FA7]/20"

// Button focus
className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A7FA7]"
```

### Disabled States
```jsx
className="disabled:opacity-50 disabled:cursor-not-allowed"
```

## Responsive Tips

### Mobile-First Grid
```jsx
// Default mobile: 1 column
<div className="grid grid-cols-1 gap-6
              md:grid-cols-2
              lg:grid-cols-4">
```

### Conditional Display
```jsx
className="hidden sm:block"     // Hide on mobile, show on tablet+
className="md:px-8"             // Increase padding on desktop
className="lg:col-span-2"       // Span 2 columns on large screens
```

## Import Statements (Commonly Used)

```jsx
// Layout
import AppLayout from "../../components/layout/AppLayout.jsx";
import HeaderBar from "../../components/layout/HeaderBar.jsx";

// Common Components
import PageTitle from "../../components/common/PageTitle.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";

// UI Components
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Table, { TableCell } from "../../components/ui/Table.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

// Icons
import { Plus, Edit, Trash2, Download, Eye } from "lucide-react";

// Store
import { useAuthStore } from "../../store/authStore.js";
import { toast } from "../../store/toastStore.js";

// API
import api from "../../lib/api.js";
```

## Key Reminders ⚠️

1. **Always use `p-6`** for main card containers
2. **Always use `gap-4` or `gap-6`** between cards/items
3. **Never hardcode colors** - use the palette
4. **Always provide labels** for form inputs
5. **Use semantic HTML** - don't skip headings
6. **Mobile first** - add responsive classes (md:, lg:, etc.)
7. **Smooth transitions** - add `transition-all duration-300` to interactive elements
8. **Test accessibility** - ensure sufficient color contrast and keyboard navigation

---

**Need more examples?** Check the implementation in:
- `src/features/dashboard/DashboardPage.jsx`
- `src/features/attendance/AttendancePage.jsx`
- `src/features/leave/LeaveMyPage.jsx`
