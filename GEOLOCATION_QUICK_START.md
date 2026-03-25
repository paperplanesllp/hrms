# Geolocation Tracking - Quick Start Guide

## What's New?
Every 10 seconds after a user logs in (HR or Employee), their current geolocation (latitude & longitude) is automatically captured and uploaded to the server.

## For Users

### ✅ What Happens When You Login
1. You'll see a browser permission popup asking for location access
2. Click **"Allow"** to enable tracking
3. Your location is now automatically updated every 10 seconds
4. No manual action needed - it happens in the background

### ⚠️ If You Deny Location Permission
- Tracking won't work
- You can enable it later in browser settings:
  - Chrome: (i) icon → Site settings → Location
  - Firefox: Preferences → Privacy → Permissions → Location
  - Safari: Settings → Privacy → Location Services

## For HR/Admin Users

### View Employee Locations
Get real-time location of all active employees:

**Via API**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/users/location/active
```

**Data Returned**:
```json
{
  "employees": [
    {
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

## System Details

### Update Frequency
- **Every 10 seconds** for all logged-in users
- Happens automatically in the background
- Stops when user logs out

### Data Captured
- **Latitude**: GPS latitude coordinate
- **Longitude**: GPS longitude coordinate 
- **Accuracy**: GPS accuracy in meters (typically 5-50m)
- **Timestamp**: When location was captured

### Database Storage
User document now includes:
```javascript
{
  currentLatitude: 23.1815,      // User's current latitude
  currentLongitude: 79.9864,     // User's current longitude
  currentLocationAccuracy: 5.23, // GPS accuracy in meters
  lastLocationUpdate: Date,      // Last update timestamp
  isActive: true                 // Whether user is currently logged in
}
```

## Common Questions

### Q: Is my location stored permanently?
**A**: Yes, the latest location is stored. Historical data is not kept by default.

### Q: Can I disable location tracking?
**A**: Yes, deny permission in browser settings when prompted.

### Q: What if I move around during the day?
**A**: Your location updates automatically every 10 seconds - it will always show your current position.

### Q: Does this affect battery/data usage?
**A**: Minimal impact. Silent background updates use very little battery since GPS runs for ~1 second every 10 seconds.

### Q: Can HR track me when I'm logged out?
**A**: No. Tracking stops immediately when you log out.

### Q: What if location is unavailable (indoor/GPS disabled)?
**A**: System will keep retrying every 10 seconds. No error notifications shown.

## Testing It Out

### 1. Open Two Browser Windows
- Window 1: Login as Employee
- Window 2: Login as HR

### 2. Check Location Updates
```bash
# In terminal, run this every few seconds:
curl -s -H "Authorization: Bearer HR_TOKEN" \
  http://localhost:5000/api/users/location/active | jq '.employees[0].lastLocationUpdate'
```

### 3. Watch the Timestamp Change
You'll see it updates every ~10 seconds

## API Endpoints

### Update Location (Called Automatically)
```
POST /users/location/update
Authorization: Bearer ACCESS_TOKEN

Body: {
  "latitude": 23.1815,
  "longitude": 79.9864,
  "accuracy": 5.23,
  "timestamp": "2026-03-12T10:30:45.123Z"
}
```

### Get Active Employee Locations (HR/Admin Only)
```
GET /users/location/active
Authorization: Bearer ACCESS_TOKEN
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Location not updating | Check browser permission granted |
| "Invalid latitude" error | Geolocation API failed - check GPS/WiFi |
| Can't see employee locations | Must be logged in as HR or Admin |
| Inaccurate location | Wait a few seconds for GPS fix (accuracy ~5-20m) |
| Tracking stopped | Check if still logged in |

## For Developers

### Frontend Hook
```javascript
// Already active in App.jsx - no changes needed!
import useGeolocationTracker from './lib/useGeolocationTracker.js';

export default function App() {
  useGeolocationTracker(); // Auto-tracks HR & Employee users
  return <Layout />;
}
```

### Backend Integration
```javascript
// Check user's latest location
const user = await User.findById(userId);
console.log(user.currentLatitude, user.currentLongitude);
console.log(user.lastLocationUpdate); // When was it updated?
console.log(user.isActive); // Is user currently logged in?
```

## Next Steps

1. **Test the system** by logging in and checking location updates
2. **Monitor employee locations** via HR dashboard
3. **Set up notifications** for geofence alerts (future feature)
4. **Integrate with maps** to show live employee positions

---

**Need help?** Check `GEOLOCATION_DEVELOPER_GUIDE.md` for detailed technical documentation.

