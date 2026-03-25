# 🏗️ Staff Complaint System - Architecture & Data Flow

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STAFF-TO-ADMIN COMPLAINT SYSTEM                          │
│                                                                              │
│  Frontend (React)              Backend (Node.js)           Database         │
│  ─────────────────             ──────────────────          ────────         │
│                                                                              │
│  StaffDashboard    ────→   POST /complaints    ────→   Complaint           │
│  └─Form              │     (createComplaint)      │     Model              │
│  └─List              │                            │     └─userId           │
│  └─Details           │                            │     └─subject          │
│                      │     ┌──────────────────┐   │     └─message          │
│   Admin Page         │     │  EMAIL TRIGGER 1 │   │     └─category         │
│  └─Dashboard         │     ├──────────────────┤   │     └─priority         │
│  └─Reply Form        │     │ sendComplaint     │   │     └─status          │
│  └─Stats             │     │ ReceivedEmail()   │   │     └─replyMessage    │
│                      │     └──────────────────┘   │     └─repliedBy        │
│                      │              ↓             │     └─repliedAt        │
│                      │         📧 Email Service   │     └─deadlineDate     │
│                      │         (Nodemailer)       │     └─isDeadlinePassed │
│                      │              ↓             │                        │
│  Admin Dashboard   ──→   POST /complaints         └───→ Returned to       │
│  ├─Select complaint │         /:id/reply               Client             │
│  ├─Type reply       │     (replyComplaint)             ✅ 201 Created      │
│  └─Submit           │                                                      │
│                      │     ┌──────────────────┐                           │
│                      │     │  EMAIL TRIGGER 2 │                           │
│                      │     ├──────────────────┤                           │
│                      │     │ sendAdminReply    │                           │
│                      │     │ Email()           │                           │
│                      └─────┤                  ├────────────────────────────┘
│                            │ ✉️ Emails        │                            
│                            └──────────────────┘                            
│                                   ↓                                         
│                            📧 Gmail/SendGrid                               
│                                   ↓                                         
│                         👤 Staff Inbox 📬                                   
│                                                                              
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Email Flow Architecture

