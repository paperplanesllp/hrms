# Staff-to-Admin Confidential Feedback & Complaint System
## Complete Setup & Deployment Guide

---

## 📋 TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Email Configuration](#email-configuration)
4. [Backend Setup](#backend-setup)
5. [Frontend Features](#frontend-features)
6. [Testing Workflow](#testing-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## 🎯 SYSTEM OVERVIEW

Your **Staff-to-Admin Confidential Feedback & Complaint System** is a secure, premium-designed solution that enables staff to submit confidential complaints and receive automated email notifications at key stages:

### Key Features:
- ✅ **Confidential submission form** - Premium dark/light UI with Tailwind CSS
- ✅ **Automated email triggers** - Asynchronous, non-blocking email service
- ✅ **Admin reply system** - Admins can respond with replies and track 7-day SLA
- ✅ **Status tracking** - Visual indicators (Under Survey, In Progress, Resolved)
- ✅ **Email notifications** - Two types of emails:
  1. **Complaint Received** - Sent when staff submits complaint
  2. **Admin Reply** - Sent when admin responds

---

## 🏗️ ARCHITECTURE

### Database Schema
```
Complaint Model
├── userId (ref User) - Who submitted
├── subject (String) - Complaint title
├── message (String) - Full message
├── category (Technical Issue, Leave, Payroll, Attendance, Others)
├── priority (Low, Medium, High, Urgent)
├── status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
├── submittedAt (Date)
├── replyMessage (String) - Admin's response
├── repliedBy (ref User) - Which admin
├── repliedAt (Date)
├── deadlineDate (Date) - 7 working day deadline
└── isDeadlinePassed (Boolean)
```

### Email Flow
```
Staff Submits Complaint
        ↓
POST /complaints (Controller)
        ↓
    ├─→ Create complaint in DB
    ├─→ Async: sendComplaintReceivedEmail()
    │    └─→ Email: "Feedback Received - Under Review"
    └─→ Return 201 success
        
Admin Replies
        ↓
POST /complaints/:id/reply (Controller)
        ↓
    ├─→ Update complaint in DB
    ├─→ Async: sendAdminReplyEmail()
    │    └─→ Email: "Update: Response to your Feedback"
    └─→ Return 200 success
```

---

## 📧 EMAIL CONFIGURATION

### Step 1: Choose Your Email Provider

#### Option 1: Gmail (Recommended for Testing)
1. **Enable 2-Step Verification**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password
   - Copy this password

3. **Update `.env`**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcd1234efgh5678  # The 16-character App Password
   COMPANY_EMAIL=noreply@yourcompany.com
   COMPANY_NAME=ERP Admin Team
   ```

#### Option 2: SendGrid
1. Create account at https://sendgrid.com
2. Generate API key
3. Update `.env`
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=SG.your-api-key-here
   COMPANY_EMAIL=noreply@yourcompany.com
   COMPANY_NAME=ERP Admin Team
   ```

#### Option 3: Office 365 / Outlook
1. Use your organizational email
2. Update `.env`
   ```env
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@company.com
   SMTP_PASS=your-password
   COMPANY_EMAIL=noreply@company.com
   COMPANY_NAME=ERP Admin Team
   ```

### Step 2: Verify Configuration
Add this to your `server/src/server.js` on startup:
```javascript
import { verifyTransporter } from "./src/utils/emailService.js";

// After all middleware/routes setup:
if (process.env.NODE_ENV !== "test") {
  verifyTransporter().catch(err => 
    console.warn("⚠️ Email transporter not ready:", err.message)
  );
}
```

---

## 🔧 BACKEND SETUP

### File Structure
```
server/src/
├── modules/complaints/
│   ├── Complaint.model.js          # MongoDB schema
│   ├── complaints.controller.js    # Request handlers with email triggers
│   ├── complaints.service.js       # Business logic
│   ├── complaints.routes.js        # Express routes
│   └── complaints.schemas.js       # Zod validation schemas
├── utils/
│   ├── emailService.js             # Nodemailer config & email functions
│   ├── asyncHandler.js             # Error handling wrapper
│   ├── apiError.js                 # Error class
│   └── workingDays.js              # Deadline calculation
```

### Key Files Overview

#### 1. **Complaint Model** (`Complaint.model.js`)
- Stores complete complaint data
- Auto indexes userId and status for fast queries
- Tracks 7-day working day deadline
- Stores admin replies and timestamps

#### 2. **Email Service** (`emailService.js`)
**Nodemailer Configuration:**
```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

**Email Functions:**
- `sendComplaintReceivedEmail(userEmail, userName, subject)` - Confirmation email
- `sendAdminReplyEmail(userEmail, userName, originalSubject, replyMessage, repliedByName)` - Reply notification
- `verifyTransporter()` - Test email connectivity

#### 3. **Complaint Controller** (`complaints.controller.js`)

**Route: POST /complaints**
```javascript
// Staff submits complaint
await complaintService.createComplaint(userId, data);

// Async email (non-blocking)
sendComplaintReceivedEmail(userEmail, userName, subject)
  .catch(err => console.error("[EMAIL_ERROR]", err));
```

**Route: POST /complaints/:id/reply**
```javascript
// Admin replies to complaint
await complaintService.replyComplaint(complaintId, adminId, replyData);

// Async email (non-blocking)
sendAdminReplyEmail(userEmail, userName, subject, reply, adminName)
  .catch(err => console.error("[EMAIL_ERROR]", err));
```

#### 4. **Email Error Handling**
- Email failures are **logged separately** using `[EMAIL_ERROR]` prefix
- Email sending happens **asynchronously** - doesn't block API response
- If email fails, complaint/reply is still saved and API returns success
- Useful for: debugging, monitoring, alert systems

---

## 🎨 FRONTEND FEATURES

### Component: `StaffComplaintsDashboard.jsx`

#### 1. **Complaint Submission Form**
```
┌─────────────────────────────────┐
│ New Confidential Submission      │
├─────────────────────────────────┤
│ Subject: [_______________]       │
│ Category: [Dropdown ▼]           │
│                                   │
│ Your Message (Confidential):      │
│ [Large Text Area for complaint]   │
│                                   │
│ [Cancel] [Submit Confidentially] │
│                                   │
│ 🔒 Confidentiality Notice        │
└─────────────────────────────────┘
```

#### 2. **Complaint List/Grid**
- **Dark Mode (Default):** Deep slate palette with glowing active states
- **Light Mode:** Clean white with subtle shadows
- **Status Badges:** Visual indicators with icons
  - Under Survey (Blue) ⏱️
  - In Progress (Amber) 🔄
  - Resolved (Green) ✅
- **Priority Badges:** Color-coded (Low, Medium, High, Urgent)

#### 3. **Complaint Details**
```
┌─────────────────────────────────┐
│ Subject: "Login Issues"          │
│ Status: Under Survey | Priority  │
├─────────────────────────────────┤
│ Category: Technical Issue        │
│                                   │
│ Your Message:                     │
│ "Cannot login with SSO..."       │
│                                   │
│ ─────────────────────────────    │
│ Admin Reply (Green Highlight):   │
│ "We've fixed the SSO login..."   │
│ — Response from: John Admin      │
│                                   │
│ Status: Resolved ✓               │
└─────────────────────────────────┘
```

#### 4. **Styling Features**
- **Pure Tailwind CSS** (no Material UI, Chakra UI)
- **Premium Dark Theme:**
  - Deep slate (slate-900, slate-800)
  - Gradient overlays
  - Subtle borders
  - Glowing hover states
  - Backdrop blur effects
- **Responsive:** Mobile → Tablet → Desktop
- **Animations:** Smooth transitions, pulse effects
- **Icons:** Lucide React for consistency

---

## ✅ TESTING WORKFLOW

### Test 1: Staff Submits Complaint

**Step 1:** Navigate to Staff Complaint Dashboard
```
http://localhost:5173/complaints
```

**Step 2:** Fill out form
```
Subject: "Payroll Issue"
Category: "Payroll"
Message: "I haven't received my salary for March"
```

**Step 3:** Click "Submit Confidentially"

**Expected Results:**
- ✅ Complaint appears in your list (status: OPEN)
- ✅ Staff receives email: "Feedback Received - Under Review"
- ✅ Email contains: Subject, deadline info, status
- ✅ API returns 201 success

**Check Console:**
```
✅ Complaint confirmation email sent to user@email.com: <messageId>
```

### Test 2: Admin Replies

**Step 1:** Admin navigates to Complaint Management
```
http://localhost:5173/admin/complaints
```

**Step 2:** Click on a complaint to view it

**Step 3:** Type reply message in the reply box
```
"Thank you for reporting. We're investigating the March 
payroll issue. You'll receive your payment by Friday."
```

**Step 4:** Click "Send Reply"

**Expected Results:**
- ✅ Complaint status changes to RESOLVED
- ✅ Reply message displayed in complaint
- ✅ Staff receives email: "Update: Response to your Feedback"
- ✅ Email contains: Original subject, admin's reply, sender name
- ✅ API returns 200 success

**Check Console:**
```
✅ Admin reply email sent to user@email.com: <messageId>
```

### Test 3: Email Failure Handling

**To test email error logging:**

**Scenario 1:** Wrong SMTP password
```
[EMAIL_ERROR] Admin reply email failed: {
  recipient: "user@email.com",
  error: "Invalid credentials",
  timestamp: "2026-03-12T10:30:00.000Z"
}
```
- Complaint still marked as RESOLVED
- API returns 200 success
- Error logged with [EMAIL_ERROR] prefix

**Scenario 2:** SMTP service down
```
[EMAIL_ERROR] Async admin reply email failed: {
  recipient: "user@email.com",
  error: "connect ECONNREFUSED",
  timestamp: "2026-03-12T10:30:00.000Z"
}
```
- Complaint still saved
- User sees success message
- Admin can see error in server logs

---

## 🐛 TROUBLESHOOTING

### Issue 1: "Email service is not ready"
**Cause:** SMTP configuration invalid
**Fix:**
1. Verify `.env` variables:
   ```bash
   echo $SMTP_HOST
   echo $SMTP_USER
   ```
2. Check credentials (especially Gmail app password)
3. Ensure TLS/SSL settings correct (port 587 = TLS)
4. Check firewall allows outbound SMTP

### Issue 2: "sendComplaintReceivedEmail is not a function"
**Cause:** EmailService module not exported correctly
**Fix:**
```javascript
// Verify in emailService.js
export async function sendComplaintReceivedEmail(...) { }
export async function sendAdminReplyEmail(...) { }
export default { sendComplaintReceivedEmail, sendAdminReplyEmail };

// Verify import in complaints.controller.js
import { sendComplaintReceivedEmail, sendAdminReplyEmail } from "../../utils/emailService.js";
```

### Issue 3: "Complaint submitted but no email received"
**Cause:** Email sent asynchronously, may be delayed or in spam
**Fix:**
1. Check spam/junk folder
2. Check server console for errors (look for ✅ or ❌ message)
3. Verify recipient email is correct in DB
4. Test with Gmail (easiest to debug)

### Issue 4: Admin reply modal not showing up
**Cause:** AdminComplaintsPage not loading correctly
**Fix:**
1. Refresh page (F5)
2. Check browser console for errors
3. Verify admin user has ADMIN role
4. Check complaint has userId populated

### Issue 5: "Cannot read property 'email' of undefined"
**Cause:** userId not populated when sending email
**Fix:**
In `complaints.controller.js`:
```javascript
// WRONG - doesn't populate
const complaint = await Complaint.create({...});

// CORRECT - populates userId
const complaint = await Complaint.findById(complaint._id).populate({
  path: "userId",
  select: "name email"
});
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Pre-Deployment Checklist

#### 1. Environment Variables
```env
# Production
NODE_ENV=production

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net  # Use SendGrid for production
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx_production_key_xxxxx

# Company Branding
COMPANY_EMAIL=complaints@yourcompany.com
COMPANY_NAME=YourCompany HR Team

# Security
TLS_REJECT_UNAUTHORIZED=true  # Enable in production
```

#### 2. Email Service Verification
Run before deployment:
```javascript
// scripts/verify-email.js
import { verifyTransporter } from "./src/utils/emailService.js";

const isReady = await verifyTransporter();
if (!isReady) process.exit(1);
```

#### 3. Database Indexing
```javascript
// MongoDB indices created automatically, verify includes:
db.complaints.createIndex({ userId: 1 });
db.complaints.createIndex({ status: 1 });
db.complaints.createIndex({ submittedAt: -1 });
db.complaints.createIndex({ deadlineDate: 1 });
```

#### 4. Rate Limiting
Add to `server/src/app.js`:
```javascript
import rateLimit from "express-rate-limit";

const complaintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 complaints per IP
  message: "Too many complaints submitted, please try again later"
});

app.post("/complaints", complaintLimiter, ...);
```

#### 5. Email Templates Customization
Edit `emailService.js` templates:
```javascript
// Add company logo URL
<img src="https://yourcompany.com/logo.png" width="200" alt="Company Logo" />

// Add custom company footer
<p>Contact: support@yourcompany.com | Phone: +1-XXX-XXXX-XXXX</p>
```

#### 6. Audit Logging
Add to `complaints.controller.js`:
```javascript
import auditLog from "../../utils/audit.js";

export const replyToComplaint = asyncHandler(async (req, res) => {
  // ... existing code ...
  
  // Log audit trail
  await auditLog.create({
    action: "ADMIN_REPLY_SENT",
    adminId: req.user._id,
    complaintId: complaintId,
    timestamp: new Date()
  });
});
```

#### 7. Monitoring & Alerts
Set up alerts in your logging service:
```
Alert: [EMAIL_ERROR] triggered
Action: Check SMTP configuration
Escalate: If > 10 errors in 1 hour
```

---

## 📊 API ENDPOINTS REFERENCE

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/complaints` | User | Submit new complaint; triggers email |
| GET | `/complaints/my` | User | Get user's complaints |
| GET | `/complaints/:id` | User | Get specific complaint details |
| POST | `/complaints/:id/reply` | Admin | Reply to complaint; triggers email |
| PATCH | `/complaints/:id/status` | Admin | Update complaint status |
| GET | `/complaints/admin/all` | Admin | Get all complaints (admin view) |
| GET | `/complaints/admin/stats` | Admin | Get statistics (total, open, resolved, overdue) |
| GET | `/complaints/admin/search` | Admin | Search complaints |

---

## 📝 EXAMPLE EMAIL TEMPLATES

### Email 1: Complaint Received
```
Subject: Feedback Received - Under Review

Hello [User Name],

Thank you for your feedback/complaint. Your message is currently under survey.

Subject: [Complaint Subject]

You will typically receive a reply from the Admin team within 7 working days.

Current Status: Under Survey

This is an automated message from [Company Name].
Please do not reply directly to this email.
```

### Email 2: Admin Reply
```
Subject: Update: Response to your Feedback

Hello [User Name],

We have reviewed your feedback and here is our response:

Original Subject: [Complaint Subject]

Admin Reply:
[Admin's exact reply message]
— Response from: [Admin Name]

Current Status: Resolved ✓

This is an automated message from [Company Name].
```

---

## 🎯 NEXT STEPS

1. **Configure Email Provider**
   - [ ] Choose provider (Gmail/SendGrid/Outlook)
   - [ ] Get credentials
   - [ ] Update `.env` file

2. **Test Email System**
   - [ ] Run verification: `npm run verify-email`
   - [ ] Submit test complaint
   - [ ] Verify inbox for confirmation email
   - [ ] Admin replies to test complaint
   - [ ] Verify staff gets reply email

3. **Customize Templates** (Optional)
   - [ ] Add company logo URL
   - [ ] Update company name/email
   - [ ] Customize footer
   - [ ] Add contact information

4. **Deploy to Production**
   - [ ] Set environment to production
   - [ ] Use SendGrid/professional email
   - [ ] Enable HTTPS everywhere
   - [ ] Set up monitoring/alerts

---

## 💡 TIPS & BEST PRACTICES

1. **Email Design**
   - Always include plain text version (for accessibility)
   - Test emails across Gmail, Outlook, Apple Mail
   - Use responsive HTML for mobile compatibility

2. **Data Privacy**
   - Encrypt sensitive data in database
   - Implement complaint expiration (archive after 6 months)
   - Add role-based access control for admin replies

3. **Performance**
   - Use async email sending (don't block API)
   - Cache complaint stats for admin dashboard
   - Implement pagination for large complaint lists

4. **Error Handling**
   - Log all email failures with [EMAIL_ERROR] prefix
   - Set up automatic retry mechanism
   - Create admin alert for email service failures

5. **Compliance**
   - GDPR: Add data deletion request option
   - HIPAA: Encrypt complaint content if medical info
   - SOC2: Audit log all admin actions on complaints

---

## 📞 SUPPORT & DOCUMENTATION

For component details, see:
- Frontend: [StaffComplaintsDashboard.jsx](./erp-dashboard/src/features/complaints/StaffComplaintsDashboard.jsx)
- Admin: [AdminComplaintsPage.jsx](./erp-dashboard/src/features/complaints/AdminComplaintsPage.jsx)
- Backend: [emailService.js](./server/src/utils/emailService.js)
- Database: [Complaint.model.js](./server/src/modules/complaints/Complaint.model.js)

---

**Generated:** March 12, 2026
**System Version:** 1.0.0
**Status:** Production Ready ✅
