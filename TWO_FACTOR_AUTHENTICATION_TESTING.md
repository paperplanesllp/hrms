# 2FA Implementation - Comprehensive Testing Guide

## Overview
This document provides step-by-step testing procedures for the Two-Factor Authentication (2FA) implementation in the ERP system.

## Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Test Case 1: Normal Login Without 2FA](#test-case-1-normal-login-without-2fa)
3. [Test Case 2: Enable 2FA](#test-case-2-enable-2fa)
4. [Test Case 3: Login with 2FA Enabled](#test-case-3-login-with-2fa-enabled)
5. [Test Case 4: Invalid OTP](#test-case-4-invalid-otp)
6. [Test Case 5: OTP Expiration](#test-case-5-otp-expiration)
7. [Test Case 6: OTP Resend](#test-case-6-otp-resend)
8. [Test Case 7: Disable 2FA](#test-case-7-disable-2fa)
9. [Test Case 8: OTP Rate Limiting](#test-case-8-otp-rate-limiting)
10. [Test Case 9: Remember Me with 2FA](#test-case-9-remember-me-with-2fa)
11. [Database Verification](#database-verification)
12. [Activity Logs Verification](#activity-logs-verification)

---

## Setup & Prerequisites

### Before Testing:
1. **Backend Running**: Ensure backend server is running at `http://localhost:5000`
2. **Frontend Running**: Ensure frontend is running at `http://localhost:5173` (or your configured port)
3. **Database**: MongoDB should be running and connected
4. **Email Service**: SMTP credentials should be configured in `.env`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `COMPANY_EMAIL`

### Test User:
Create a test user or use an existing one:
- Email: `test@example.com`
- Password: `TestPassword123`

### Check Email:
- Monitor email inbox for OTP delivery
- In development, check browser console or server logs for debug OTP

---

## Test Case 1: Normal Login Without 2FA

**Objective**: Verify that normal login works when 2FA is disabled

### Steps:
1. Go to login page: `http://localhost:5173/login`
2. Select "Employee Login" tab
3. Enter test user credentials:
   - Email: `test@example.com`
   - Password: `TestPassword123`
4. Ensure "Stay logged in for 90 days" is unchecked
5. Click "Sign In" button

### Expected Results:
✓ User logs in successfully
✓ Dashboard appears
✓ User info displayed in header
✓ No OTP screen shown
✓ Activity log shows "LOGIN" action

### Failure Cases:
✗ Error if 2FA fields exist but shouldn't
✗ Page not responding
✗ Backend errors in console

---

## Test Case 2: Enable 2FA

**Objective**: Verify user can enable 2FA from security settings

### Steps:
1. Login to the application with test user
2. Navigate to: Profile → My Profile page
3. Scroll to "Two-Factor Authentication (2FA)" section
4. Click "Enable 2FA" button
5. Review confirmation dialog
6. Click "Enable 2FA" in confirmation modal
7. Wait for success notification

### Expected Results:
✓ Success message: "2FA has been enabled successfully"
✓ 2FA status changes to "ENABLED" (green badge)
✓ Button changes to "Disable 2FA" (red)
✓ Activity log records "2FA_ENABLED" action
✓ User database record updated:
  - `twoFactorEnabled` = true
  - `otpCodeHash` = "" (empty)

### Failure Cases:
✗ Error message displayed
✗ Status doesn't update
✗ Modal doesn't appear
✗ No success notification

---

## Test Case 3: Login with 2FA Enabled

**Objective**: Verify complete 2FA login flow

### Steps:
1. Logout from application
2. Go to login page
3. Select "Employee Login" tab
4. Enter credentials:
   - Email: `test@example.com`
   - Password: `TestPassword123`
5. Click "Sign In"

### Expected Results:
✓ OTP verification screen appears
✓ User email displayed: "test@example.com"
✓ 6 OTP input fields shown
✓ Timer displays "Expires in: 05:00" (5 minutes)
✓ "Back to Login" button available
✓ Activity log shows "OTP_SENT" action

### Follow-up:
6. Check email for OTP code (or check console for debug OTP in development)
7. Enter OTP into fields (auto-focuses to next field)
8. Click "Verify OTP" button
9. Wait for success notification

### Expected Results (After OTP Verification):
✓ OTP accepted
✓ Success message: "OTP verified successfully"
✓ Dashboard appears after short delay
✓ User logged in successfully
✓ Activity log shows "OTP_VERIFIED" action
✓ User database record cleared:
  - `otpCodeHash` = ""
  - `otpExpiresAt` = null
  - `otpAttempts` = 0

---

## Test Case 4: Invalid OTP

**Objective**: Verify system handles invalid OTP correctly

### Steps:
1. Go through login with 2FA flow (Steps 1-5 from Test Case 3)
2. OTP screen appears
3. Enter incorrect OTP: `000000`
4. Click "Verify OTP"
5. Observe error message
6. Repeat step 3-4 three more times with different wrong codes
7. On 5th attempt, click verify

### Expected Results (Attempts 1-4):
✓ Error message: "Invalid OTP. X attempts remaining" (where X decreases: 4, 3, 2, 1)
✓ OTP fields cleared
✓ Focus moves to first field
✓ Activity logs record each attempt as "OTP_FAILED"
✓ Database records increased `otpAttempts`

### Expected Results (After 5 Attempts):
✓ Error message: "Too many invalid OTP attempts. Please request a new OTP"
✓ OTP input fields disabled
✓ User must go back and restart login

---

## Test Case 5: OTP Expiration

**Objective**: Verify OTP expires after 5 minutes

### Steps:
1. Go through login with 2FA flow (Steps 1-5 from Test Case 3)
2. OTP screen appears with timer "05:00"
3. **Wait 5 minutes and 10 seconds** OR
   - **Alternative**: Use browser dev tools to manipulate time, or
   - **Alternative**: Check code and manually adjust timeout for testing
4. Try to enter OTP
5. Click "Verify OTP"

### Expected Results:
✓ Error message: "OTP has expired. Please request a new OTP"
✓ OTP fields cleared and disabled
✓ Timer shows "OTP Expired"
✓ Timer section styled in red
✓ Activity log records "OTP_FAILED" with reason: "expired"
✓ Database clears OTP hash

### Note:
For practical testing, you can:
- Use the "Resend OTP" feature to get a new OTP instead of waiting 5 minutes
- Modify the test to check that once expired, fresh OTP cannot be entered

---

## Test Case 6: OTP Resend

**Objective**: Verify resend OTP functionality

### Steps:
1. Go through login with 2FA flow (Steps 1-5 from Test Case 3)
2. OTP screen appears
3. Observe "Resend OTP" button - it should say "Resend in 30s" (disabled)
4. Wait 30 seconds OR click multiple times to verify rate limiting
5. Once enabled, click "Resend OTP"
6. Verify new OTP in email/console

### Expected Results (Before 30 seconds):
✓ "Resend OTP" button disabled with countdown: "Resend in Xs"
✓ Button cannot be clicked
✓ Timer for resend displays correctly

### Expected Results (After 30 seconds):
✓ "Resend OTP" button enabled and clickable
✓ Clicking shows success: "OTP resent to your email"
✓ OTP fields cleared
✓ Countdown resets to "Resend in 30s"
✓ New OTP received in email
✓ New OTP can be verified successfully
✓ Old OTP becomes invalid

### Activity Logs:
✓ New "OTP_SENT" action recorded for resend
✓ Both OTP attempts recorded separately

---

## Test Case 7: Disable 2FA

**Objective**: Verify user can disable 2FA with proper verification

### Prerequisites:
- User logged in with 2FA enabled

### Steps:
1. Navigate to Profile → My Profile
2. Scroll to "Two-Factor Authentication" section
3. Click "Disable 2FA" button
4. Disable 2FA modal appears
5. Enter current password in the password field
6. Click "Send OTP" button
7. Wait for success notification
8. OTP is sent to registered email
9. Enter OTP in 6 input fields
10. Click "Verify & Disable" button

### Expected Results (Password Verification):
✓ Modal title: "Disable Two-Factor Authentication?"
✓ Password input field shown
✓ Error if password is wrong: "Invalid password"
✓ Success notification: "OTP sent to your email for verification"
✓ OTP input section appears
✓ 30-second countdown for resend starts

### Expected Results (OTP Verification):
✓ OTP fields accept digits only
✓ Auto-focus to next field on input
✓ "Verify & Disable" button disabled until all 6 digits entered
✓ Success: "2FA has been disabled successfully"
✓ Status updates to "DISABLED" (red badge)
✓ Button changes back to "Enable 2FA"
✓ Activity log records "2FA_DISABLED" action
✓ Database updated:
  - `twoFactorEnabled` = false
  - All OTP-related fields cleared

### Failure Cases:
✗ Wrong password prevents OTP send
✗ Invalid OTP shows appropriate error
✗ Max attempts (5) blocks further tries
✗ OTP expires after 5 minutes

---

## Test Case 8: OTP Rate Limiting

**Objective**: Verify OTP request rate limiting

### Steps:
1. Go through login with 2FA flow
2. OTP appears on screen
3. Immediately click "Resend OTP" button multiple times (before 30 seconds)
4. Try to click within 30 seconds

### Expected Results:
✓ First resend succeeds
✓ Subsequent clicks within 30 seconds fail with: "Please wait Xs seconds before requesting another OTP"
✓ Countdown timer accurate
✓ Button disabled until 30 seconds pass
✓ After 30 seconds, resend succeeds again
✓ Countdown resets to 30 seconds

### Database Verification:
✓ `otpLastSentAt` timestamp updated on each successful resend
✓ Only valid OTP hash stored (previous OTP becomes invalid)

---

## Test Case 9: Remember Me with 2FA

**Objective**: Verify "Remember Me" works with 2FA

### Steps:
1. Go to login page
2. Enter credentials
3. **Check "Stay logged in for 90 days"** checkbox
4. Enter OTP when prompted
5. Verify login success
6. Close browser tab completely
7. Return to application within 90 days
8. Verify user is still logged in

### Expected Results:
✓ Refresh token cookie set with 90-day expiry
✓ `rememberMeEnabled` = true in database
✓ Automatic login works after browser close
✓ Session persists for 90 days
✓ Activity logs include "Remember Me enabled" in metadata

### Without Remember Me:
1. Repeat steps 1-5 but **don't check** "Stay logged in"
2. Close browser
3. Return to app
4. Verify user is logged out
5. Refresh token expires in 7 days

---

## Database Verification

### Check User Document in MongoDB:

```javascript
db.users.findOne({ email: "test@example.com" })
```

### Expected Fields After 2FA Setup:

```json
{
  "_id": ObjectId("..."),
  "email": "test@example.com",
  "twoFactorEnabled": true,
  "otpCodeHash": "",
  "otpExpiresAt": null,
  "otpAttempts": 0,
  "otpLastSentAt": null,
  "disable2FAOtpHash": "",
  "disable2FAOtpExpiresAt": null,
  "disable2FAOtpAttempts": 0,
  "disable2FAOtpLastSentAt": null,
  "temp2FAToken": "",
  "temp2FATokenExpires": null,
  "refreshTokenHash": "...",
  "rememberMeEnabled": false
}
```

### Verification Checklist:
- [ ] `twoFactorEnabled` is boolean
- [ ] OTP fields are cleared after login
- [ ] `rememberMeEnabled` matches login preference
- [ ] Timestamps are updated correctly
- [ ] Hash values use SHA256 (not plaintext)

---

## Activity Logs Verification

### Check Activity Logs:

```javascript
db.activitylogs.find({ 
  actorId: ObjectId("..."),
  module: "SECURITY"
}).sort({ createdAt: -1 }).limit(20)
```

### Expected Log Entries:

**2FA Enabled:**
```json
{
  "actionType": "2FA_ENABLED",
  "module": "SECURITY",
  "description": "User enabled Two-Factor Authentication",
  "metadata": { "email": "test@example.com" }
}
```

**OTP Sent (Login):**
```json
{
  "actionType": "OTP_SENT",
  "module": "SECURITY",
  "description": "OTP sent to test@example.com for 2FA login",
  "metadata": { "email": "test@example.com" }
}
```

**OTP Verified:**
```json
{
  "actionType": "OTP_VERIFIED",
  "module": "SECURITY",
  "description": "2FA login successful via OTP (Remember Me enabled)",
  "metadata": { "email": "test@example.com", "rememberMe": true }
}
```

**OTP Failed:**
```json
{
  "actionType": "OTP_FAILED",
  "module": "SECURITY",
  "description": "OTP verification failed - Invalid OTP (Attempt 1/5)",
  "metadata": { "email": "test@example.com", "reason": "invalid", "attempts": 1 }
}
```

**OTP Failed - Expired:**
```json
{
  "actionType": "OTP_FAILED",
  "module": "SECURITY",
  "description": "OTP verification failed - OTP expired",
  "metadata": { "email": "test@example.com", "reason": "expired" }
}
```

**2FA Disabled:**
```json
{
  "actionType": "2FA_DISABLED",
  "module": "SECURITY",
  "description": "User disabled Two-Factor Authentication",
  "metadata": { "email": "test@example.com" }
}
```

---

## Email Template Verification

### 2FA Login OTP Email:
Check that email contains:
- ✓ Company name
- ✓ 6-digit OTP prominently displayed
- ✓ Expiry time: "Valid for 5 minutes"
- ✓ Security warning: "Do not share this OTP"
- ✓ User name personalization
- ✓ Professional formatting

### Disable 2FA OTP Email:
Check that email contains:
- ✓ Title indicates it's for disabling 2FA
- ✓ 6-digit OTP prominently displayed
- ✓ Clear warning about the action
- ✓ Expiry information
- ✓ Company branding

---

## API Endpoint Testing

### Test Endpoints with Postman/curl:

#### 1. Enable 2FA
```bash
POST /api/auth/2fa/enable
Authorization: Bearer <access_token>
Content-Type: application/json

Response:
{
  "message": "2FA has been enabled successfully",
  "twoFactorEnabled": true
}
```

#### 2. Get 2FA Status
```bash
GET /api/auth/2fa/status
Authorization: Bearer <access_token>

Response:
{
  "twoFactorEnabled": true,
  "email": "test@example.com"
}
```

#### 3. Request Login OTP
```bash
POST /api/auth/2fa/login/request-otp
Content-Type: application/json

Body:
{
  "userId": "..."
}

Response:
{
  "message": "OTP sent to your email",
  "expiresInSeconds": 300,
  "debugOtp": "123456" (only in dev mode)
}
```

#### 4. Verify Login OTP
```bash
POST /api/auth/2fa/login/verify-otp
Content-Type: application/json

Body:
{
  "userId": "...",
  "otp": "123456",
  "rememberMe": true
}

Response:
{
  "accessToken": "...",
  "user": { ... },
  "rememberMe": true
}
```

#### 5. Request Disable 2FA OTP
```bash
POST /api/auth/2fa/disable/request-otp
Authorization: Bearer <access_token>
Content-Type: application/json

Response:
{
  "message": "OTP sent to your email for verification",
  "expiresInSeconds": 300
}
```

#### 6. Verify Disable 2FA OTP
```bash
POST /api/auth/2fa/disable/verify-otp
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "otp": "123456"
}

Response:
{
  "message": "2FA has been disabled successfully",
  "twoFactorEnabled": false
}
```

---

## Performance & Security Checks

### Performance:
- [ ] OTP generation < 100ms
- [ ] Email sending < 2s
- [ ] OTP verification < 500ms
- [ ] Login flow completes within 30 seconds

### Security:
- [ ] OTP never displayed in network requests (hash only)
- [ ] Password verified server-side before OTP sent
- [ ] Rate limiting enforced (30s between resends)
- [ ] Attempt limiting enforced (5 attempts max)
- [ ] OTP expires after 5 minutes
- [ ] Old OTP invalidated on resend
- [ ] Failed attempts logged for audit
- [ ] No OTP in error messages (only "Invalid OTP")
- [ ] Activity logs record all 2FA actions

---

## Troubleshooting

### Common Issues:

**Issue**: Email not received
- Solution: Check SMTP configuration in `.env`
- Solution: Check email spam folder
- Solution: In dev, check browser console for debug OTP

**Issue**: OTP verification fails
- Solution: Ensure 30+ seconds have passed since OTP sent
- Solution: Try resending OTP
- Solution: Clear browser cache

**Issue**: Cannot disable 2FA
- Solution: Verify password is correct
- Solution: Wait 30 seconds to resend OTP if rate limited
- Solution: Check email for OTP code

**Issue**: Timer not updating
- Solution: Check browser console for errors
- Solution: Verify JavaScript is enabled
- Solution: Try different browser

**Issue**: Activity logs not showing
- Solution: Check user ID in logs matches current user
- Solution: Verify activity logging service is configured
- Solution: Check MongoDB connection

---

## Sign-off Checklist

- [ ] Normal login (without 2FA) works
- [ ] Enable 2FA succeeds
- [ ] Login with 2FA works end-to-end
- [ ] Invalid OTP handled correctly
- [ ] OTP expires correctly
- [ ] OTP resend works
- [ ] Rate limiting enforced
- [ ] Disable 2FA works with OTP verification
- [ ] All activity logs recorded
- [ ] Database records updated correctly
- [ ] Email templates display properly
- [ ] Remember Me works with 2FA
- [ ] No security vulnerabilities
- [ ] Performance acceptable

---

## Notes:

- Always test with multiple user accounts
- Test on different browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices
- Test network conditions (slow 3G, etc.)
- Test with various timezones
- Backup database before mass testing
- Clear cookies between test cases if needed

---

**Last Updated**: April 30, 2026
**Version**: 1.0.0
**Status**: Production Ready
