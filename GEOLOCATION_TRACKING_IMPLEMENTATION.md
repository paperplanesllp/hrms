## Geolocation Tracking Implementation Summary

### Overview
Automatic geolocation tracking has been implemented to update user latitude and longitude every 10 seconds after login for both HR and regular employees.

### Changes Made

#### 1. **Frontend - Geolocation Tracking Hook**
**File**: `src/lib/useGeolocationTracker.js`
- Updated to use new `/users/location/update` endpoint
- Updates every 10 seconds with real geolocation data
- Tracks for HR and EMPLOYEE roles
- Includes user ID, latitude, longitude, accuracy, and timestamp
- Silently handles errors to avoid notification spam

**File**: `src/App.jsx`
- Already contains the tracker hook call on app load
- Automatically tracks all authenticated users

#### 2. **Backend - User Model Updates**
**File**: `server/src/modules/users/User.model.js`
- Added real-time location tracking fields:
  - `currentLatitude` - User's current latitude
  - `currentLongitude` - User's current longitude
  - `currentLocationAccuracy` - GPS accuracy in meters
  - `lastLocationUpdate` - Timestamp of last update
  - `isActive` - Flag indicating active session

#### 3. **Backend - New API Endpoint**
**File**: `server/src/modules/users/users.controller.js`
- Added `updateCurrentLocation()` function
- Accepts: latitude, longitude, accuracy, timestamp
- Returns: Updated location data

**File**: `server/src/modules/users/users.routes.js`
- Added route: `POST /users/location/update`
- Protected with `requireAuth` middleware
- Called every 10 seconds from frontend

### How It Works

1. **Login**: When user logs in (HR or Employee)
2. **Automatic Tracking**: App automatically requests geolocation
3. **Initial Update**: First location is sent immediately
4. **Periodic Updates**: Location updates sent every 10 seconds
5. **Server Storage**: User's location is stored in database with:
   - Latitude/Longitude coordinates
   - GPS accuracy
   - Last update timestamp
   - Active status

### Data Flow
```
User Login
    ↓
useGeolocationTracker Hook Activated
    ↓
Request Browser Geolocation
    ↓
GET: latitude, longitude, accuracy
    ↓
POST to /users/location/update
    ↓
Server Updates User Document
    (currentLatitude, currentLongitude, etc.)
    ↓
Repeats every 10 seconds
```

### Features
✅ Works for HR and Employee roles
✅ Updates every 10 seconds automatically
✅ Includes GPS accuracy data
✅ Tracks active session status
✅ Silent error handling (no notification spam)
✅ Automatic cleanup on logout
✅ Respects browser geolocation permissions

### API Response Example
```json
{
  "message": "Location updated successfully",
  "location": {
    "latitude": 23.1815,
    "longitude": 79.9864,
    "accuracy": 5.23,
    "lastUpdate": "2026-03-12T10:30:45.123Z"
  }
}
```

### Usage in Admin/HR Dashboard
HR admins can now see real-time location of all active employees in the database:
- Access user's `currentLatitude` and `currentLongitude`
- Check `lastLocationUpdate` for timestamp
- Verify `isActive` status

### Browser Requirements
- Modern browser with Geolocation API support
- User must grant location permission when prompted
- HTTPS recommended for production (geolocation requires secure context)

