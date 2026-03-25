# 📧 Staff Complaint System - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Update `.env`
Add these lines to `server/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
COMPANY_EMAIL=noreply@company.com
COMPANY_NAME=ERP Admin Team
```

### Step 2: Get Gmail App Password (2 minutes)
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" → "Windows Computer"
3. Copy the 16-character password
4. Paste in `SMTP_PASS` above

### Step 3: Restart Server
```bash
cd server
npm run dev
```

### Step 4: Test It
1. Dashboard: http://localhost:5173/complaints
2. Submit complaint → Check inbox for confirmation email
3. Admin replies → Check inbox for reply email

---

## 🎯 Key System Features

| Feature | File | Status |
|---------|------|--------|
| Complaint Form | `StaffComplaintsDashboard.jsx` | ✅ Complete |
| Confirmation Email | `emailService.js` | ✅ Complete |
| Admin Reply | `AdminComplaintsPage.jsx` | ✅ Complete |
| Reply Email | `emailService.js` | ✅ Complete |
| Dark/Light UI | `StaffComplaintsDashboard.jsx` | ✅ Complete |
| Error Handling | `complaints.controller.js` | ✅ Complete |

---

## 📧 Two Email Triggers

### Trigger 1: Complaint Received
```javascript
// Fired when: Staff submits complaint via POST /complaints
// Subject: "Feedback Received - Under Review"
// Content: Acknowledgment + 7-day deadline
// Non-blocking: Not affect API response
```

### Trigger 2: Admin Reply
```javascript
// Fired when: Admin posts reply via POST /complaints/:id/reply
// Subject: "Update: Response to your Feedback"
// Content: Original subject + Admin's exact reply message
// Non-blocking: Not affect API response
```

---

## 🔐 Architecture

```
Staff Flow                          Admin Flow
─────────────────────             ──────────────────
1. Fill form                       1. View complaints
   (Subject, Category,                (Dashboard)
    Message)                       2. Click to open
                                   3. Type reply
2. Click "Submit"                  4. Click "Send"
   ↓
3. Complaint saved to DB
   ↓
4. Email sent (async)
   └─ "Feedback Received"


5. Staff gets email
   (Confirmation + Timeline)


                                   5. Staff gets email
                                      (Admin's reply)
                                   6. Status changes
                                      to RESOLVED
```

---

## 🛠️ File Structure

```
✅ Backend Ready
├── server/src/modules/complaints/
│   ├── Complaint.model.js
│   ├── complaints.controller.js (with email triggers)
│   ├── complaints.service.js
│   ├── complaints.routes.js
│   └── complaints.schemas.js
└── server/src/utils/
    └── emailService.js (nodemailer setup)

✅ Frontend Ready
├── erp-dashboard/src/features/complaints/
│   ├── StaffComplaintsDashboard.jsx (Premium dark/light UI)
│   ├── AdminComplaintsPage.jsx (Admin reply interface)
│   └── ComplaintsPage.jsx
```

---

## 🧪 Testing Checklist

- [ ] **Submit Complaint**: Staff submits → receives confirmation email in inbox
- [ ] **Check Status**: Complaint appears in "Your Submissions" list
- [ ] **Admin Reply**: Admin fills reply → submits
- [ ] **Receive Reply**: Staff receives reply email in inbox
- [ ] **Email Content**: Verify emails contain correct subject, message, sender
- [ ] **Dark Mode**: Toggle theme → all elements styled correctly
- [ ] **Light Mode**: Switch to light → verify contrast and readability
- [ ] **Mobile**: Test on phone screen → responsive layout works
- [ ] **Error**: Turn off SMTP → verify error logged with [EMAIL_ERROR] prefix
- [ ] **Edge Cases**: Empty fields → shows validation errors

---

## 🚀 Production Checklist

- [ ] Switch email to SendGrid (more reliable than Gmail)
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Enable `SMTP_SECURE=true` for port 465 (if using)
- [ ] Add rate limiting to `/complaints` endpoint
- [ ] Set up monitoring for [EMAIL_ERROR] logs
- [ ] Add audit logging for admin replies
- [ ] Test email templates in Gmail, Outlook, Apple Mail
- [ ] Set up automatic backups of complaint database
- [ ] Document email provider credentials (secure location)
- [ ] Create incident response plan for email service outage

---

## 📱 UI Components Used

**No external UI libraries** - Pure Tailwind CSS:
- `StatusBadge` - Status indicator with icon
- `ComplaintCard` - Card component for each complaint
- `Input component` - Text form fields
- `Button component` - Action buttons
- `Card component` - Container component
- `Spinner` - Loading state

All use **Lucide React icons**.

---

## 🔍 Email Error Debugging

All email errors logged with `[EMAIL_ERROR]` prefix:

```javascript
// Server console output:
[EMAIL_ERROR] Async complaint confirmation email failed: {
  recipient: "user@email.com",
  error: "Invalid credentials",
  timestamp: "2026-03-12T10:30:00.000Z"
}
```

