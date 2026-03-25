# Geolocation Tracking - Testing Checklist

## Pre-Testing Setup

- [ ] Backend server running: `npm start` (in `/server`)
- [ ] Frontend dev server running: `npm run dev` (in `/erp-dashboard`)
- [ ] Browser's Developer Console open (F12)
- [ ] Network tab visible to see API calls
- [ ] Have Postman or curl ready for API testing

---

## Test Suite 1: Basic Functionality

### Test 1.1: User Login with Location Permission
**Steps**:
1. Open app in browser (http://localhost:5173)
2. Go to login page
3. Enter valid employee credentials
4. Browser will ask: "This site is asking for your location"
5. Click **Allow**

**Expected Results**:
- ✅ Login succeeds
- ✅ Redirected to dashboard
- ✅ Browser asks for location permission
- ✅ Location permission granted
- ✅ Console shows: `[Geolocation] Location updated: 23.1815, 79.9864`

**Status**: [ ] Pass [ ] Fail

---

### Test 1.2: Periodic Location Updates (Every 10 Seconds)
**Steps**:
1. Stay logged in on dashboard
2. Watch browser console
3. Note the timestamps of location updates
4. Wait 30 seconds

**Expected Results**:
- ✅ Console shows location update message every ~10 seconds
- ✅ Timestamps increment by ~10 seconds each time
- ✅ Example pattern:
  - 10:30:05 - Location updated
  - 10:30:15 - Location updated
  - 10:30:25 - Location updated
  - 10:30:35 - Location updated

**Status**: [ ] Pass [ ] Fail

---

### Test 1.3: Location Data in Network Requests
**Steps**:
1. Stay logged in
2. Open DevTools → Network tab
3. Filter for `/location/update`
4. Look at request payload

**Expected Results**:
- ✅ POST requests to `/api/users/location/update`
- ✅ Frequency: appears every ~10 seconds
- ✅ Request body contains:
  ```json
  {
    "latitude": 23.1815,
    "longitude": 79.9864,
    "accuracy": 5.23,
    "timestamp": "2026-03-12T..."
  }
  ```
- ✅ Response status: 200 OK
- ✅ Response contains: `"message": "Location updated successfully"`

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 2: Database Updates

### Test 2.1: User Document Updated with Location
**Steps**:
1. Stay logged in for at least 20 seconds
2. Open MongoDB Compass or terminal
3. Query user collection:
   ```bash
   db.users.findOne({ email: "test@example.com" })
   ```

**Expected Results**:
- ✅ User document has:
  - `currentLatitude`: Valid number (e.g., 23.1815)
  - `currentLongitude`: Valid number (e.g., 79.9864)
  - `currentLocationAccuracy`: Number > 0 (e.g., 5.23)
  - `lastLocationUpdate`: Recent timestamp (within 10 seconds)
  - `isActive`: true

**Status**: [ ] Pass [ ] Fail

---

### Test 2.2: Location Updates Over Time
**Steps**:
1. Note `lastLocationUpdate` timestamp
2. Wait 15 seconds
3. Query database again
4. Check `lastLocationUpdate` timestamp

**Expected Results**:
- ✅ `lastLocationUpdate` is newer (advanced by ~10 seconds)
- ✅ `currentLatitude`/`currentLongitude` may have changed slightly (if GPS updated)

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 3: HR Access to Employee Locations

### Test 3.1: Get Active Employee Locations (HR)
**Steps**:
1. Login as HR user in one tab/window
2. Ensure multiple employees are logged in
3. Run API request:
   ```bash
   curl -H "Authorization: Bearer HR_TOKEN" \
     http://localhost:5000/api/users/location/active
   ```

**Expected Results**:
- ✅ Response status: 200 OK
- ✅ Returns array of active employees with locations:
  ```json
  {
    "employees": [
      {
        "name": "John Doe",
        "email": "john@company.com",
        "currentLatitude": 23.1815,
        "currentLongitude": 79.9864,
        "currentLocationAccuracy": 5.23,
        "lastLocationUpdate": "2026-03-12T10:30:45.123Z",
        "isActive": true
      }
    ],
    "total": 1
  }
  ```

**Status**: [ ] Pass [ ] Fail

---

### Test 3.2: HR Cannot Access via Invalid Token
**Steps**:
1. Run API with invalid/expired token:
   ```bash
   curl -H "Authorization: Bearer INVALID_TOKEN" \
     http://localhost:5000/api/users/location/active
   ```

**Expected Results**:
- ✅ Response status: 401 Unauthorized
- ✅ Cannot get employee locations

**Status**: [ ] Pass [ ] Fail

---

### Test 3.3: Regular Employee Cannot View All Locations
**Steps**:
1. Login as regular employee
2. Run API request:
   ```bash
   curl -H "Authorization: Bearer EMPLOYEE_TOKEN" \
     http://localhost:5000/api/users/location/active
   ```

**Expected Results**:
- ✅ Response status: 403 Forbidden
- ✅ Error message: "Only HR and Admin can view employee locations"

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 4: Permission Handling

### Test 4.1: Deny Location Permission
**Steps**:
1. Open app in new incognito window
2. Go to login
3. Login with valid credentials
4. When browser asks for location: Click **Deny**
5. Watch console

**Expected Results**:
- ✅ Login still succeeds (not blocked)
- ✅ Console shows error warning:
  - `[Geolocation] Failed to update location: Location permission denied`
  - OR similar message
- ✅ No crash or error shown to user
- ✅ Retries every 10 seconds silently

**Status**: [ ] Pass [ ] Fail

---

### Test 4.2: Grant Permission After Deny
**Steps**:
1. From Test 4.1, browser has denied permission
2. Go to browser settings location for the site
3. Find this URL and set location to **Allow**
4. Refresh page
5. Watch console

**Expected Results**:
- ✅ After refresh, location updates resume
- ✅ Console shows: `[Geolocation] Location updated: lat, long`
- ✅ Database updates with new location

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 5: Logout Behavior

### Test 5.1: Tracking Stops on Logout
**Steps**:
1. Login and verify location tracking (watch console)
2. Wait for at least 2 location updates
3. Click **Logout**
4. Wait 30 seconds
5. Watch console for new messages

**Expected Results**:
- ✅ Before logout: See location updates every 10s
- ✅ After logout: No new location messages
- ✅ Interval is cleared properly

**Status**: [ ] Pass [ ] Fail

---

### Test 5.2: Database isActive Flag
**Steps**:
1. User logs in → check DB: `isActive: true`
2. User logs out → query DB after 5 seconds
3. Where applicable, set `isActive: false` manually (optional backend implementation)

**Expected Results**:
- ✅ While logged in: `isActive: true`
- ✅ After logout: Eventually reflects logout (if backend implements it)
- ✅ NextLogin: `isActive: true` again

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 6: Multiple Users

### Test 6.1: Two Employees Simultaneously
**Steps**:
1. Open two browser windows/tabs
2. Tab 1: Login as Employee A
3. Tab 2: Login as Employee B (different user)
4. Both should show location updates
5. HR window: Query active locations

**Expected Results**:
- ✅ Both employees show location updates independently
- ✅ HR response shows both employees:
  ```json
  {
    "employees": [
      { "name": "Employee A", ... },
      { "name": "Employee B", ... }
    ],
    "total": 2
  }
  ```

**Status**: [ ] Pass [ ] Fail

---

### Test 6.2: Employee A Logs Out, Employee B Continues
**Steps**:
1. From Test 6.1: Both logged in
2. Employee A logs out
3. Wait 15 seconds
4. HR queries active locations

**Expected Results**:
- ✅ Employee A logging out doesn't affect Employee B
- ✅ HR response shows only Employee B
- ✅ Employee B continues getting location updates

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 7: Role-Based Access

### Test 7.1: Admin Can View All Locations
**Steps**:
1. Login as Admin
2. Query: `GET /users/location/active`

**Expected Results**:
- ✅ Response status: 200 OK
- ✅ Returns all active employees

**Status**: [ ] Pass [ ] Fail

---

### Test 7.2: Employee Cannot Update Others' Location
**Steps**:
1. Manually craft request as Employee:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer EMPLOYEE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"latitude": 0, "longitude": 0}' \
     http://localhost:5000/api/users/1234/location
   ```

**Expected Results**:
- ✅ Update happens only for authenticated user (their own)
- ✅ Cannot manually update others

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 8: Error Handling

### Test 8.1: Invalid Coordinates Format
**Steps**:
1. Craft invalid request:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"latitude": "invalid", "longitude": 79.9}' \
     http://localhost:5000/api/users/location/update
   ```

