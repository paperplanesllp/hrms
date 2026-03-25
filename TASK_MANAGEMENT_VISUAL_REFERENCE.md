# Task Management Phase 1 - Visual Reference Guide

## 🎨 UI Component Map

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│  [📋 Icon] Task Management              [Filter] [Export] ➕ │
│            Organize, track, and manage team tasks...          │
└─────────────────────────────────────────────────────────────┘
```

### Quick Stats Section (4 Cards)
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ⏱️  Active    │ │ ✅ Completed │ │ ⚠️  Overdue   │ │ 📈 Rate      │
│   24 tasks   │ │   48 tasks   │ │   3 tasks    │ │   92%        │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Tab Navigation (Pill-style)
```
  ┌─────────────────────────────────────────────────────────┐
  │  [Overview] [Task List] [Assign] [My Tasks] [All] [Reports]  ● Live │
  └─────────────────────────────────────────────────────────┘
  └─ Active has gold background & shadow
```

---

## 📊 Overview Tab Layout

```
┌─────────────────────────────────────────────────┐
│  📊 Task Overview              📊               │
│                                                 │
│  Get a comprehensive view of all ongoing        │
│  tasks, team performance metrics, and           │
│  upcoming deadlines...                          │
│                                                 │
│  [View Detailed Analytics] [Download Report]   │
└─────────────────────────────────────────────────┘

┌────────────────┐ ┌────────────────┐
│ 🎯 Team        │ │ 📈 Productivity│
│   Performance  │ │    Index       │
│   94%  +2.5%   │ │ 8.7/10 +0.3pts │
└────────────────┘ └────────────────┘

┌────────────────┐ ┌────────────────┐
│ ⚡ Priority    │ │ 📅 Upcoming    │
│   Tasks        │ │    Deadlines   │
│   12  -3/week  │ │ 8  On schedule │
└────────────────┘ └────────────────┘

┌──────────────────────────────────────┐
│  📊 Activity Timeline                 │
│  [Last 7] [30] [90 Days]              │
│                                       │
│  ╔═══════════════════════════════╗  │
│  ║    Chart placeholder area      ║  │
│  ║                               ║  │
│  ║ Chart data will be rendered    ║  │
│  ║ here in Phase 2 integration    ║  │
│  ╚═══════════════════════════════╝  │
└──────────────────────────────────────┘
```

---

## 📋 Task List Tab Layout

```
┌────────────────────────┐ [Filters] [Sort]
│ 🔍 Search tasks...     │
└────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TASK TITLE        │ ASSIGNEE      │ PRIORITY │ STATUS  │ DUE  │
├─────────────────────────────────────────────────────────────┤
│ Design dashboard  │ Sarah Johnson │ High     │ ⏳ In P. │ 3/28 │
│ API documentation │ Mike Davis    │ Medium   │ ⏳ Pend. │ 3/30 │
│ Implement payment │ Emma Wilson   │ High     │ ⏳ In P. │ 3/31 │
│ Fix responsive    │ John Smith    │ Medium   │ ✅ Done │ 3/25 │
│ Review feedback   │ Lisa Anderson │ Low      │ ⏳ Pend. │ 4/02 │
├─────────────────────────────────────────────────────────────┤
│ Showing 1-5 of 47 tasks          [← Prev] [Next →]          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✏️ Assign Task Tab Layout

```
ℹ️ Create and assign tasks to team members with clear deadlines
   and priority levels. Real-time notifications will be sent.

┌────────────────────────────────┐
│ Task Title *                    │
│ [Enter task title...]           │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Description                     │
│ [Provide detailed description] │
│                                │
└────────────────────────────────┘

┌──────────────────────┬──────────────────────┐
│ 👤 Assign To *       │ Department           │
│ [Select member....] │ [Select department...] │
└──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┐
│ 📅 Due Date *        │ Priority Level        │
│ [MM/DD/YYYY]        │ [Medium ▼]           │
└──────────────────────┴──────────────────────┘

[Assign Task] [Cancel]

✅ FORM PREVIEW
   Once submitted, the assignee will receive a real-time
   notification and can start tracking the task immediately.
```

---

## 🎯 My Tasks Tab Layout

