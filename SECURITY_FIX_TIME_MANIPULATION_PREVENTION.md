# Security Fix: Time Manipulation Prevention

## Overview
**Status**: ✅ COMPLETE  
**Severity**: CRITICAL (Users could fake attendance times by changing device clock)  
**Solution**: Server-time-only approach - Backend generates all timestamps, frontend cannot send time

## Problem Statement

### Vulnerability
Users could manipulate their attendance records by:
1. Setting their device time to 6:00 AM (early)
2. Checking in at their desired time
3. Backend would accept the frontend-generated time without questioning it
4. Result: Fake attendance records showing correct time-in, regardless of actual devices security

### Root Cause
- Frontend captured `new Date()` and sent `checkIn`/`checkOut` times to backend
- Backend accepted these times without validation
- No time-source authority verification

## Solution Architecture

### Core Security Principle
**Backend is the ONLY source of truth for time.** 

Frontend must:
- ❌ NEVER send `checkIn` or `checkOut` time values
- ✅ Send only GPS coordinates (latitude, longitude, accuracy)
- ✅ Send optional `deviceTime` for fraud detection audit only

Backend must:
- ✅ Generate all timestamps using `getServerTime()`
- ✅ Compare deviceTime vs serverTime (fraud detection)
- ✅ Validate geofence for both check-in AND check-out
- ✅ Flag suspicious time mismatches (>5 minutes difference)

### Implementation Components

#### 1. **Backend: Server Time Utility** (`server/src/utils/serverTime.js`)
```javascript
// Create with 10+ utility functions:
getServerTime()              // Current UTC timestamp (new Date())
getServerDateIST()           // YYYY-MM-DD in IST
getServerTimeISTPrecision()  // HH:MM in IST
convertToIST()               // UTC Date → readable IST format
detectTimeFraud()            // Compare device vs server time (5-min threshold)
formatTo12Hour()             // 24h → 12h conversion
areSameDayIST()              // Date comparison in IST
getISTMidnight()             // Start of day in IST
```

#### 2. **Database Schema** (`server/src/modules/attendance/attendance.schemas.js`)
```javascript
// BEFORE (Insecure):
markSchema = {
  checkIn: string,        // ❌ ACCEPTED from frontend
  checkInLatitude: number,
  checkInLongitude: number
}

// AFTER (Secure):
markSchema = {
  checkInLatitude: number,  // ✅ REQUIRED GPS
  checkInLongitude: number, // ✅ REQUIRED GPS
  checkInAccuracy?: number, // GPS accuracy in meters
  deviceTime?: string       // AUDIT ONLY, never used for official time
  // checkIn field: COMPLETELY IGNORED if sent
}

checkOutSchema = {
  checkOutLatitude: number,  // ✅ REQUIRED
  checkOutLongitude: number, // ✅ REQUIRED
  checkOutAccuracy?: number,
  deviceTime?: string        // AUDIT ONLY
}
```

#### 3. **Controller Updates** (`server/src/modules/attendance/attendance.controller.js`)
```javascript
postMarkMine() {
  // 1. Parse request - only GPS fields accepted
  const data = markSchema.parse(req.body);
  
  // 2. Get server date (NOT from frontend)
  const date = getServerDateIST();
  
  // 3. Fraud detection (if device time provided)
  let fraudAnalysis = detectTimeFraud(data.deviceTime);
  if (fraudAnalysis.isSuspicious) {
    console.warn(`⚠️ FRAUD ALERT: ${fraudAnalysis.analysis}`);
  }
  
  // 4. Validate coordinates required
  if (!data.checkInLatitude || !data.checkInLongitude) {
    throw error("GPS required");
  }
  
  // 5. Call service with server-time-only function
  const doc = await performCheckIn(
    userId, date, lat, lng, accuracy, fraudAnalysis
  );
  
  // 6. Return response with activity log
  return { attendance: doc, isSuspicious: fraudAnalysis?.isSuspicious };
}

postCheckOut() {
  // Same pattern as check-in
  // - Server time only
  // - Fraud detection
  // - Geofence validation
  // - performCheckOut() function call
}
```