```
COMPLAINT SUBMISSION FLOW
═════════════════════════════════════════════════════════════════

1. STAFF SUBMITS COMPLAINT
┌─────────────────────────────────┐
│ StaffComplaintsDashboard.jsx    │
│  ┌─────────────────────────────┐│
│  │ Form Data:                  ││
│  │ - Subject: "Login Issue"    ││
│  │ - Category: Technical       ││
│  │ - Message: "Cannot SSO..."  ││
│  └─────────────────────────────┘│
│ ↓ Click: "Submit Confidentially"│
└─────────────────────────────────┘
         │
         ↓ axios.post("/complaints", formData)
         │
┌─────────────────────────────────────────────────────────────┐
│ Backend: complaints.controller.js                           │
│ ├─ Route: POST /complaints                                 │
│ ├─ Handler: createComplaint()                              │
│ ├─ Validation: Zod schema check ✓                          │
│ ├─ DB: Create complaint document                           │
│ │  ├─ userId: req.user._id                                │
│ │  ├─ subject: "Login Issue"                              │
│ │  ├─ status: "OPEN"                                      │
│ │  └─ deadlineDate: Today + 7 working days                │
│ │                                                          │
│ ├─ 🚀 ASYNC EMAIL TRIGGER (NON-BLOCKING)                  │
│ │  ├─ Extract: userEmail, userName from complaint         │
│ │  ├─ Call: sendComplaintReceivedEmail(...)               │
│ │  ├─ NO AWAIT - Returns immediately                      │
│ │  └─ .catch(err) - Logs [EMAIL_ERROR] separately         │
│ │                                                          │
│ └─ Response: 201 Created ← SENT BEFORE EMAIL              │
└─────────────────────────────────────────────────────────────┘
         │
         ↓ Response 201 received by browser
         │
┌─────────────────────────────────────────────────────────────┐
│ Frontend: StaffComplaintsDashboard.jsx                      │
│ ├─ Toast: "Complaint submitted"                            │
│ ├─ UI: Reload complaints list                              │
│ └─ New complaint appears in "Your Submissions"             │
└─────────────────────────────────────────────────────────────┘

[MEANWHILE IN BACKGROUND]
         │
         ↓ sendComplaintReceivedEmail() executing
         │
┌─────────────────────────────────────────────────────────────┐
│ emailService.js                                             │
│ ├─ Function: sendComplaintReceivedEmail()                   │
│ ├─ Template: createComplaintReceivedTemplate()              │
│ │  ├─ Subject: "Feedback Received - Under Review"          │
│ │  ├─ HTML: Professional email template                    │
│ │  ├─ Include: User greeting, subject, 7-day timeline      │
│ │  └─ Include: Status badge, footer                        │
│ │                                                          │
│ ├─ Nodemailer:                                              │
│ │  ├─ From: "ERP Admin Team <noreply@company.com>"        │
│ │  ├─ To: staff@example.com                                │
│ │  ├─ Subject: "Feedback Received..."                      │
│ │  ├─ HTML: [email template HTML]                          │
│ │  └─ Text: [plain text version]                           │
│ │                                                          │
│ ├─ SMTP Transport:                                          │
│ │  ├─ Host: smtp.gmail.com (from .env)                     │
│ │  ├─ Port: 587                                            │
│ │  ├─ Auth: SMTP_USER, SMTP_PASS                          │
│ │  └─ TLS: Enabled                                         │
│ │                                                          │
│ ├─ Result: transporter.sendMail() ✅                       │
│ │  ├─ Success: Log "✅ Email sent"                         │
│ │  └─ Failure: Log "[EMAIL_ERROR] Async email failed"      │
│ │                                                          │
│ └─ Return: Promise<boolean>                                │
└─────────────────────────────────────────────────────────────┘
         │
         ↓ Email sent via SMTP
         │
┌─────────────────────────────────────────────────────────────┐
│ 📧 Email Server (Gmail/SendGrid)                            │
│ ├─ Route email through SMTP server                          │
│ ├─ Add headers & authentication                             │
│ ├─ Convert to MIME format                                   │
│ └─ Queue for delivery                                       │
└─────────────────────────────────────────────────────────────┘
         │
         ↓ Email delivered (< 30 seconds)
         │
┌─────────────────────────────────────────────────────────────┐
│ 📬 Staff's Inbox                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ From: ERP Admin Team <noreply@company.com>              ││
│ │ Subject: Feedback Received - Under Review               ││
│ │ ─────────────────────────────────────────────────────── ││
│ │ Hello John,                                              ││
│ │                                                          ││
│ │ Thank you for your feedback/complaint. Your message is  ││
│ │ currently under survey.                                  ││
│ │                                                          ││
│ │ Subject: Login Issue                                     ││
│ │ You will receive a reply within 7 working days.         ││
│ │                                                          ││
│ │ Current Status: Under Survey                             ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Admin Reply Flow Architecture

```
ADMIN REPLY FLOW
═════════════════════════════════════════════════════════════════

1. ADMIN NAVIGATES TO COMPLAINT
┌─────────────────────────────────┐
│ AdminComplaintsPage.jsx         │
│  ├─ GET /complaints/admin/all   │
│  ├─ Display all complaints      │
│  ├─ Click on a complaint        │
│  └─ Modal/panel opens          │
└─────────────────────────────────┘
         │
2. ADMIN TYPES REPLY
┌─────────────────────────────────┐
│ Reply Text Area:                │
│ "We've fixed SSO. Please try    │
│  logging in again. If issue     │
│  persists, contact IT team."    │
└─────────────────────────────────┘
         │
3. ADMIN SUBMITS REPLY
├─ Click: "Send Reply"
│
↓ axios.post("/complaints/:id/reply", { replyMessage })
│
┌─────────────────────────────────────────────────────────────┐
│ Backend: complaints.controller.js                           │
│ ├─ Route: POST /complaints/:id/reply                        │
│ ├─ Auth: Requires ADMIN role ✓                             │
│ ├─ Validation: replyMessage not empty ✓                    │
│ │                                                          │
│ ├─ DB Update:                                               │
│ │  ├─ complaint.replyMessage = "We've fixed SSO..."        │
│ │  ├─ complaint.repliedBy = req.user._id (admin)           │
│ │  ├─ complaint.repliedAt = new Date()                     │
│ │  ├─ complaint.status = "RESOLVED"                        │
│ │  └─ Save to database                                     │
│ │                                                          │
│ ├─ Populate user & admin info                              │
│ │  ├─ userId.name = "John Staff"                           │
│ │  ├─ userId.email = "john@company.com"                    │
│ │  ├─ repliedBy.name = "Sarah Admin"                       │
│ │  └─ originalSubject = complaint.subject                  │
│ │                                                          │
│ ├─ 🚀 ASYNC EMAIL TRIGGER 2 (NON-BLOCKING)                │
│ │  ├─ Call: sendAdminReplyEmail(                           │
│ │  │   userEmail,                                          │
│ │  │   userName,                                           │
│ │  │   originalSubject,                                    │
│ │  │   replyMessage,                                       │
│ │  │   repliedByName                                       │
│ │  │ )                                                     │
│ │  ├─ NO AWAIT - Returns immediately                       │
│ │  └─ .catch(err) - Logs [EMAIL_ERROR] separately          │
│ │                                                          │
│ └─ Response: 200 OK ← SENT BEFORE EMAIL                    │
└─────────────────────────────────────────────────────────────┘
         │
         ↓ Response 200 received by browser
         │
