# "Stay Logged In" - Quick Setup Guide

## What Changed?

**Problem**: Session timeout happened after 7 days regardless of what the user wanted.

**Solution**: Added "Stay logged in" checkbox that extends session to 90 days with secure token rotation.

## Quick Summary

| Feature | Before | After |
|---------|--------|-------|
| Max Session Duration | 7 days (fixed) | 7 days or 90 days (user choice) |
| Logout | Auto after 7 days + manual | Manual logout only |
| Token Expiry | Single token | Rotating tokens (new token each API call) |
| Session Continuation | After page refresh | Continues until 90 days or manual logout |

## Backend Implementation ✅ COMPLETE

All backend changes are already implemented. No additional coding needed on backend.

### What Was Changed:
1. **Token Rotation**: New refresh token on each API call
2. **Extended Expiry**: 90-day cookie expiry when "remember me" is enabled
3. **User Model**: Added `rememberMeEnabled` field
4. **Auth Endpoints**: All auth endpoints (login, signup, temp OTP) support `rememberMe`

## Frontend: Add "Stay Logged In" Checkbox

### Find Your Login Component

Search for your login form file:
- Usually in `erp-dashboard/src/pages/LoginPage.jsx`
- Or `erp-dashboard/src/components/LoginForm.jsx`

### Current Login Form (Example)
```jsx
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    await api.post('/auth/login', {
      email,
      password,
      // ❌ Missing rememberMe!
    });
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Updated Login Form (Add 3 Lines)

```jsx
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // ✅ ADD THIS

  const handleLogin = async (e) => {
    e.preventDefault();
    await api.post('/auth/login', {
      email,
      password,
      rememberMe, // ✅ ADD THIS
    });
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      
      {/* ✅ ADD THIS CHECKBOX */}
      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Stay logged in for 90 days
      </label>
      
      <button type="submit">Login</button>
    </form>
  );
}
```

### Styling Options

#### Option 1: Simple HTML
```jsx
<label style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '10px 0' }}>
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
  />
  <span>Stay logged in for 90 days</span>
</label>
```

#### Option 2: Tailwind CSS
```jsx
<label className="flex items-center gap-2 my-4">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    className="w-4 h-4 accent-blue-600 cursor-pointer"
  />
  <span className="text-sm text-gray-700">Stay logged in for 90 days</span>
</label>
```

#### Option 3: Material-UI (if using MUI)
```jsx
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

<FormControlLabel
  control={
    <Checkbox
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
    />
  }
  label="Stay logged in for 90 days"
/>
```

## Testing

### Test Case 1: Normal Login (7 days)
1. Open login page
2. Enter credentials
3. **Do NOT check** "Stay logged in"
4. Click Login
5. Verify you can access dashboard
6. Expected: Session expires after 7 days

### Test Case 2: Stay Logged In (90 days)
1. Open login page
2. Enter credentials
3. **CHECK** "Stay logged in"
4. Click Login
5. Verify you can access dashboard
6. Close browser window
7. Next day, reopen browser and visit app
8. Expected: You're still logged in (session persists)

### Test Case 3: Manual Logout
1. While logged in, click Logout
2. Expected: Redirected to login page immediately
3. Session cleared (cannot access dashboard)

### Test Case 4: API Error Handling
1. Trigger a 401 error (set invalid token in local storage)
2. Expected: Automatically logged out and redirected to login

## Browser Behavior

With "Stay logged in" enabled:

| Scenario | Result |
|----------|--------|
| Close browser → reopen next day | ✅ Still logged in |
| Switch browser tabs | ✅ Session continues |
| Browser crash/restart | ✅ Still logged in (cookie preserved) |
| Clear cookies manually | ❌ Logged out |
| Wait 90 days without activity | ❌ Session expires |
| Click Logout button | ❌ Logged out immediately |

## Troubleshooting

### Q: Checkbox doesn't appear
**A**: Make sure you added the checkbox component to your login form component

### Q: Session still expires after 7 days even with checkbox checked
**A**: Backend changes may not have been deployed. Verify backend was updated.

### Q: Getting "No refresh token in cookies" error
**A**: Check browser's cookie settings:
- Cookies must be enabled
- Third-party cookies may need to be allowed
- Check Secure flag for HTTPS in production

### Q: Can't update login form
**A**: Search for these files in your project:
```
erp-dashboard/src/pages/LoginPage.jsx
erp-dashboard/src/components/LoginForm.jsx
erp-dashboard/src/features/auth/LoginPage.jsx
```

## Deployment

### Backend
Already implemented ✅
- No additional deployment needed

### Frontend
1. Add checkbox to login form (3-5 lines of code)
2. Push to repository
3. Deploy to staging
4. Test with "Stay logged in" checkbox
5. Deploy to production

## API Documentation

### POST /auth/login

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true  // ← New optional field
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "rememberMe": true,  // ← Confirms setting
  "user": {
    "id": "123",
    "name": "John Doe",
    "role": "EMPLOYEE",
    "email": "user@example.com"
  }
}
```

### POST /auth/refresh

**Response:**
```json
{
  "accessToken": "eyJhbGc...",  
  "refreshToken": "eyJhbGc...",  // ← New token (rotation)
  "rememberMe": true,  
  "user": { ... }
}
```
Cookie is automatically updated by server ✅

## Files Changed

Frontend:
- [ ] `erp-dashboard/src/pages/LoginPage.jsx` (add checkbox) ← **YOU ARE HERE**

Backend:
- ✅ `server/src/modules/auth/auth.service.js` (implemented)
- ✅ `server/src/modules/auth/auth.controller.js` (implemented)
- ✅ `server/src/utils/tokens.js` (implemented)
- ✅ `server/src/modules/users/User.model.js` (implemented)
- ✅ `erp-dashboard/src/lib/api.js` (implemented)

## Support

If still getting the "No refresh token in cookies" error after implementation:

1. Check that `postRefresh` endpoint sets cookie ✅ (already done)
2. Verify `withCredentials: true` in axios config ✅ (already set)
3. Ensure HttpOnly flag is set ✅ (already set in code)
4. Check browser cookie policies

**All backend fixes are complete. Just add the checkbox to your login form!**