#### 4. **Service Layer** (`server/src/modules/attendance/attendance.service.js`)
```javascript
performCheckIn(userId, date, lat, lng, accuracy, fraudAnalysis) {
  // Time generation - ONLY server authority
  const serverTime = getServerTime();        // UTC timestamp
  const checkInTime24 = getServerTimeISTPrecision(); // HH:MM IST
  
  // Validations
  - User exists
  - No duplicate check-in today
  - Geofence validated (50m radius, admin exempt)
  
  // Store in database
  - checkIn: checkInTime24 (HH:MM from server, NOT frontend)
  - checkInTimestamp: serverTime (ISO UTC from server)
  - checkInLatitude/Longitude: from GPS
  - checkInAccuracy: GPS accuracy
  - suspiciousActivity: fraudAnalysis if isSuspicious
  
  return attendance record with server-time-only data
}

performCheckOut() {
  // Same pattern - server time only, never accepts frontend time
}
```

#### 5. **Frontend Updates** (`erp-dashboard/src/features/attendance/AttendancePage.jsx`)
```javascript
// BEFORE (Insecure):
checkIn() {
  const now = new Date();
  const clientCheckInTime = "09:30"; // ❌ Frontend time
  api.post("/attendance/checkin", {
    checkIn: clientCheckInTime,     // ❌ Sends time to backend
    checkInLatitude: location.latitude,
    checkInLongitude: location.longitude
  });
}

// AFTER (Secure):
checkIn() {
  const now = new Date();
  const deviceTime = "09:30"; // For audit only, not official
  
  const res = api.post("/attendance/checkin", {
    checkInLatitude: location.latitude,    // ✅ Coordinates only
    checkInLongitude: location.longitude,
    checkInAccuracy: location.accuracy,
    deviceTime: deviceTime  // ✅ For audit comparison (NOT official time)
  });
  
  // Use server-returned time (official source of truth)
  const serverCheckInTime = res.data.attendance?.checkIn;
  setCheckInTime(serverCheckInTime);
}

checkOut() {
  // Same pattern - server time only
}
```

## Security Features

### 1. **Fraud Detection**
- Compares device time vs server time
- Threshold: >5 minutes difference = SUSPICIOUS
- Logs warnings and stores fraud analysis in database
- Visible in activity logs for admin review

### 2. **Geofence Validation**
- Both check-in AND check-out must be within 50m radius
- Haversine formula for distance calculation
- Admin exempt but locations tracked for audit
- Validates: `officeLatitude`, `officeLongitude` (from admin profile)

### 3. **Duplicate Prevention**
- Cannot check-in twice without checking out first
- Cannot check-out twice
- Backend validates: existing record with checkIn but no checkOut

### 4. **Activity Logging**
- Records check-in/check-out with metadata:
  - Server-generated time (official)
  - Device time (for comparison)
  - GPS coordinates and accuracy
  - Distance from office
  - Fraud detection flag
  - Total hours worked (for checkout)

## Testing & Verification

### Test Case 1: Normal Attendance (Happy Path)
```
1. Employee at office (GPS valid)
2. Check-in button → Sends: latitude, longitude, accuracy, deviceTime
3. Backend receives → Generates server time → Validates geofence
4. Database stores: checkIn="09:30 IST" (server-generated)
5. Response: Success, display server time on UI
Expected: ✅ Check-in recorded with server time
```

### Test Case 2: Time Fraud Attempt
```
1. Employee sets device time to "06:00 AM"
2. At 9:30 AM actual time, clicks check-in
3. Sends: latitude, longitude, accuracy, deviceTime="06:00"
4. Backend: getServerTime() → 9:30 AM
5. detectTimeFraud() → Compares 9:30 - 6:00 = 3.5 hours difference
6. Result: isSuspicious=true, stores fraud analysis
7. Database records: checkIn="09:30 IST" (server time), fraudioAnalysis: {...}
8. Activity log: "Time mismatch detected (3 hours 30 min)"
Expected: ✅ Fraud flagged, server time recorded, fraud visible in logs
```

### Test Case 3: Geofence Violation
```
1. Employee far from office (outside 50m radius)
2. Sends: latitude, longitude (outside radius), accuracy, deviceTime
3. Backend: isWithinGeofence() → distance=200m > 50m
4. Response: Error "You are 200m away from office (50m allowed)"
Expected: ✅ Check-in rejected due to location, not time-related
```

