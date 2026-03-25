# 🎨 Premium SaaS Dashboard - Design System

## Overview
This document outlines the complete design system for the ERP Dashboard, built with a modern, premium aesthetic using Tailwind CSS utilities and a sophisticated color palette.

---

## 🎯 Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Deep Navy** | `#0A1931` | Primary background, sidebar, text headings |
| **Corporate Blue** | `#1A3D63` | Primary buttons, links, active states |
| **Steel Blue** | `#4A7FA7` | Icons, secondary UI, hover states |
| **Mist Blue** | `#B3CFE5` | Borders, dividers, card backgrounds |
| **Off-White** | `#F6FAFD` | Main canvas, input backgrounds, light backgrounds |

### Tailwind Color Names (for convenience)
```javascript
// Use in Tailwind like: bg-navy-900, text-navy-300, etc.
navy: {
  50: "#F6FAFD",   // Off-White
  100: "#E8F1F7",  // (derived)
  200: "#B3CFE5",  // Mist Blue
  300: "#4A7FA7",  // Steel Blue
  400: "#1A3D63",  // Corporate Blue
  900: "#0A1931",  // Deep Navy
}
```

---

## 📐 Typography

### Font Family
- **Primary**: Inter
- **Fallback**: Plus Jakarta Sans
- Font sizes defined with proper line heights for readability

### Text Styles

#### Headings
```javascript
.heading-xl   // 1.875rem, 700 weight, +2.25rem line-height
.heading-lg   // 1.5rem, 600 weight, +1.875rem line-height
.heading-md   // 1.25rem, 600 weight, +1.5rem line-height
.heading-sm   // 1.125rem, 600 weight, +1.5rem line-height
```

#### Body Text
```javascript
.body-base   // 1rem, 400 weight, 1.6 line-height
.body-sm     // 0.875rem, 400 weight, 1.6 line-height
```

---

## 🎴 Component Styling

### Cards
**Premium Card** (default hover effect)
```jsx
<Card>
  {/* Content */}
</Card>
```
- Border: 1px `#B3CFE5`
- Border Radius: `1.5rem` (24px)
- Shadow: `0 2px 8px rgba(10,25,49,0.05)`
- Hover Shadow: `0 8px 24px rgba(10,25,49,0.12)`
- Background: White

**Elevated Card** (fixed, high emphasis)
```jsx
<Card elevated>
  {/* Content */}
</Card>
```
- Same styling but with elevated shadow by default

### Buttons

**Primary Button** (`variant="primary"`)
- Background: `#1A3D63` (Corporate Blue)
- Text: White
- Hover: `#0A1931` (Dark Navy)
- Available sizes: `lg`, `md`, `sm`

```jsx
<Button variant="primary" size="md">
  Save Changes
</Button>
```

**Secondary Button** (`variant="secondary"`)
- Background: `#4A7FA7` (Steel Blue)
- Text: White
- Hover: `#1A3D63`

**Ghost Button** (`variant="ghost"`)
- Background: Transparent
- Border: 1px `#B3CFE5`
- Text: `#1A3D63`
- Hover: 15% `#B3CFE5`

**Danger Button** (`variant="danger"`)
- Background: Red-600
- Text: White

### Inputs & Selects

**Standard Input**
```jsx
<Input name="email" label="Email Address" placeholder="user@example.com" />
```
- Background: `#F6FAFD` (Off-White)
- Border: 1px `#B3CFE5`
- Focus Border: `#4A7FA7` (Steel Blue)
- Focus Ring: 2px `#4A7FA7` @ 20% opacity
- Height: `44px`
- Border Radius: `16px`

**Input with Error**
```jsx
<Input name="password" label="Password" error helperText="Password must be at least 8 characters" />
```
- Border: Red-500
- Ring: Red-200

**Select Dropdown**
```jsx
<Select label="Role">
  <option>User</option>
  <option>Admin</option>
</Select>
```
- Same styling as Input
- Custom appearance with proper hover states

### Forms

