# Geolocation System - Architecture Overview

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ App.jsx                                                   │ │
│  │ ├─ useGeolocationTracker() [ALWAYS ACTIVE]               │ │
│  │ └─ Triggers on app load                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│  │                                                               │
│  │ (Checks: Is user logged in? HR or Employee role?)            │
│  ↓                                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ useGeolocationTracker.js                                 │ │
│  │                                                           │ │
│  │ ┌─ Initial Location Request (Immediate)                │ │
│  │ ├─ Ask Browser for Permission                          │ │
│  │ │  └─ User Grants Access                               │ │
│  │ ├─ Get latitude, longitude, accuracy                   │ │
│  │ └─ Send to Backend                                     │ │
│  │                                                           │ │
│  │ ┌─ Setup 10-Second Interval                            │ │
│  │ └─ Repeat location capture & send every 10 seconds     │ │
│  └───────────────────────────────────────────────────────────┘ │
│  │                                                               │
│  │ POST /users/location/update                                  │
│  │ {                                                             │
│  │   latitude: 23.1815,                                         │
│  │   longitude: 79.9864,                                        │
│  │   accuracy: 5.23,                                            │
│  │   timestamp: "2026-03-12T10:30:45.123Z"                      │
│  │ }                                                             │
│  │                                                               │
└──┼──────────────────────────────────────────────────────────────┘
   │
   │ HTTPS/API Request
   │
┌──┼──────────────────────────────────────────────────────────────┐
│  │              BACKEND (Node.js + MongoDB)                      │
│  │                                                               │
│  ↓                                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ users.routes.js                                         │ │
│  │ ├─ route.post("/location/update", requireAuth, ...)    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  │                                                               │
│  ↓                                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ users.controller.js                                     │ │
│  │ ├─ updateCurrentLocation()                              │ │
│  │ │  ├─ Validate latitude/longitude                       │ │
│  │ │  ├─ Call updateUser service                           │ │
│  │ │  └─ Return success response                           │ │
│  │ │                                                         │ │
│  │ ├─ getActiveLocations()                                 │ │
│  │ │  ├─ Check user is HR/Admin                             │ │
│  │ │  ├─ Query all active employees                         │ │
│  │ │  └─ Return location array                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│  │                                                               │
│  ↓                                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ users.service.js                                        │ │
│  │ └─ updateUser(userId, {                                │ │
│  │     currentLatitude,                                     │ │
│  │     currentLongitude,                                    │ │
│  │     currentLocationAccuracy,                             │ │
│  │     lastLocationUpdate,                                  │ │
│  │     isActive: true                                       │ │
│  │   })                                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│  │                                                               │
│  ↓                                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ MongoDB - User Document                                 │ │
│  │ {                                                         │ │
│  │   _id: ObjectId,                                         │ │
│  │   name: "John Doe",                                      │ │
│  │   email: "john@company.com",                             │ │
│  │   role: "USER",                                          │ │
│  │   currentLatitude: 23.1815,    ◄─── UPDATED             │ │
│  │   currentLongitude: 79.9864,   ◄─── UPDATED             │ │
│  │   currentLocationAccuracy: 5.23,◄─── UPDATED            │ │
│  │   lastLocationUpdate: Date,    ◄─── UPDATED             │ │
│  │   isActive: true               ◄─── UPDATED             │ │
│  │ }                                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                        ↑
                        │
                    REPEATS EVERY
                      10 SECONDS
                        │
                        └─────────────────────────┐
                                                  │
                        ┌─────────────────────────┘
                        │
                        ↑
```

## Timeline - What Happens Every

### Second 0 (Login)
```
User clicks "Login"
    ↓
Credentials verified
    ↓
useGeolocationTracker activated
    ↓
Browser geolocation request #1
```

### Second 0-1
```
Browser asks: "Allow location access?"
    ↓
User clicks: "Allow"
    ↓
GPS location obtained (lat, long, accuracy)
```

### Second 1
```
POST /users/location/update
    ↓
Server: Update User.currentLatitude = 23.1815
        Update User.currentLongitude = 79.9864
        Update User.lastLocationUpdate = now
        Update User.isActive = true
    ↓
Response: ✅ Success
```

### Seconds 2-9
```
(Waiting... no requests)
```

### Second 10
```
Browser geolocation request #2
    ↓
GPS location obtained
    ↓
POST /users/location/update
    ↓
Server: Update User.currentLatitude = 23.1823
        Update User.currentLongitude = 79.9871
        Update User.lastLocationUpdate = now
    ↓