### Test Case 4: Server Time Always Wins
```
1. Employee sends deviceTime="14:00" but server time is 09:30
2. deviceTime is used ONLY for fraud detection
3. Official checkIn stored: "09:30" (server time)
4. Database: checkIn="09:30", suspiciousActivity: {...}
Expected: ✅ Server time recorded, fraud flagged
```

## Modified Files

### Backend Files (✅ Complete)
1. **`server/src/utils/serverTime.js`** (NEW)
   - 10 utility functions for server-time operations
   - Fraud detection logic
   - IST timezone conversion

2. **`server/src/modules/attendance/attendance.schemas.js`**
   - Updated: markSchema (removed checkIn field)
   - Updated: checkOutSchema (removed checkOut field)
   - Policy: Time fields IGNORED if sent

3. **`server/src/modules/attendance/attendance.controller.js`**
   - Updated: postMarkMine() - server-time-only check-in
   - Updated: postCheckOut() - server-time-only check-out
   - Added: Fraud detection alerts
   - Added: Metadata logging

4. **`server/src/modules/attendance/attendance.service.js`**
   - Added: performCheckIn() - server-time-only
   - Added: performCheckOut() - server-time-only
   - Updated: No frontend time accepted

### Frontend Files (✅ Complete)
1. **`erp-dashboard/src/features/attendance/AttendancePage.jsx`**
   - Updated: checkIn() - sends only GPS + deviceTime
   - Updated: checkOut() - sends only GPS + deviceTime
   - Removed: clientCheckInTime sending
   - Removed: clientCheckOutTime sending
   - Uses: server-returned time for display

## Backward Compatibility

Old attendance records are preserved:
- Existing `checkIn` and `checkOut` fields remain in database
- Old records continue to display normally
- Only new records use server-time-only approach
- Edit functionality for HR/Admin still supports manual time entry (for legacy support)

## Verification Checklist

✅ Backend server-time utility created with 10+ functions  
✅ Schemas updated to ignore frontend time fields  
✅ Controller enforces GPS requirement  
✅ Service layer: performCheckIn/performCheckOut use server-time-only  
✅ Fraud detection implemented (5-minute threshold)  
✅ Frontend check-in function updated (doesn't send time)  
✅ Frontend check-out function updated (doesn't send time)  
✅ Both check-in AND check-out require GPS coordinates  
✅ Geofence validation on both endpoints  
✅ Activity logging includes fraud detection data  
✅ All API calls verified (no time-sending remaining)  

## Deployment Notes

1. **No Data Migration Required**
   - Existing records unaffected
   - New records use server-time-only
   - Transparent transition

2. **Testing Before Production**
   - Deploy to staging
   - Test fraud detection with device time manipulation
   - Verify geofence validation still works
   - Monitor activity logs for fraud detection

3. **User Communication**
   - Users need valid GPS enabled for check-in/out
   - Cannot fake times by changing device clock
   - Times always match server (fair for all employees)

## Security Impact

### Improved
✅ Time manipulation completely eliminated  
✅ Geofence validation enforced (both check-in & check-out)  
✅ Fraud detection and alerting system active  
✅ Activity auditing includes fraud analysis  
✅ Admin-only can edit records (with activity logs)  

### Still Protected
✅ Requires valid GPS location (50m radius)  
✅ Prevents duplicate check-in/check-out  
✅ Server generates all official timestamps  
✅ Requires authentication (valid token)  

## Future Improvements

1. **Biometric Verification** - Add fingerprint/face recognition
2. **Photo Capture** - Selfie at check-in location
3. **WiFi Verification** - Ensure office WiFi connected
4. **Enhanced Fraud Scoring** - ML-based anomaly detection
5. **Geofence Management** - Admin UI to configure radii

## References

- [IST DateTime Utility](../utils/istDateTime.js) - First phase IST conversion
- [Server Time Utility](../utils/serverTime.js) - Server-time-only operations
- [Activity Logging System](../modules/activity-log/ACTIVITY_LOGGING_IMPLEMENTATION.md) - Logs fraud detection
- [Geolocation Architecture](../GEOLOCATION_ARCHITECTURE.md) - GPS validation details