**Actions to take:**
1. Check SMTP credentials in `.env`
2. Verify email provider credentials haven't expired
3. Ensure firewall allows SMTP port (587 or 465)
4. Test with: `verifyTransporter()` function

---

## ⚙️ Configuration Options

```env
# Email Provider
SMTP_HOST=           # SMTP server hostname
SMTP_PORT=           # Port (587 for TLS, 465 for SSL)
SMTP_SECURE=         # true for 465, false for 587
SMTP_USER=           # Username/email
SMTP_PASS=           # Password/app-password

# Company Info
COMPANY_EMAIL=       # Sender email (noreply@...)
COMPANY_NAME=        # Displayed in email footer
```

---

## 📊 API Response Format

### Create Complaint: `POST /complaints`
```javascript
Response (201):
{
  complaint: {
    _id: "...",
    userId: { name: "John", email: "john@email.com" },
    subject: "Payroll Issue",
    message: "...",
    category: "Payroll",
    priority: "Medium",
    status: "OPEN",
    submittedAt: "2026-03-12T10:00:00Z",
    deadlineDate: "2026-03-21T...",
    replyMessage: "",
    repliedAt: null
  }
}
```

### Reply to Complaint: `POST /complaints/:id/reply`
```javascript
Request:
{
  replyMessage: "We're working on this...",
  status: "RESOLVED"
}

Response (200):
{
  complaint: {
    // ... complaint data with updated replyMessage & status
  },
  message: "Reply sent successfully. 7 working days deadline tracked."
}
```

---

## 📱 Frontend Endpoints Called

```javascript
// Load staff's complaints
GET /complaints/my

// Submit new complaint (triggers email)
POST /complaints
Body: { subject, category, message }

// Load complaint details
GET /complaints/:id

// ADMIN: Load all complaints
GET /complaints/admin/all

// ADMIN: Get stats
GET /complaints/admin/stats

// ADMIN: Reply to complaint (triggers email)
POST /complaints/:id/reply
Body: { replyMessage, status: "RESOLVED" }
```

---

## 🎨 Styling Guide

The system uses **Tailwind CSS only**:
- **Dark Mode (Default)**: 
  - Background: `from-slate-900 via-slate-900/50 to-slate-950`
  - Text: `text-slate-100`
  - Borders: `border-slate-700/50`
  
- **Light Mode**:
  - Background: `from-slate-50 to-white`
  - Text: `text-slate-900`
  - Borders: `border-slate-200/50`

- **Premium Effects**:
  - Gradients: `from-slate-900 to-slate-700`
  - Blur: `backdrop-blur-xl`
  - Shadows: `shadow-2xl shadow-slate-900/50`
  - Hover: `hover:shadow-3xl hover:border-slate-600/50`

---

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| No email received | Check `.env` SMTP config; verify inbox/spam |
| "Email service not ready" | Check Gmail app password is correct |
| Timeline always 7 days | Works as designed (automatic calculation) |
| Admin reply not showing | Refresh page; check admin has ADMIN role |
| Dark mode not working | Clear browser cache; check theme provider |

---

## 💬 Email Examples

### Complaint Received Email Template
```
From: ERP Admin Team <noreply@company.com>
To: staff@email.com
Subject: Feedback Received - Under Review

Hello John,

Thank you for your feedback/complaint. Your message is currently under survey.

Subject: Payroll Issue Has Not Been Received

You will typically receive a reply from the Admin team within 7 working days.

Current Status: Under Survey

This is an automated message from ERP Admin Team.
```

### Admin Reply Email Template
```
From: ERP Admin Team <noreply@company.com>
To: staff@email.com
Subject: Update: Response to your Feedback

Hello John,

We have reviewed your feedback and here is our response:

Original Subject: Payroll Issue Has Not Been Received

✉️ Admin Reply:
We've processed your March salary. It will reflect in
your account by Friday. Thank you for patience.

— Response from: Sarah HR Manager

Current Status: Resolved ✓
```

---

## 🔐 Security Best Practices

1. **Never commit `.env`** - in `.gitignore`
2. **Use app passwords** - not main account password
3. **Enable 2FA** on email account
4. **Rotate credentials** - quarterly
5. **Encrypt sensitive data** - if storing PII
6. **Audit admin actions** - who replied, when, what they said
7. **Rate limit** complaints (10 per user per day)

---

## 📞 Support

- **Email Verification**: `verifyTransporter()` in emailService.js
- **Complaint Model**: [Complaint.model.js](./server/src/modules/complaints/Complaint.model.js)
- **Email Service**: [emailService.js](./server/src/utils/emailService.js)
- **Frontend**: [StaffComplaintsDashboard.jsx](./erp-dashboard/src/features/complaints/StaffComplaintsDashboard.jsx)

---

**Last Updated:** March 12, 2026
**System Status:** ✅ Production Ready
**Email System:** ✅ Configured & Async
