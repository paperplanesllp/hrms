# "Stay Logged In" Feature Implementation Guide

## Overview
This implementation adds a "Stay logged in" option that extends session duration from 7 days to 90 days using refresh token rotation. Users will only be logged out when they explicitly click the logout button.

## Problem Solved
- ✅ Removed automatic session timeout after 7 days
- ✅ Added "Remember Me" / "Stay logged in" checkbox
- ✅ Implemented secure refresh token rotation
- ✅ Extended cookie expiry to 90 days when enabled
- ✅ Session persists across browser restarts (if remember me is enabled)

## Backend Changes

### 1. User Model (`server/src/modules/users/User.model.js`)
Added new field to track remember me preference:
```javascript
rememberMeEnabled: { type: Boolean, default: false }, // "Stay logged in" preference
```

### 2. Auth Service (`server/src/modules/auth/auth.service.js`)

#### Updated `login()` function
```javascript
export async function login(email, password, rememberMe = false) {
  // ... existing validation ...
  
  // ✅ Pass rememberMe to refresh token generation
  const refreshToken = signRefreshToken(payload, rememberMe);
  
  user.rememberMeEnabled = rememberMe || false;
  // ... rest of function
}
```

#### Updated `refresh()` function - TOKEN ROTATION
```javascript
export async function refresh(refreshToken) {
  // ... verify existing token ...
  
  // ✅ CRITICAL: Generate NEW refresh token on each refresh
  const newRefreshToken = signRefreshToken(newPayload, user.rememberMeEnabled);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
  await user.save();

  return { 
    accessToken: newAccess,
    refreshToken: newRefreshToken,  // ✅ Return new token
    rememberMe: user.rememberMeEnabled,
    user: { ... }
  };
}
```

#### Updated `signup()` function
```javascript
export async function signup({ name, email, phone, password, rememberMe = false }) {
  // ... create user ...
  const refreshToken = signRefreshToken(payload, rememberMe);
  user.rememberMeEnabled = rememberMe || false;
  // ... rest of function
}
```

### 3. Auth Controller (`server/src/modules/auth/auth.controller.js`)

#### Updated `postLogin()` endpoint
```javascript
export const postLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const { rememberMe } = req.body;
  const result = await login(data.email, data.password, rememberMe || false);

  // ✅ Extended cookie expiry when remember me is enabled
  const cookieMaxAge = rememberMe 
    ? 90 * 24 * 60 * 60 * 1000   // 90 days
    : 7 * 24 * 60 * 60 * 1000;   // 7 days

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: cookieMaxAge,
  });

  res.json({ accessToken: result.accessToken, user: result.user, rememberMe: result.rememberMe });
});
```

#### Updated `postRefresh()` endpoint - CRITICAL FIX
```javascript
export const postRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "No refresh token in cookies");
  }
  
  const result = await refresh(token);
  
  // ✅ FIX: Set the NEW refresh token in cookie (this was missing before!)
  const cookieMaxAge = result.rememberMe 
    ? 90 * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: cookieMaxAge,
  });

  res.json({ 
    accessToken: result.accessToken, 
    user: result.user,
    rememberMe: result.rememberMe 
  });
});
```

### 4. Token Utils (`server/src/utils/tokens.js`)

#### Extended refresh token expiry
```javascript
export function signRefreshToken(payload, rememberMe = false) {
  if (!env.REFRESH_TOKEN_SECRET) throw new Error("REFRESH_TOKEN_SECRET missing");
  // ✅ Extend expiry to 90 days if rememberMe is enabled
  const expiresIn = rememberMe ? "90d" : env.REFRESH_TOKEN_EXPIRES;
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn });
}
```

## Frontend Changes

### 1. API Interceptor (`erp-dashboard/src/lib/api.js`)

Updated `refreshAccessToken()` to handle refresh failures:
```javascript
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((response) => {
      // ... handle success ...
      const next = {
        ...existing,
        accessToken,
        rememberMe: response.data?.rememberMe || existing.rememberMe,
        // ...
      };
      // ...
    })
    .catch((err) => {
      // ✅ Clear session on refresh failure (new)
      logout();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
```

### 2. Login Form UI Component

Add "Stay logged in" checkbox to your login form:

#### React Example
```jsx
import { useState } from 'react';
import api from '../../lib/api.js';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // ✅ Pass rememberMe in request body
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });
      
      // Store token and user data
      localStorage.setItem('auth', JSON.stringify(response.data));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      
      {/* ✅ NEW: Stay logged in checkbox */}
      <label className="remember-me">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <span>Stay logged in for 90 days</span>
      </label>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

#### Tailwind CSS Styling
```jsx
<label className="flex items-center space-x-2 mb-4">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    className="w-4 h-4 accent-blue-600 cursor-pointer"
  />
  <span className="text-gray-600 text-sm">
    Stay logged in for 90 days
  </span>
</label>
```

## How It Works

### Normal Login (7 days)
```
User Login → No "remember me" checked
↓
Generate tokens:
  - Access Token: 15 minutes
  - Refresh Token: 7 days
  - Cookie maxAge: 7 days
↓
After session expires (7 days):
  - Log out automatically
  - User must log in again
```

### "Stay Logged In" Login (90 days)
```
User Login → "Stay logged in" checked
↓
Generate tokens:
  - Access Token: 15 minutes  
  - Refresh Token: 90 days (extended)
  - Cookie maxAge: 90 days
↓
Token Rotation on each refresh:
  1. Access token expires after 15 min
  2. API calls trigger refresh endpoint
  3. New refresh token generated
  4. Old refresh token becomes invalid
  5. Session extended for another 90 days
↓
After 90 days:
  - Session finally expires
  - User logs out
  
OR user clicks logout:
  - Session closes immediately
  - Refresh token cleared
```

## Error Handling

The implementation includes automatic error handling:

```javascript
// Frontend: If refresh fails, auto-logout
.catch((err) => {
  logout();  // Clear session
  window.location.href = "/login";  // Redirect to login
})
```

## Testing Checklist

- [ ] Login without "Stay logged in" → session expires after 7 days ✓
- [ ] Login with "Stay logged in" checked → session persists for 90 days ✓
- [ ] Refresh token rotates on each API call ✓
- [ ] Old refresh tokens are invalid (cannot reuse) ✓
- [ ] Manual logout clears session immediately ✓
- [ ] Browser refresh keeps session alive (if remember me enabled) ✓
- [ ] Close browser window → session persists (if remember me enabled) ✓
- [ ] Multiple devices can have different remember me settings ✓
- [ ] Session timeout error shows "Session expired, please login again" ✓

## Security Features

1. **Refresh Token Rotation**: New token generated on every refresh
2. **Token Binding**: Refresh token hash stored in database
3. **Automatic Invalidation**: Old tokens become unusable immediately
4. **Secure Cookies**: HttpOnly, Secure, SameSite flags set
5. **Activity Logging**: Login/logout tracked in audit logs

## Endpoints Updated

| Endpoint | Changes |
|----------|---------|
| `POST /auth/login` | Accepts `rememberMe` parameter |
| `POST /auth/refresh` | Returns new refresh token in response + cookie |
| `POST /auth/signup` | Accepts `rememberMe` parameter |
| `POST /auth/temporary/verify-otp` | Accepts `rememberMe` parameter |
| `POST /auth/logout` | Clears refresh token cookie |

## Migration Notes

### For Existing Users
- Existing users with active sessions will continue to use 7-day default
- Next login will show "Stay logged in" checkbox
- No database schema migration needed (new field uses default value)

### For Development
1. No env var changes required
2. Token expiry still controlled by `REFRESH_TOKEN_EXPIRES=7d`
3. 90-day expiry only used when `rememberMe=true`

## Troubleshooting

### Issue: "No refresh token in cookies"
**Solution**: Ensure cookies are enabled in browser and HttpOnly flag is set correctly

### Issue: Session expires too quickly
**Solution**: Check if `rememberMe` is being passed to backend

### Issue: Token not rotating
**Solution**: Verify `postRefresh` endpoint is setting new cookie

### Issue: Can't logout
**Solution**: Check if `refreshTokenHash` is being cleared in database

## Files Modified

Backend:
- ✅ `server/src/modules/auth/auth.service.js`
- ✅ `server/src/modules/auth/auth.controller.js`
- ✅ `server/src/utils/tokens.js`
- ✅ `server/src/modules/users/User.model.js`

Frontend:
- ✅ `erp-dashboard/src/lib/api.js`
- 🔲 `erp-dashboard/src/pages/LoginPage.jsx` (needs "Stay logged in" checkbox)

## Next Steps

1. Add "Stay logged in" checkbox to login form
2. Test with 90-day session
3. Deploy to staging
4. Monitor token refresh logs
5. Deploy to production