**Expected Results**:
- ✅ Response status: 400 Bad Request
- ✅ Error message: "Invalid latitude or longitude"

**Status**: [ ] Pass [ ] Fail

---

### Test 8.2: Out-of-Range Coordinates
**Steps**:
1. Craft request with invalid coords:
   ```bash
   curl -X POST \
     ... \
     -d '{"latitude": 91, "longitude": 200}' \
     ...
   ```

**Expected Results**:
- ✅ Response: Error or silently rejected
- ✅ No crash

**Status**: [ ] Pass [ ] Fail

---

### Test 8.3: Network Error Handling
**Steps**:
1. Disconnect internet while logged in
2. Wait 10 seconds
3. Reconnect internet
4. Wait another 20 seconds

**Expected Results**:
- ✅ User gets error message (optional) or silent retry
- ✅ After reconnect: location updates resume
- ✅ No permanent state corruption

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 9: Performance

### Test 9.1: No Memory Leaks
**Steps**:
1. Login for 5 minutes
2. Open DevTools → Memory tab
3. Take heap snapshot
4. Wait 5 more minutes
5. Take another snapshot
6. Compare

**Expected Results**:
- ✅ Memory grows slightly but doesn't continuously increase
- ✅ No "sawtooth" pattern of object accumulation

**Status**: [ ] Pass [ ] Fail