```
[All] [Pending] [In Progress] [Completed]

┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│ Design new dashboard layout      │ │ Update API documentation         │
│ Create wireframes and mockups... │ │ Add new endpoints documentation  │
│                                  │ │                                  │
│ 🚀 In Progress                   │ │ ⏳ Pending                       │
│                                  │ │                                  │
│ Progress: ████████░░ 65%         │ │ Progress: ░░░░░░░░░░ 0%         │
│                                  │ │                                  │
│ Due: Mar 28       Assigned by:   │ │ Due: Mar 30       Assigned by:   │
│ Admin                            │ │ Team Lead                        │
│                                  │ │                                  │
│ [Update Status] [View Details]   │ │ [Update Status] [View Details]   │
└──────────────────────────────────┘ └──────────────────────────────────┘

┌──────────────────────────────────┐
│ Fix mobile responsiveness        │
│ Ensure all pages work correctly  │
│                                  │
│ ✅ Completed                     │
│                                  │
│ Progress: ███████████████ 100%   │
│                                  │
│ Due: Mar 25       Assigned by:   │
│ Manager                          │
│                                  │
│ [Update Status] [View Details]   │
└──────────────────────────────────┘
```

---

## 🌐 All Tasks Tab Layout

### Grid View
```
┌──────────────────────────────────────────────┐
│ 🔍 Search...        [Filters] [Grid/List]   │
└──────────────────────────────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ 🎨 Design           │ │ 💻 Engineering      │ │ 🎨 Frontend         │
│                     │ │                     │ │                     │
│ Dashboard design    │ │ API implementation  │ │ Mobile optimization │
│                     │ │                     │ │                     │
│ 👤 Sarah Johnson    │ │ 👤 Mike Davis      │ │ 👤 Emma Wilson      │
│                     │ │                     │ │                     │
│ ✅ In Progress 65%  │ │ ⏳ In Progress 80% │ │ ⏳ Pending 20%       │
│                     │ │                     │ │                     │
│ [View Details]      │ │ [View Details]      │ │ [View Details]      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### List View
```
┌──────────────────────────────────────────────────────────────┐
│ ● Dashboard design    Sarah Johnson • Design                 │
│   Progress: 65% │ ✅ In Progress │                          │
├──────────────────────────────────────────────────────────────┤
│ ● API implementation  Mike Davis • Engineering               │
│   Progress: 80% │ ⏳ In Progress │                          │
├──────────────────────────────────────────────────────────────┤
│ ● Mobile optimization Emma Wilson • Frontend                 │
│   Progress: 20% │ ⏳ Pending │                              │
├──────────────────────────────────────────────────────────────┤
│ ● Database migration  John Smith • Backend                   │
│   Progress: 45% │ ⏳ In Progress │                          │
└──────────────────────────────────────────────────────────────┘

Summary: ⏳ In Progress: 3  ⏳ Pending: 2  ✅ Completed: 1
```

---

## 📊 Reports Tab Layout

```
Date Range: [Week] [Month ◆] [Quarter] [Year]

┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│ 📊 Completion Rate     │ │ 📈 Team Productivity   │ │ 📊 Task Distribution   │
│      92%               │ │      8.7/10            │ │      3:2:1             │
│ +5.2%                  │ │ +0.8                   │ │ High:Med:Low           │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘

┌─────────────────────────────────────────┐ ┌──────────────────────────────┐
│  Completion Trend                       │ │ Task Distribution            │
│  [Last 7] [30] [90 Days] [Export ▼]   │ │ [By Priority ▼]             │
│                                         │ │                              │
│  ┌─────────────────────────────────┐  │ │ ┌──────────────────────────┐ │
│  │     Chart placeholder area      │  │ │ │   Chart placeholder      │ │
│  │                                 │  │ │ │                          │ │
│  │ Trend chart will render here    │  │ │ │ Distribution chart will  │ │
│  │ in Phase 2 integration          │  │ │ │ render here in Phase 2   │ │
│  └─────────────────────────────────┘  │ │ └──────────────────────────┘ │
└─────────────────────────────────────────┘ └──────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Team Performance Metrics                                         │
├──────────────────────────────────┬─────────────────────────────┤
│ Sarah Johnson    28 completed │ 3 in progress │ 2.3 days │ ███████ 95% │
│ Mike Davis       24 completed │ 5 in progress │ 2.8 days │ ████████ 88% │
│ Emma Wilson      32 completed │ 2 in progress │ 1.9 days │ ████████ 98% │
│ John Smith       19 completed │ 6 in progress │ 3.1 days │ ████░ 82%    │
└──────────────────────────────────┴─────────────────────────────┘