┌─────────────────────────────────────────────────────────────┐
│ Frontend: AdminComplaintsPage.jsx                           │
│ ├─ Toast: "Reply sent successfully"                        │
│ ├─ Clear reply text area                                   │
│ ├─ Update complaint status to RESOLVED                     │
│ ├─ Update admin stats                                      │
│ └─ Reload complaints list                                  │
└─────────────────────────────────────────────────────────────┘

[MEANWHILE IN BACKGROUND]
         │
         ↓ sendAdminReplyEmail() executing
         │
┌─────────────────────────────────────────────────────────────┐
│ emailService.js                                             │
│ ├─ Function: sendAdminReplyEmail()                          │
│ ├─ Template: createAdminReplyTemplate()                     │
│ │  ├─ Subject: "Update: Response to your Feedback"         │
│ │  ├─ HTML: Professional email template                    │
│ │  ├─ Include: User greeting                               │
│ │  ├─ Include: Original subject in box                      │
│ │  ├─ Include: Admin reply (highlighted)                   │
│ │  ├─ Include: Admin's name signature                      │
│ │  ├─ Include: Status = Resolved ✓                         │
│ │  └─ Include: Footer                                      │
│ │                                                          │
│ ├─ Nodemailer:                                              │
│ │  ├─ From: "ERP Admin Team <noreply@company.com>"        │
│ │  ├─ To: john@company.com                                 │
│ │  ├─ Subject: "Update: Response to your Feedback"         │
│ │  ├─ HTML: [email template with reply]                    │
│ │  └─ Text: [plain text version]                           │
│ │                                                          │
│ ├─ SMTP Transport: (same as before)                         │
│ │                                                          │
│ └─ Result: transporter.sendMail() ✅                       │
│    ├─ Success: Log "✅ Admin reply email sent"             │
│    └─ Failure: Log "[EMAIL_ERROR] Async admin reply failed"│
└─────────────────────────────────────────────────────────────┘
         │
         ↓ Email sent via SMTP
         │
┌─────────────────────────────────────────────────────────────┐
│ 📧 Email Server (Gmail/SendGrid)                            │
│ └─ Routing & delivery (< 30 seconds)                        │
└─────────────────────────────────────────────────────────────┘
         │
         ↓ Email delivered
         │
┌─────────────────────────────────────────────────────────────┐
│ 📬 Staff's Inbox                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ From: ERP Admin Team <noreply@company.com>              ││
│ │ Subject: Update: Response to your Feedback             ││
│ │ ─────────────────────────────────────────────────────── ││
│ │ Hello John,                                              ││
│ │                                                          ││
│ │ We have reviewed your feedback and here is our response:││
│ │                                                          ││
│ │ Original Subject: Login Issue                            ││
│ │                                                          ││
│ │ Admin Reply:                                             ││
│ │ We've fixed SSO. Please try logging in again. If issue  ││
│ │ persists, contact IT team.                               ││
│ │                                                          ││
│ │ — Response from: Sarah Admin                             ││
│ │                                                          ││
│ │ Current Status: Resolved ✓                               ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Relationship Diagram

