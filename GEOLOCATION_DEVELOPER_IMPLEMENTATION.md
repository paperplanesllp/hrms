# Geolocation Tracking - Implementation Details for Developers

## System Overview

Every 10 seconds after login, HR and employee users have their geolocation automatically captured and stored in the database. The system works entirely in the background with minimal user interaction.

---

## Code Changes - Line by Line

### 1. Frontend: Hook Implementation

**File**: `src/lib/useGeolocationTracker.js`

```javascript
// Key changes:
// OLD: await api.patch(`/users/${user.id}/update-location`, {...})
// NEW: await api.post('/users/location/update', {
//   latitude, longitude, accuracy, timestamp
// })

// Endpoint changed to POST /users/location/update
// Parameters now include accuracy and timestamp
// Sends real-time location data every 10 seconds
```

**Implementation Details**:
- Hook is imported in `App.jsx` and called on app load
- Uses `useAuthStore` to check if user is logged in
- Checks role is HR or EMPLOYEE
- Calls `requestGeolocation()` from `geolocation.js`
- Posts data every 10 seconds via interval
- Cleans up interval on unmount or logout
- Silent error handling (no user notifications)

### 2. Backend: User Model Schema

**File**: `server/src/modules/users/User.model.js`

```javascript
// ADDED:
currentLatitude: { type: Number, default: null },
currentLongitude: { type: Number, default: null },
currentLocationAccuracy: { type: Number, default: null },
lastLocationUpdate: { type: Date, default: null },
isActive: { type: Boolean, default: false },

// These track REAL-TIME location (updated every 10 seconds)
// Separate from officeLatitude/officeLongitude (fixed company location)
```

**Field Purposes**:
- `currentLatitude`: Current GPS latitude from device
- `currentLongitude`: Current GPS longitude from device
- `currentLocationAccuracy`: GPS accuracy in meters (5-50m typical)
- `lastLocationUpdate`: Timestamp of latest location capture
- `isActive`: Flag for whether user is currently logged in

### 3. Backend: Controller Functions

**File**: `server/src/modules/users/users.controller.js`

```javascript
// ADDED Function 1:
export const updateCurrentLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy, timestamp } = req.body;
  
  // Validate: latitude/longitude are numbers
  // Update User document with new location
  // Return success response
});

// ADDED Function 2:
export const getActiveLocations = asyncHandler(async (req, res) => {
  // Check: user is HR or Admin
  // Query: all Users where isActive=true and has location
  // Return: array of active employees with locations
});

// ADDED Import:
import { User } from "./User.model.js";
```

**Key Points**:
- Takes latitude/longitude/accuracy from request body
- Updates only the requesting user's location (req.user.id)
- HR/Admin can view but not update other users' locations
- Returns formatted location data in response

### 4. Backend: Routes

**File**: `server/src/modules/users/users.routes.js`

```javascript
// ADDED:
router.post("/location/update", requireAuth, updateCurrentLocation);
router.get("/location/active", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getActiveLocations);

// Order matters: Both routes should be after general routes
// to prevent param conflicts with /:id routes
```

---

## Request/Response Flow

### Frontend → Backend Data Flow

```
1. useGeolocationTracker Hook
   └─ Triggered every 10 seconds

2. navigator.geolocation.getCurrentPosition()
   └─ Returns { latitude, longitude, accuracy, timestamp }

3. api.post('/users/location/update', {
     latitude: 23.1815,
     longitude: 79.9864,
     accuracy: 5.23,
     timestamp: "2026-03-12T10:30:45.123Z"
   })
   
4. Axios interceptor adds JWT token
   └─ Authorization: Bearer TOKEN

5. Node.js Express Server receives request

6. requireAuth middleware
   └─ Verifies JWT token, extracts user.id

7. updateCurrentLocation controller
   └─ Validates lat/long, updates User document

8. MongoDB update operation
   └─ db.users.updateOne(
        { _id: userId },
        {
          currentLatitude: 23.1815,
          currentLongitude: 79.9864,
          currentLocationAccuracy: 5.23,
          lastLocationUpdate: Date,
          isActive: true
        }
      )

9. Response sent back:
   └─ { message, location: {...} }
```

---

## Data Storage

### Sample User Document (MongoDB)

