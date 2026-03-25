# Geolocation Tracking System - Developer Guide

## Overview
This system provides automatic real-time geolocation tracking for HR and employee users. Every 10 seconds after login, the user's current location (latitude/longitude) is captured and sent to the server.

## Architecture

### Frontend Flow
```
User Login
    ↓
useGeolocationTracker Hook Started
    ↓
Browser Geolocation API Called
    ↓
User Grants Permission
    ↓
latitude, longitude, accuracy captured
    ↓
POST /users/location/update endpoint called
    ↓
Repeats every 10 seconds automatically
    ↓
User Logout/Session Ends
    ↓
Tracking Stopped & Cleaned Up
```

## Files Modified/Created

### Frontend

#### 1. `src/lib/useGeolocationTracker.js` (Modified)
**Purpose**: Main hook that handles periodic geolocation updates
**Key Features**:
- Activates on app load via App.jsx
- Checks user authentication and role
- Requests geolocation every 10 seconds
- Sends data to backend API
- Handles all geolocation errors silently

**Code Snippet**:
```javascript
const updateLocation = async () => {
  const location = await requestGeolocation();
  await api.post('/users/location/update', {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    timestamp: new Date().toISOString(),
  });
};
```

#### 2. `src/lib/geolocation.js` (Existing)
**Purpose**: Browser geolocation API wrapper
- Handles permission requests
- Formats error messages
- Returns latitude, longitude, accuracy

#### 3. `src/App.jsx` (Already Has)
**Purpose**: App root component
```javascript
useGeolocationTracker(); // Hook is already called here
```

### Backend

#### 1. `server/src/modules/users/User.model.js` (Modified)
**New Fields Added**:
```javascript
// Real-time geolocation tracking
currentLatitude: { type: Number, default: null },
currentLongitude: { type: Number, default: null },
currentLocationAccuracy: { type: Number, default: null },
lastLocationUpdate: { type: Date, default: null },
isActive: { type: Boolean, default: false },
```

#### 2. `server/src/modules/users/users.controller.js` (Modified)

**New Function**: `updateCurrentLocation()`
- Endpoint: `POST /users/location/update`
- Auth: Required
- Body Parameters:
  - `latitude` (number, required)
  - `longitude` (number, required)
  - `accuracy` (number, optional)
  - `timestamp` (string, optional)

**Response**:
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

**New Function**: `getActiveLocations()`
- Endpoint: `GET /users/location/active`
- Auth: Required (HR/Admin only)
- Returns: Array of active employees with location data

#### 3. `server/src/modules/users/users.routes.js` (Modified)
**New Routes Added**:
```javascript
// Real-time location update (called every 10 seconds from frontend)
router.post("/location/update", requireAuth, updateCurrentLocation);

// Get active employees' locations (HR & Admin only)
router.get("/location/active", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getActiveLocations);
```

## API Documentation

### Update User Location
**Endpoint**: `POST /users/location/update`
**Authentication**: Required (Any authenticated user)
**Purpose**: Update user's current real-time location (called every 10 seconds)

**Request Body**:
```json
{
  "latitude": 23.1815,
  "longitude": 79.9864,
  "accuracy": 5.23,
  "timestamp": "2026-03-12T10:30:45.123Z"
}
```

**Response Success (200)**:
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

**Response Error (400)**:
```json
{
  "message": "Invalid latitude or longitude"
}
```

### Get Active Employee Locations
**Endpoint**: `GET /users/location/active`
**Authentication**: Required (HR/Admin roles only)
**Purpose**: Retrieve locations of all currently active employees

**Response Success (200)**:
```json
{
  "employees": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@company.com",
      "employeeId": "EMP001",
      "currentLatitude": 23.1815,
      "currentLongitude": 79.9864,
      "currentLocationAccuracy": 5.23,
      "lastLocationUpdate": "2026-03-12T10:30:45.123Z",
      "isActive": true
    }
  ],
  "total": 1,
  "timestamp": "2026-03-12T10:30:50.456Z"
}
```

**Response Error (403)**:
```json
{
  "message": "Only HR and Admin can view employee locations"
}
```

## Usage Examples

### Frontend - Check Current Setup
The geolocation tracking is already active. Users will see browser permission prompt on first load.

### Backend - Query Active Employees
```bash
# Get all active employees' locations
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/users/location/active
```

### Database - Manual Query
```javascript
// Find all active users with location data
db.users.find({
  isActive: true,
  currentLatitude: { $ne: null },
  currentLongitude: { $ne: null }
})
```

## Error Handling

### Frontend Errors
- **Geolocation not supported**: Warning logged, tracking disabled
- **Permission denied**: Silently handled, tracking stops
- **Timeout**: Auto-retry every 10 seconds
- **Network error**: Silently handled, continues attempting

### Backend Errors
- **Invalid coordinates**: Returns 400 Bad Request
- **Unauthorized**: Returns 401 Unauthorized
- **Forbidden (HR/Admin check)**: Returns 403 Forbidden
- **Server error**: Returns 500 Internal Server Error

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Only HR/Admin can view other users' locations
3. **Data Validation**: Latitude/longitude validated as numbers
4. **Rate Limiting**: Consider implementing to prevent abuse
5. **HTTPS**: Recommended for production (geolocation requires secure context)

## Performance Optimization

1. **Batching**: Consider batching multiple location updates in future
2. **Caching**: Use Redis to cache active employee locations
3. **Indexing**: Database indexes on `isActive`, `userId`, `lastLocationUpdate`
4. **Silent Errors**: Prevents UI notification spam

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | Full support |
| Firefox | ✅ | Full support |
| Safari | ✅ | Full support iOS 13+ |
| Edge | ✅ | Full support |
| IE 11 | ❌ | Not supported |

## Testing Checklist

- [ ] Login as Employee - verify location updates every 10 seconds
- [ ] Login as HR - verify location updates + can view employee locations
- [ ] Deny geolocation permission - verify silent handling
- [ ] Logout - verify tracking stops
- [ ] Browser offline - verify reconnection and retry
- [ ] Multiple tabs - verify no duplicate updates
- [ ] Location changes - verify new coordinates captured
- [ ] HR endpoint - verify only shows active employees

## Environment Variables
None required - uses existing API configuration

## Future Enhancements

1. **Geofencing Alerts**: Notify when employee leaves office
2. **Location History**: Store historical location trails
3. **Real-time Map**: Dashboard showing live employee locations
4. **Accuracy Threshold**: Only update if location change > X meters
5. **Battery Optimization**: Reduce update frequency if battery low
6. **WebSocket Integration**: Real-time location streaming

## Troubleshooting

**Issue**: Location not updating
- Check: Is user logged in?
- Check: Is geolocation enabled in browser?
- Check: Is backend running?
- Check: Browser console for errors

**Issue**: "Invalid latitude or longitude" error
- Check: Browser geolocation working?
- Check: API request format correct?

**Issue**: HR cannot see employee locations
- Check: User has HR role?
- Check: Token is valid?
- Check: Employee `isActive` flag true?