```
USER (MongoDB)                    COMPLAINT (MongoDB)
════════════════════             ══════════════════════════════
_id                    ┌─────────→ userId (ObjectId ref)
name                   │           subject (String)
email                  │           message (String)
role (ADMIN/USER)      │           category (enum)
...more fields         │           priority (enum)
                       │           status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
                       │           submittedAt (Date)
                       │           replyMessage (String)
                       │           repliedBy (ObjectId ref) ←──┐
                       └─────────────────────────────────────┤
                                   repliedAt (Date)           │
                                   deadlineDate (Date)        │
                                   isDeadlinePassed (Boolean) │
                                                              │
                                                         (Another USER
                                                          for admin)
```

---

## Error Handling Flow

```
EMAIL SENDING ERROR SCENARIOS
═════════════════════════════════════════════════════════════════

SCENARIO 1: Wrong SMTP Password
─────────────────────────────────────────────────────────────

sendComplaintReceivedEmail()
    ↓
try {
    transporter.sendMail(...)
}
catch (error) {
    console.error("[EMAIL_ERROR] Complaint confirmation email failed:", {
        recipient: "user@email.com",
        error: "Invalid credentials",
        timestamp: "2026-03-12T10:30:00Z"
    });
    return false;  ← Doesn't throw
}
    ↓
Complaint STILL SAVED IN DB ✓
API STILL RETURNS 201 ✓
Error logged with [EMAIL_ERROR] prefix ✓
User sees success message ✓


SCENARIO 2: SMTP Service Down
─────────────────────────────────────────────────────────────

sendComplaintReceivedEmail()
    ↓ await transporter.sendMail()
    ↓ ECONNREFUSED (socket timeout)
    ↓
catch (error) {
    console.error("[EMAIL_ERROR] Async complaint confirmation email failed:", {
        recipient: "user@email.com",
        error: "connect ECONNREFUSED",
        timestamp: "2026-03-12T10:30:00Z"
    });
    return false;
}
    ↓
Complaint STILL SAVED IN DB ✓
API STILL RETURNS 201 ✓
Admin can SEE complaint ✓
Error logged with [EMAIL_ERROR] prefix ✓


SCENARIO 3: Exception During Processing
─────────────────────────────────────────────────────────────

.catch(err => {
    console.error("[EMAIL_ERROR] Async email failed:", err.message);
    // Error caught, not thrown ✓
})
    ↓
Promise rejected silently ✓
API response already sent ✓
No 500 error ✓
```

---

## Frontend Component Hierarchy

```
StaffComplaintsDashboard.jsx (Main Container)
├── PageTitle Component
│   └── Icon + Title + Subtitle
├── Header Section
│   └── "New Confidential Submission" Button
├── Conditional: Submission Form
│   ├── Input (Subject)
│   ├── Select (Category)
│   ├── Textarea (Message)
│   └── Buttons (Cancel, Submit)
└── Complaints Grid
    └── ComplaintCard[] (Mapped)
        ├── Card Header
        │   ├── Subject (Expandable)
        │   ├── Date
        │   ├── StatusBadge
        │   │   ├── Status (OPEN/IN_PROGRESS/RESOLVED)
        │   │   └── Priority (Low/Medium/High/Urgent)
        │   └── Chevron (Expand/Collapse indicator)
        ├── Card Content
        │   ├── Message (in box)
        │   └── Category Tag
        └── Conditional: Admin Reply Section (if expanded)
            ├── "Admin Reply" Label
            └── Reply Message (highlighted)

AdminComplaintsPage.jsx (Admin Container)
├── PageTitle
├── Statistics Cards
│   ├── Total Complaints
│   ├── Open Count
│   ├── Resolved Count
│   └── Overdue Count
├── Search & Filter Bar
│   ├── Search input
│   ├── Status dropdown
│   ├── Priority dropdown
│   └── Clear All button
└── Grid Layout (2 columns)
    ├── Left: Complaint List
    │   └── Clickable complaint rows
    └── Right: Complaint Details + Reply Form
        ├── Selected complaint section
        ├── Reply textarea
        └── Send Reply button
```

---

## Data Flow Sequence Diagrams