```json
{
  "_id": ObjectId("6487e123abc456def789"),
  "name": "John Doe",
  "email": "john@company.com",
  "role": "USER",
  "employeeId": "EMP001",
  
  "currentLatitude": 23.1815,
  "currentLongitude": 79.9864,
  "currentLocationAccuracy": 5.23,
  "lastLocationUpdate": ISODate("2026-03-12T10:30:45.123Z"),
  "isActive": true,
  
  "officeLatitude": 23.18,
  "officeLongitude": 79.99,
  "isCompanyLocation": true,
  
  "profileImageUrl": "...",
  "passwordHash": "...",
  "refreshTokenHash": "...",
  "createdAt": ISODate("2025-01-15T..."),
  "updatedAt": ISODate("2026-03-12T...")
}
```

### MongoDB Query Examples

```javascript
// Find user's current location
db.users.findOne(
  { _id: userId },
  { currentLatitude: 1, currentLongitude: 1, lastLocationUpdate: 1 }
)

// Find all active employees with locations
db.users.find({
  role: "USER",
  isActive: true,
  currentLatitude: { $ne: null },
  currentLongitude: { $ne: null }
})

// Find employees within distance (using geospatial query - future enhancement)
db.users.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [79.9864, 23.1815]
      },
      $maxDistance: 1000 // 1km
    }
  }
})
```

---

## Error Handling

### Frontend Error Cases

```javascript
// Case 1: Geolocation not supported
if (!navigator.geolocation) {
  console.warn('Geolocation not supported');
  return; // Exit silently
}

// Case 2: Permission denied by user
navigator.geolocation.getCurrentPosition(
  success,
  (error) => {
    // error.code === 1 = Permission denied
    console.warn('Location permission denied');
    // Retry will happen automatically every 10 seconds
  }
)

// Case 3: Network error on POST request
api.post('/users/location/update', {...})
  .catch((err) => {
    console.warn('Location update failed:', err.message);
    // Silent catch - continues to retry every 10 seconds
  })
```

### Backend Error Cases

```javascript
// Case 1: Invalid latitude/longitude
if (typeof latitude !== "number" || typeof longitude !== "number") {
  throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid latitude or longitude");
}
// Returns: 400 Bad Request

// Case 2: User not authenticated
// requireAuth middleware catches this
// Returns: 401 Unauthorized

// Case 3: User tries to view all locations without HR role
if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
  throw new ApiError(StatusCodes.FORBIDDEN, "Only HR and Admin can view employee locations");
}
// Returns: 403 Forbidden
```

---

## Security Implementation

### Authentication Flow

```
Request comes in
    ↓
api.interceptors.request.use() [axios interceptor]
    ├─ Get stored JWT token from localStorage
    ├─ Add to headers: Authorization: Bearer TOKEN
    └─ Send request

Server receives request
    ↓
requireAuth middleware
    ├─ Extract token from Authorization header
    ├─ Verify signature using secret key
    ├─ Check token expiry
    ├─ Extract user.id from token payload
    ├─ Attach user to req.user
    └─ Continue to route handler

Route handler processes request
    ├─ Has access to req.user.id
    └─ Update only that user's location

If token invalid or expired:
    ├─ api.interceptors.response.use() catches 401
    ├─ Attempts token refresh via /auth/refresh
    ├─ If refresh fails → redirect to /login
    └─ User must login again
```

### Authorization Flow

```
getActiveLocations endpoint
    ↓
Check: req.user.role === HR || req.user.role === ADMIN
    ├─ YES: Return employee locations
    └─ NO: Return 403 Forbidden error
```

---

## Performance Considerations

### Request Frequency
```
6 requests per minute (1 per 10 seconds)
× 24 hours = 8,640 requests/day per user
× 100 users = 864,000 requests/day
× 1KB per request ≈ 864MB daily network traffic
```

**Optimization** (if needed):
- Batch multiple locations in one request
- Use WebSocket for real-time streaming
- Add request deduplication (don't send if location hasn't changed significantly)

### Database Impact
```
Index recommendations:
- db.users.createIndex({ isActive: 1 })
- db.users.createIndex({ lastLocationUpdate: 1 })
- db.users.createIndex({ role: 1, isActive: 1 })
```

### Memory Impact
```
Per user: ~100-200 bytes for location data
100 users: ~20KB
1000 users: ~200KB
Negligible impact on server memory
```