[Export as PDF] [Export as CSV] [Export as Excel]
```

---

## 🎨 Color Reference

### Status Colors
```
Pending:        ░░░░░░░░░░ GRAY      (bg-slate-100)
In Progress:    ▓▓▓▓▓▓▓▓▓▓ BLUE      (bg-blue-100)
Completed:      ███████████ GREEN    (bg-emerald-100)
```

### Priority Colors
```
Low:            ▓▓▓▓▓▓▓▓▓▓ BLUE      (#3B82F6)
Medium:         ▓▓▓▓▓▓▓▓▓▓ AMBER     (#F59E0B)
High:           ▓▓▓▓▓▓▓▓▓▓ RED       (#EF4444)
Urgent:         ███████████ DARK RED (#991B1B)
```

### Department/Team Colors
```
Design:         ▓▓▓▓▓▓▓▓▓▓ PURPLE    (#A855F7)
Engineering:    ▓▓▓▓▓▓▓▓▓▓ BLUE      (#3B82F6)
Frontend:       ▓▓▓▓▓▓▓▓▓▓ CYAN      (#06B6D4)
Backend:        ▓▓▓▓▓▓▓▓▓▓ INDIGO    (#4F46E5)
DevOps:         ▓▓▓▓▓▓▓▓▓▓ GREEN     (#10B981)
Tech Writing:   ▓▓▓▓▓▓▓▓▓▓ PINK      (#EC4899)
```

---

## 📐 Spacing Guide

```
Component Spacing:
┌─────────────────────────────────┐
│                                 │ ← Margin: 32px (mb-8)
│  ┌─────────────────────────────┐│
│  │ Padding: 24px (p-6)        ││
│  │                             ││
│  │ Item spacing: 16px (gap-4)  ││
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ││
│  │ │Item 1│ │Item 2│ │Item 3│ ││
│  │ └──────┘ └──────┘ └──────┘ ││
│  │                             ││
│  └─────────────────────────────┘│
│                                 │ ← Margin: 32px (mb-8)
└─────────────────────────────────┘
```

---

## 🔤 Typography Scale

```
Heading XL (H1)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Task Management                  48px ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Heading LG (H2)
┌──────────────────────────────────────┐
│ Task Overview                    24px │
└──────────────────────────────────────┘

Heading MD (H3)
┌──────────────────────────────┐
│ Team Performance          20px │
└──────────────────────────────┘

Body Base
┌────────────────────────────┐
│ Regular text             16px │
└────────────────────────────────┘

Body Small
┌──────────────────────┐
│ Secondary text     14px │
└──────────────────────────────┘

Label
┌──────────────┐
│ LABELS    12px │
└──────────────────────────┘
```

---

## 🎭 Interactive States

### Button States
```
Default:  [Button Text]
Hover:    [Button Text] ↑ (slight lift) + shadow
Active:   [Button Text] ↓ (scale 0.95)
Disabled: [Button Text] (opacity: 50%)
```

### Card States
```
Default:  ┌─────────┐
          │  Card   │ (shadow-1)
          └─────────┘

Hover:    ┌─────────┐
          │  Card   │ (shadow-3) ↑
          └─────────┘

Interactive: ┌─────────┐
             │  Card   │ (can click)
             └─────────┘
```

---

## 📊 Responsive Breakpoints

```
Mobile (< 768px)
┌──────────────────┐
│ Single Column    │
│  Layout          │
└──────────────────┘

Tablet (768px - 1023px)
┌────────────────┬────────────────┐
│ Two Column     │ Two Column     │
│ Layout         │ Layout         │
└────────────────┴────────────────┘

Desktop (1024px - 1279px)
┌────────┬────────┬────────┐
│ Three  │ Column │ Layout │
│ Column │ Layout │        │
└────────┴────────┴────────┘

Large Desktop (1280px+)
┌────────┬────────┬────────┬────────┐
│ Four   │ Column │ Layout │ Layout │
│ Column │        │        │        │
└────────┴────────┴────────┴────────┘
```

---

## ✨ Animation Reference

```
Page Entry:        Fade in + Slide up (300ms)
Tab Switch:        Fade in + Scale (300ms)
Card Hover:        Lift + Shadow (300ms)
Progress Bar:      Smooth fill (500ms)
Status Change:     Pulse (300ms loop)
Button Click:      Scale 0.95 (300ms)
```

---

**For complete styling details, refer to:**
- `tailwind.config.js` - Configuration
- Component source files - Implementation
- Related documentation - Detailed guides

---

This visual guide helps understand the layout, spacing, colors, and interactions across all Task Management Phase 1 components.