```
SEQUENCE 1: Critical Path (Happy Path)
═════════════════════════════════════════════════════════════════

Staff Browser │ Frontend API │ Backend  │ Database │ Email Service
─────────────┼─────────────┼────────┼──────────┼────────────────
       │          │         │        │          │
       │ View     │         │        │          │
       ├─ Form ──→│         │        │          │
       │          │         │        │          │
       │ Submit   │         │        │          │
       ├─────────→├─ POST /complaints
       │          │         │        │          │
       │          │         ├─ Create Complaint in DB
       │          │         │        ├─────────→│
       │          │         │        │← Success│
       │          │         │        │          │
       │          │         │        │          ├─ sendComplaintReceivedEmail()
       │          │         │        │          │ (async, no await)
       │          │         ├─ 201 Created ←────┤
       │          ├────────→│        │          │
       │← Toast ──┤         │        │          │
       │ Success  │         │        │          │
       │          │         │        │          ├─ [await] Email sent
       │ Reload   │         │        │          │ ✅ Success
       ├─ GET ───→├─ /complaints/my
       │          │         ├─ Fetch user complaints
       │          │         │        ├─────────→│
       │          │         │        │← Data    │
       │          ├────────→│        │          │
       │← List ────┤         │        │          │
       │ Updated  │         │        │          │
       │          │         │        │          ├─ Email delivered to
       │          │         │        │          │ Staff inbox ✅
       │ Sees     │         │        │          │
       │ Complaint│         │        │          │
       │ in list  │         │        │          │
       │          │         │        │          │
```

---

## Async Email Execution Pattern

```
REQUEST TIMELINE
═════════════════════════════════════════════════════════════════

t=0ms
│ POST /complaints received
├─ Input validation ✓
├─ Database create ✓
├─ Populate user data ✓
│
├─ sendComplaintReceivedEmail(...) [ASYNC]
│  ├─ (No await here)
│  ├─ Returns Promise
│  ├─ Added to event loop queue
│  └─ .catch(err) with error handler
│
└─ RETURN 201 RESPONSE TO CLIENT ← (~ 5ms after request)
   │
   └─ Browser: "Your complaint submitted!"
   
[MEANWHILE IN BACKGROUND - Event Loop]
   │
   t=5-100ms
   ├─ Nodemailer creating email
   ├─ SMTP server connection
   ├─ TLS handshake
   ├─ Authentication
   ├─ Email transmission
   │
   └─ Completion (or error logged with [EMAIL_ERROR])

KEY ADVANTAGE:
─────────────
✅ User doesn't wait for email sending
✅ API feels fast (5-10ms response time)
✅ Email failures don't crash the API
✅ Complaint always saved to DB regardless of email
```

---

## Status Lifecycle

```
COMPLAINT STATUS FLOW
═════════════════════════════════════════════════════════════════

1. INITIAL STATE (Staff submits)
   ├─ Status: OPEN
   ├─ repliedAt: null
   ├─ replyMessage: ""
   └─ Notification: ✉️ "Feedback Received"

2. OPTIONAL: In Progress (Admin acknowledges)
   ├─ Status: IN_PROGRESS
   ├─ Admin: Starts working on it
   ├─ Staff: No notification sent
   └─ Dashboard: Shows "In Progress" badge

3. RESOLUTION (Admin sends reply)
   ├─ Status: RESOLVED
   ├─ repliedAt: timestamp
   ├─ replyMessage: "Admin's message here"
   ├─ repliedBy: admin user ID
   ├─ Deadline check: Within 7 working days? ✓
   └─ Notification: ✉️ "Response to your Feedback"

4. OPTIONAL: Closed
   ├─ Status: CLOSED
   ├─ Timeline: After 30 days of RESOLVED
   ├─ Action: Admin archive action
   └─ Dashboard: Hidden from active list

BADGE DISPLAY IN UI
─────────────────────
Color     │ Status      │ Icon    │ Timeline
──────────┼─────────────┼─────────┼─────────────
Blue ⏱️   │ OPEN        │ Clock   │ Waiting
Amber 🔄  │ IN_PROGRESS │ Clock   │ Reviewing  
Green ✅  │ RESOLVED    │ CheckOk │ Done!
Gray ◯    │ CLOSED      │ Archive │ Old
```

---

## Technology Stack