All form fields follow the `.input-base` pattern:
- Height: `44px`
- Padding: `12px 16px`
- Border Radius: `16px`
- Transition: `all 0.2s`
- Focus: `outline-none` with colored ring

### Badges

**Variants Available**:
- `primary` - Corporate Blue background
- `secondary` - Steel Blue background
- `light` - Off-White background with border (default)
- `success` - Green
- `warning` - Yellow
- `danger` - Red

```jsx
<Badge variant="primary">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="light">Neutral</Badge>
```

### Tables

**Table Structure**
```jsx
<Table 
  columns={["Name", "Email", "Role"]} 
  rows={data}
  renderRow={(row) => (
    <>
      <TableCell>{row.name}</TableCell>
      <TableCell>{row.email}</TableCell>
      <TableCell><Badge>{row.role}</Badge></TableCell>
    </>
  )}
/>
```

**Table Styling**:
- Head Background: `#F6FAFD`
- Head Border: 1px `#B3CFE5`
- Row Border: 1px `#B3CFE5` @ 50% opacity
- Hover Background: `#F6FAFD`
- Cell Padding: `24px` horizontal, `16px` vertical
- Compact Mode: `16px` horizontal, `8px` vertical

### Modal

```jsx
<Modal 
  open={isOpen} 
  title="Confirm Action"
  onClose={() => setIsOpen(false)}
  size="md"
>
  {/* Content */}
</Modal>
```

**Modal Sizing**:
- `sm` - max-width: 384px
- `md` - max-width: 448px
- `lg` - max-width: 512px
- `xl` - max-width: 576px

**Styling**:
- Background: White
- Border: 1px `#B3CFE5`
- Border Radius: `24px`
- Shadow: `0 25px 50px -12px rgba(10,25,49,0.15)`
- Header Border: 1px `#B3CFE5` @ 30% opacity
- Backdrop: `#0A1931` @ 30% opacity + blur

### Spinner

```jsx
<Spinner /> {/* md (default) */}
<Spinner size="sm" />
<Spinner size="lg" />
```

**Sizes**:
- `sm` - 4x4 with 1px border
- `md` - 6x6 with 2px border (default)
- `lg` - 10x10 with 3px border

---

## 🎨 Layout & Spacing

### Container Padding
**Main Content Area:**
- Mobile: `24px` (`p-6`)
- Tablet: `24px` (`p-6`)
- Desktop: `32px` (`p-8`)

### Card & Gap Spacing
```jsx
// All main containers use p-6 (24px)
<div className="p-6">
  {/* Content with consistent padding */}
</div>

// Cards in grids use gap-4 or gap-6
<div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</div>
```

### Responsive Grid Strategy
```jsx
// Mobile First
<div className="grid gap-4 grid-cols-1">  {/* Single column on mobile */}
  
// Medium screens
<div className="md:grid-cols-2">  {/* Two columns on tablet */}
  
// Large screens
<div className="lg:grid-cols-4">  {/* Four columns on desktop */}
```

---

## 🎭 State Indicators

### Role-Based Color Accents
- **User View**: Corporate Blue (`#1A3D63`) for personal actions
- **HR View**: Steel Blue (`#4A7FA7`) for employee management
- **Admin View**: Deep Navy (`#0A1931`) for system controls

### Status Badges
```jsx
<Badge variant="success">Approved</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Rejected</Badge>
```

---

## ✨ Animations

Available animations defined in `index.css`:

```css
.animate-fadeIn      /* opacity change over 0.3s */
.animate-slideInUp   /* slide from bottom + fade over 0.4s */
.animate-scaleIn     /* scale from 0.95 + fade over 0.3s */
```

**Usage:**
```jsx
<div className="animate-fadeIn">
  {/* Fades in smoothly */}
</div>
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)
- Mobile: 0px (default)
- `sm` - 640px
- `md` - 768px
- `lg` - 1024px
- `xl` - 1280px
- `2xl` - 1536px

### Layout Pattern
```jsx
// Sidebar layout
<div className="min-h-screen bg-[#F6FAFD] flex flex-col lg:flex-row">
  {/* Sidebar (fixed on desktop, overlay on mobile) */}
  {/* Main content (only main scrolls, not sidebar) */}