---

## Testing Strategies

### Unit Tests (Frontend Hook)

```javascript
// Test: Hook initializes on user login
// Test: Hook calls getCurrentPosition()
// Test: Hook posts location every 10 seconds
// Test: Hook cleanups on unmount
// Test: Hook handles permission denied
// Test: Hook handles network errors
```

### Integration Tests (Backend API)

```javascript
// Test: POST /users/location/update updates database
// Test: GET /users/location/active returns active users
// Test: Invalid coordinates return 400
// Test: Unauthorized returns 401
// Test: Non-HR cannot view locations (403)
```

### End-to-End Tests

```javascript
// Test: User logs in → location tracked every 10s
// Test: HR logs in → can view employee locations
// Test: Employee logs out → tracking stops
// Test: Multiple users tracked simultaneously
```

---

## Debugging Tips

### Frontend Debugging

```javascript
// Enable detailed logging in useGeolocationTracker
console.log('[DEBUG] User logged in:', user);
console.log('[DEBUG] Fetching location...');
console.log('[DEBUG] Location obtained:', location);
console.log('[DEBUG] Sending to server:', payload);

// Check network tab in DevTools
// Look for POST /users/location/update requests
// Verify response status is 200
// Check response body has "Location updated successfully"
```

### Backend Debugging

```javascript
// Add logging in users.controller.js
console.log('[DEBUG] Received location update from user:', req.user.id);
console.log('[DEBUG] Coordinates:', latitude, longitude);
console.log('[DEBUG] Before update:', user.currentLatitude);
console.log('[DEBUG] After update:', updatedUser.currentLatitude);

// Check MongoDB logs
// Verify document was updated with new fields
```

### Database Debugging

```javascript
// Check if user document has location fields
db.users.findOne({ _id: userId })

// Monitor real-time updates
db.users.watch([{ $match: { operationType: "update", "updateDescription.updatedFields.currentLatitude": { $exists: true } } }])

// Check lastLocationUpdate timestamp
db.users.findOne({ _id: userId }, { lastLocationUpdate: 1 })
// Should show recent timestamp (within 10 seconds of current time)
```

---

## Deployment Checklist

- [ ] Backend API endpoint working: POST /users/location/update
- [ ] Backend API endpoint working: GET /users/location/active
- [ ] User model has all location fields (currentLatitude, etc.)
- [ ] Frontend hook is imported in App.jsx
- [ ] Frontend hook is called on app load
- [ ] Navigation doesn't break with new endpoints
- [ ] Authentication works on new endpoints
- [ ] Authorization is enforced (HR-only on getActiveLocations)
- [ ] Database indexes created for performance
- [ ] Error handling working silently
- [ ] 10-second interval confirmed in production
- [ ] All edge cases tested
- [ ] Documentation reviewed by team

---

## Future Enhancements

### Short Term
1. Add real-time map visualization
2. Set up geofence alerts (notify when employee leaves office)
3. Add location history archival
4. Create HR dashboard with employee map

### Medium Term
1. WebSocket for real-time location streaming
2. Accuracy-based update filtering
3. Battery optimization (reduce frequency when battery low)
4. Integration with maps API

### Long Term
1. Historical route tracking
2. Route optimization for field staff
3. Location-based work assignments
4. Predictive analytics

---

## Support & Maintenance

### Regular Maintenance
- Monitor database indexes performance
- Archive old location data (implement retention policy)
- Review API response times
- Check server CPU/memory usage

### Issue Resolution
1. Check console for errors (frontend)
2. Check server logs (backend)
3. Verify database connection
4. Confirm user authentication
5. Test with fresh browser session
6. Review network tab for API failures

---

## Code Quality

### Standards Used
- ESLint configuration from project
- Axios interceptors for request handling
- Express middleware for auth
- MongoDB for persistence
- Error codes from http-status-codes

### Naming Conventions
- camelCase for variables/functions
- UpperCase for constants
- Descriptive names (currentLatitude not lat)
- Consistent naming across frontend/backend

---

## Documentation Maintenance

> This document should be updated when:
> - API contract changes
> - Database schema changes
> - Front-end implementation changes
> - New features added
> - Bugs found and fixed

Keep this in sync with actual implementation.