---

### Test 9.2: CPU Usage (Optional)
**Steps**:
1. Monitor CPU while location tracking active
2. Note CPU usage
3. Logout
4. Note CPU returns to idle

**Expected Results**:
- ✅ Tracking adds minimal CPU impact (~1-2%)
- ✅ CPU drops when logged out

**Status**: [ ] Pass [ ] Fail

---

## Test Suite 10: Edge Cases

### Test 10.1: Rapid Login/Logout
**Steps**:
1. Login
2. Immediately logout (within 5 seconds)
3. Repeat 5 times quickly

**Expected Results**:
- ✅ No errors or crashes
- ✅ Cleanup happens properly

**Status**: [ ] Pass [ ] Fail

---

### Test 10.2: Browser Tab Closed While Active
**Steps**:
1. Login
2. Wait 10 seconds
3. Close browser tab
4. Check server logs

**Expected Results**:
- ✅ Location tracking stops
- ✅ No orphaned processes

**Status**: [ ] Pass [ ] Fail

---

### Test 10.3: Session Timeout
**Steps**:
1. Login
2. Wait for token to expire (if using short expiry in test)
3. Watch console for behavior

**Expected Results**:
- ✅ Request fails with 401
- ✅ Token refresh triggered (if applicable)
- ✅ User redirected to login

**Status**: [ ] Pass [ ] Fail

---

## Test Summary

### Results
- **Total Tests**: 30
- **Passed**: ___
- **Failed**: ___
- **Blocked**: ___

### Overall Status
- [ ] All tests passed - READY FOR PRODUCTION
- [ ] Some tests failed - SEE ISSUES BELOW
- [ ] Critical failures - DO NOT RELEASE

### Issues Found
```
(List any failures here)

1. Issue:
   Expected:
   Actual:
   Solution:

2. Issue:
   Expected:
   Actual:
   Solution:
```

### Sign-Off
- Tested By: _______________
- Date: _______________
- Notes: _______________

---

## Performance Benchmarks (Optional)

| Metric | Expected | Actual |
|--------|----------|--------|
| API Response Time | < 100ms | ___ |
| Memory Used | < 50MB | ___ |
| CPU Impact | < 5% | ___ |
| Update Frequency | Every 10s | ___ |
| Accuracy | ±5-20m | ___ |

---

## Browser Compatibility Test

| Browser | Tested | Result | Notes |
|---------|--------|--------|-------|
| Chrome v120+ | [ ] | [ ] Pass / [ ] Fail | |
| Firefox v121+ | [ ] | [ ] Pass / [ ] Fail | |
| Safari v17+ | [ ] | [ ] Pass / [ ] Fail | |
| Edge v120+ | [ ] | [ ] Pass / [ ] Fail | |

---

## Mobile Testing (Optional)

| Device | OS | Result | Notes |
|--------|----|----|-------|
| iPhone | iOS 17+ | [ ] Pass / [ ] Fail | |
| Android | 11+ | [ ] Pass / [ ] Fail | |

---

## Sign-Off Approval

- [ ] QA Lead Approved
- [ ] Backend Dev Approved
- [ ] Frontend Dev Approved
- [ ] Product Owner Approved

**Ready for Deployment**: [ ] YES [ ] NO