```
FRONTEND STACK
══════════════════════════════════════════════════════════════

React 19.2.0
├─ Component-based UI
├─ Hooks (useState, useEffect, useCallback, useContext)
└─ Context API for theme/auth

Tailwind CSS 3.4.4
├─ Utility-first CSS framework
├─ No component library dependency
├─ Dark mode support
└─ Responsive breakpoints (sm, md, lg, xl)

Lucide React Icons
├─ Clean, minimal icon set
├─ Consistent across app
└─ 24px base size

Axios
├─ HTTP client
├─ Request/response interceptors
├─ JWT token handling

Zustand
├─ State management
└─ Used for: toast store, auth store

React Router DOM 6.20.0
├─ Client-side routing
├─ Nested routes
└─ Protected routes


BACKEND STACK
══════════════════════════════════════════════════════════════

Express 5.2.1
├─ HTTP server
├─ Middleware support
└─ Route handlers

Node.js
├─ JavaScript runtime
├─ Async/await support
└─ Event-driven architecture

MongoDB 9.2.3 (Mongoose ODM)
├─ NoSQL database
├─ Schema validation
├─ Indexing support
└─ Query population

Nodemailer 8.0.2
├─ Email sending library
├─ SMTP support (Gmail, SendGrid, Outlook)
├─ HTML email templates
└─ Promise-based API

Zod 4.3.6
├─ TypeScript-first schema validation
├─ Input validation
└─ Error message customization

JWT (jsonwebtoken)
├─ Authentication tokens
├─ Role-based access
└─ Token expiration

Node-Cron
├─ Scheduler for tasks
└─ Working day calculations


INFRASTRUCTURE
══════════════════════════════════════════════════════════════

MongoDB Atlas
├─ Cloud database hosting
├─ Automatic backups
└─ Scaling options

SMTP Provider (Choice of):
├─ Gmail (SMTP server)
├─ SendGrid (API-based)
├─ Outlook/Office365
└─ Any SMTP-compliant provider

Docker (Optional)
├─ Containerization
├─ Production deployment
└─ Development environment

GitHub
├─ Version control
├─ CI/CD integration
└─ Collaboration
```

---

## Security Flow

```
AUTHENTICATION & AUTHORIZATION
═════════════════════════════════════════════════════════════════

INCOMING REQUEST
│
├─ JWT Token present in header?
│  ├─ YES: Extract from Authorization header
│  │  ├─ Verify signature with JWT_ACCESS_SECRET
│  │  ├─ Check expiration
│  │  ├─ Extract user info → req.user
│  │  └─ Continue to route handler ✓
│  │
│  └─ NO:
│     └─ Return 401 Unauthorized

ROLE-BASED ACCESS
│
├─ Route requires ADMIN? (e.g., POST /complaints/:id/reply)
│  ├─ Check req.user.role
│  ├─ YES = ADMIN or superuser?
│  │  ├─ YES: Proceed ✓
│  │  └─ NO: Return 403 Forbidden
│  │
│  └─ Route is public or user-level:
│     └─ Proceed ✓

INPUT VALIDATION
│
├─ Zod schema validates all request body
├─ Type checking
├─ Length validation
├─ Enum validation
└─ Custom validation rules

DATA SENSITIVITY
│
├─ Email passwords in .env (not in code)
├─ Secrets not logged
├─ Error messages don't expose internals
└─ User emails properly protected
```

---

## Monitoring & Logging

```
LOG LEVELS & LOCATIONS
═════════════════════════════════════════════════════════════════

✅ SUCCESS LOGS (Console)
├─ "✅ Complaint confirmation email sent to user@email.com"
├─ "✅ Admin reply email sent to user@email.com"
└─ "✅ Email transporter is ready"

❌ ERROR LOGS (Console with [EMAIL_ERROR] prefix)
├─ "[EMAIL_ERROR] Async complaint confirmation email failed:"
│  ├─ recipient
│  ├─ error (exact error message)
│  └─ timestamp
├─ "[EMAIL_ERROR] Async admin reply email failed:"
├─ "[EMAIL_ERROR] Email transporter verification failed:"
└─ "[EMAIL_ERROR] Database operation failed:"

⚠️ WARNING LOGS
├─ "⚠️ Email transporter not ready"
├─ "⚠️ Rate limit exceeded"
└─ "⚠️ Slow database query"

🔍 DEBUG LOGS (Development only)
├─ Request received
├─ Payload validated
├─ Database query executed
└─ Response sent timing
```

---

This architecture provides:
- ✅ **Reliability:** Async emails don't block requests
- ✅ **Scalability:** Can handle many complaints simultaneously  
- ✅ **Security:** Role-based access control, input validation
- ✅ **User Experience:** Fast API responses, premium UI
- ✅ **Monitoring:** Comprehensive logging with [EMAIL_ERROR] prefix
- ✅ **Maintainability:** Clear separation of concerns

---

*Generated: March 12, 2026*
