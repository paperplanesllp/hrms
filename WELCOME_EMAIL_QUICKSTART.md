# Welcome Email Feature - Quick Reference ⚡

## What It Does
✅ When Admin or HR creates a new user account, an automatic greeting email is sent to that person with their login credentials.

## Setup (1 Minute)

### Step 1: Configure Email in `.env`
```bash
# Add to server/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
COMPANY_EMAIL=noreply@company.com
COMPANY_NAME=Your Company Name
FRONTEND_URL=https://your-erp-url.com
```

### Step 2: Restart Server
```bash
cd server && npm start
```

**Done!** 🎉 Email system is active.

---

## Usage (How It Works)

### Admin/HR Creates User
```bash
POST /api/users
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "SecurePass@123",
  "role": "USER"
}
```

### Automatically Happens
1. ✅ User account created in database
2. ✅ Temporary password captured
3. ✅ **Welcome email sent automatically** ← NEW!
4. ✅ Activity logged

### Response Shows Email Status
```json
{
  "user": { ... },
  "emailNotification": {
    "sent": true,
    "message": "Welcome email sent to john@company.com"
  }
}
```

### New User Receives Email
📧 **Subject:** "Welcome to [Company] - Your Account is Ready!"

**Email Contains:**
- ✅ Email address (login)
- ✅ Temporary password (to copy)
- ✅ Account role
- ✅ Created by (creator's name)
- ✅ Next steps (4 steps)
- ✅ Security warnings
- ✅ Support contact
- ✅ Login link to ERP

---

## Email Template Preview

```
┌─────────────────────────────────┐
│  Welcome! 🎉                    │
│  Your account is ready to use   │
└─────────────────────────────────┘

Hello John Doe,

Welcome to Company Name team! Your account has 
been created by Sarah (HR).

📋 ACCOUNT INFORMATION
Email:    john@company.com
Password: TempPass@123456
Role:     Employee

⚡ IMPORTANT - Next Steps:
1. Log in using your email and password
2. Change your password immediately
3. Complete your profile information
4. Contact manager if needed

🔒 Security Note: Change password immediately!

[Login to ERP System →]

Contact HR for support
```

---

## Quick Examples

### Email Works ✅
```
POST /api/users
↓
Account created ✓
Email sent ✓
Response: { "emailNotification": { "sent": true } }
```

### Email Fails ⚠️
```
POST /api/users
↓
Account created ✓
Email failed (SMTP error)
Response: { "emailNotification": { "sent": false } }
User still created! Admin notified.
```

---

## Configuration Options

| Setting | Example | Purpose |
|---------|---------|---------|
| SMTP_HOST | smtp.gmail.com | Email server |
| SMTP_PORT | 587 | Connection port |
| SMTP_USER | your@gmail.com | Login email |
| SMTP_PASS | app-password | Email password |
| COMPANY_EMAIL | noreply@company.com | From address |
| COMPANY_NAME | Acme Corp | Branding in email |
| FRONTEND_URL | https://erp.acme.com | Link in email |

---

## Email Providers

### Gmail (Recommended)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Not regular password!
```
📌 **Steps:**
1. Enable 2-Factor Authentication in Gmail
2. Generate App Password
3. Use app password in SMTP_PASS

### Outlook
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your@outlook.com
SMTP_PASS=your-password
```

### Others
Ask your email provider for SMTP settings

---

## Monitoring

### Check Email Sent
Look at server logs:
```
✅ Welcome email sent to john@company.com: <message-id>
```

### Check Email Failed
```
❌ Failed to send welcome email to john@company.com: SMTP error
[EMAIL_ERROR] Welcome email failed: {
  recipient: "john@company.com",
  error: "Authentication failed"
}
```

---

## Testing

### Test 1: Create User via API
```bash
curl -X POST http://localhost:5001/api/users \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test@123",
    "role": "USER"
  }'
```

### Test 2: Check Response
Look for:
```json
"emailNotification": {
  "sent": true,
  "message": "Welcome email sent to test@example.com"
}
```

### Test 3: Check Email Inbox
- Look for email from COMPANY_EMAIL
- Subject: "Welcome to [Company] - Your Account is Ready!"
- Contains temporary password for login

---

## Troubleshooting

### Email Not Arriving
❌ **Problem:** User created but no email received
✅ **Solution:** 
1. Check .env SMTP settings
2. Check if SMTP_USER & SMTP_PASS are correct
3. Check email provider spam folder
4. Verify SMTP_HOST is correct

### "Authentication Failed"
❌ **Problem:** SMTP_PASS is wrong
✅ **Solution:** 
1. For Gmail: Use app password, not regular password
2. Verify password has no extra spaces
3. For Outlook: Use full email as SMTP_USER

### Port Connection Error
❌ **Problem:** Can't connect to SMTP server
✅ **Solution:**
1. Check SMTP_PORT (usually 587)
2. Verify SMTP_HOST is correct
3. Check firewall allows outgoing :587

### Email Arrives But Looks Broken
❌ **Problem:** HTML formatting not showing
✅ **Solution:**
1. Email client limitation (not our code)
2. Client supports text version too
3. Try different email client

---

## Security Notes

### Password Handling
- ✅ Temporary password sent in email (one time)
- ✅ User must change immediately after login
- ✅ System enforces password change
- ✅ Passwords hashed in database

### Email Security
- ✅ SMTP uses TLS encryption
- ✅ No passwords in email headers
- ✅ Email content includes security warnings
- ✅ All emails logged for audit trail

### Best Practices
- ✅ Users told not to share passwords
- ✅ Clear instructions to change password
- ✅ 2FA available for extra security
- ✅ HR contact info in email

---

## Features

✅ Automatic welcome email when user created  
✅ Professional HTML template  
✅ Personalized with user details  
✅ Account credentials included  
✅ Next steps instructions  
✅ Security warnings  
✅ Company branding  
✅ Error handling & logging  
✅ Email status in API response  
✅ Activity audit trail  

---

## What User Sees

### Email Subject
```
Welcome to [Company Name] - Your Account is Ready!
```

### Key Email Points
1. **Greeting** - Personalized welcome
2. **Credentials** - Email & password to copy
3. **Role** - What type of account they got
4. **Instructions** - 4 clear next steps
5. **Security** - Must change password
6. **Support** - How to get help
7. **Button** - Link to login

---

## API Response Examples

### Success ✅
```json
{
  "user": {
    "_id": "123...",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "USER"
  },
  "emailNotification": {
    "sent": true,
    "message": "Welcome email sent to john@company.com"
  }
}
```

### Email Failed ⚠️
```json
{
  "user": {
    "_id": "123...",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "USER"
  },
  "emailNotification": {
    "sent": false,
    "message": "Account created but welcome email could not be sent to john@company.com"
  }
}
```

---

## Logs Generated

### Success Log
```
✅ Welcome email sent to john@company.com: <message-id-here>
```

### Error Log
```
❌ Failed to send welcome email to john@company.com: SMTP error message
[EMAIL_ERROR] Welcome email failed: {
  recipient: "john@company.com",
  error: "SMTP error details",
  timestamp: "2026-03-18T10:30:00Z"
}
```

---

## Files Involved

```
server/
├── src/
│   ├── utils/
│   │   └── emailService.js          ← Email templates & sending
│   └── modules/
│       └── users/
│           └── users.controller.js   ← Create user + email
└── .env                              ← Configuration
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **What** | Auto welcome email when user created |
| **Who** | Admin or HR creating accounts |
| **When** | Immediately after account creation |
| **Where** | User's email inbox |
| **Why** | Provide login credentials & setup instructions |
| **How** | SMTP email via configured provider |
| **Status** | ✅ Production Ready |

---

## Need Help?

**Email Not Sent?**
1. Check .env SMTP configuration
2. Verify email credentials
3. Check server logs for errors
4. Create user again, check response

**User Got Email But Can't Login?**
1. Check temporary password is correct
2. Verify user role is not restricted
3. Check if account is active
4. Verify frontend URL is correct

**Want to Test?**
1. Configure SMTP in .env
2. Restart server: `npm start`
3. Create user via API
4. Check response status
5. Wait for email
6. Done! 🎉

---

**Status:** ✅ Ready to Use  
**Difficulty:** Easy (just configure & go)  
**Setup Time:** ~2 minutes  
**Benefits:** Professional onboarding, improved UX, security  

Let's go! 🚀