Response: ✅ Success
```

### Seconds 11-19
```
(Waiting... no requests)
```

### Second 20
```
Repeat cycle from Second 10...
```

### On Logout
```
User clicks "Logout"
    ↓
useGeolocationTracker cleanup triggered
    ↓
Interval cleared
    ↓
No more location updates sent
```

## Request/Response Examples

### Request: Update Location
```http
POST /users/location/update HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "latitude": 23.1815,
  "longitude": 79.9864,
  "accuracy": 5.23,
  "timestamp": "2026-03-12T10:30:45.123Z"
}
```

### Response: Location Updated
```http
HTTP/1.1 200 OK
Content-Type: application/json

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

### Request: Get Active Employees (HR Only)
```http
GET /users/location/active HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Response: Active Employees List
```http
HTTP/1.1 200 OK
Content-Type: application/json

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
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@company.com",
      "employeeId": "EMP002",
      "currentLatitude": 23.1820,
      "currentLongitude": 79.9870,
      "currentLocationAccuracy": 8.45,
      "lastLocationUpdate": "2026-03-12T10:30:43.456Z",
      "isActive": true
    }
  ],
  "total": 2,
  "timestamp": "2026-03-12T10:30:50.456Z"
}
```

## Component Interaction Diagram

```
┌──────────────────┐
│   App.jsx        │
│  (React Root)    │
└────────┬─────────┘
         │ useEffect()
         ↓
┌────────────────────────────┐
│ useGeolocationTracker()    │ ◄─── Runs on app load
│ (Location Hook)            │     & user login
└────────┬───────────────────┘
         │ Dependency: user.id
         │
         ├─ Check: user logged in?
         ├─ Check: HR or EMPLOYEE?
         └─ Check: Geolocation supported?
         │
         ↓
┌────────────────────────────┐
│ navigator.geolocation      │ ◄─── Browser API
│ .getCurrentPosition()       │
└────────┬───────────────────┘
         │ Returns
         ↓
    { latitude, 
      longitude, 
      accuracy }
         │
         ↓
┌────────────────────────────┐
│ api.post()                 │
│ /users/location/update    │
└────────┬───────────────────┘
         │ Every 10 seconds
         ↓
┌────────────────────────────┐
│ Backend: Express Endpoint  │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│ MongoDB: Update User Doc   │
│ currentLatitude            │
│ currentLongitude           │
│ lastLocationUpdate         │
│ isActive = true            │
└────────────────────────────┘
```

## Security Flow

```
Frontend Request
    ↓
API Interceptor adds: Authorization: Bearer TOKEN
    ↓
Backend Receives Request
    ↓
requireAuth Middleware:
  ├─ Extract & Verify JWT Token
  ├─ Is token valid? (signature, expiry)
  ├─ Is token not expired?
  └─ Extract user ID from token
    ↓
updateCurrentLocation Handler:
  ├─ Validate latitude/longitude numbers
  ├─ Validate range (-180 to 180 / -90 to 90)
  └─ Update that user's location (only)
    ↓
MongoDB Update
    ↓
Return Success Response
```

## Database Schema

```
User Collection (MongoDB)
├── _id: ObjectId
├── name: String
├── email: String
├── role: String (USER, HR, ADMIN)
├── passwordHash: String
├── officeLatitude: Number (fixed company location)
├── officeLongitude: Number (fixed company location)
├── isCompanyLocation: Boolean
├── currentLatitude: Number ◄─── REALTIME (updated every 10s)
├── currentLongitude: Number ◄─── REALTIME (updated every 10s)
├── currentLocationAccuracy: Number ◄─── GPS accuracy in meters
├── lastLocationUpdate: Date ◄─── When was it last updated?
├── isActive: Boolean ◄─── Is user currently logged in?
├── refreshTokenHash: String
├── createdAt: Date
└── updatedAt: Date
```

## Error Handling Flow

```
Location Update Request
    ↓
┌─────────────────────────────────┐
│ Validation Checks               │
├─────────────────────────────────┤
│ latitude is number?             │
│ longitude is number?            │
│ -90 <= latitude <= 90?          │
│ -180 <= longitude <= 180?       │
└─────────────────────────────────┘
    ↓
   YES
    ↓
┌─────────────────────────────────┐
│ Authorization Checks            │
├─────────────────────────────────┤
│ User authenticated?             │
│ Valid JWT token?                │
└─────────────────────────────────┘
    ↓
   YES
    ↓
Update Database
    ↓
Return 200 OK

---

    NO (Invalid inputs)
    ↓
Return 400 Bad Request
Frontend catches silently

---

    NO (Auth failed)
    ↓
Return 401 Unauthorized
Frontend redirects to login
```