</div>
```

---

## 🎯 Best Practices

### 1. **Consistency**
- Always use the defined color palette
- Maintain consistent padding with `p-6` for containers, `gap-4` for items

### 2. **Accessibility**
- Sufficient color contrast (WCAG AA compliant)
- Clear focus states on interactive elements
- Semantic HTML structure

### 3. **Performance**
- Use Tailwind utilities instead of custom CSS
- Leverage CSS Grid/Flexbox for layout
- Minimize custom classes

### 4. **Typography Hierarchy**
```jsx
// Page title
<h1 className="text-3xl md:text-4xl font-bold text-[#0A1931]">
  Dashboard
</h1>

// Card title
<h2 className="text-lg font-semibold text-[#0A1931]">
  Company Updates
</h2>

// Section subtitle
<p className="text-sm text-[#4A7FA7]">
  Latest announcements
</p>
```

### 5. **Form Best Practices**
```jsx
// Always provide labels
<Input label="Email" name="email" />

// Include helper text or error messages
<Input 
  label="Password" 
  error 
  helperText="At least 8 characters required"
/>
```

---

## 🔧 Utility Classes Reference

### Colors
```
text-navy-900  /* #0A1931 */
text-navy-400  /* #1A3D63 */
text-navy-300  /* #4A7FA7 */
text-navy-200  /* #B3CFE5 */
text-navy-50   /* #F6FAFD */

bg-navy-900    /* #0A1931 */
border-navy-200 /* #B3CFE5 */
```

### Spacing
```
p-4   /* 16px */
p-6   /* 24px */
p-8   /* 32px */
gap-4 /* 16px gap */
gap-6 /* 24px gap */
```

### Typography
```
font-bold      /* 700 weight */
font-semibold  /* 600 weight */
font-normal    /* 400 weight */
uppercase
tracking-wider
```

### Shadows
```
shadow-sm   /* subtle */
shadow-md   /* medium */
shadow-lg   /* large */
shadow-2xl  /* extra large */
```

---

## 📝 Example Component Usage

### Stat Card
```jsx
<StatCard
  title="Present Today"
  value={45}
  hint="Active employees checked in"
  icon={Users}
  color="steel-blue"
/>
```

### Page with Title
```jsx
<PageTitle
  title="Dashboard"
  subtitle="Monitor all systems at a glance"
  icon={LayoutDashboard}
  actions={[
    <Button key="export">Export</Button>,
    <Button key="print" variant="secondary">Print</Button>
  ]}
/>
```

### Form
```jsx
<div className="space-y-6 p-6">
  <Input label="Full Name" placeholder="John Doe" />
  <Select label="Department">
    <option>Engineering</option>
    <option>Marketing</option>
  </Select>
  <textarea label="Notes" className="input-base" />
  <Button>Save</Button>
</div>
```

---

## 📚 Files to Reference

- **Global Styles**: `src/index.css`
- **Tailwind Config**: `tailwind.config.js`
- **Component Examples**: `src/components/`
- **Layout**: `src/components/layout/AppLayout.jsx`
- **Pages**: `src/features/dashboard/DashboardPage.jsx`

---

## ✅ Quality Checklist

When adding new components or pages:
- [ ] Uses defined color palette
- [ ] Consistent padding (`p-6` for containers, `gap-4`/`gap-6` for grids)
- [ ] Proper typography hierarchy
- [ ] Mobile-first responsive design
- [ ] Accessible form labels and states
- [ ] Smooth transitions and animations
- [ ] Only Tailwind utilities used (no custom CSS unless absolutely necessary)
- [ ] Proper border radius (`rounded-2xl` or `rounded-3xl`)
- [ ] Correct shadow usage (`shadow-md` for hover, etc.)

---

Generated: March 2025
Last Updated: Design System v1.0
