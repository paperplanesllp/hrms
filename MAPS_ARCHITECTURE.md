# 🗺️ Google Maps Integration - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Company Settings Page                             │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  GoogleMapSelector Component              ✨ NEW   │  │   │
│  │  │  ┌──────────────────────────────────────────────┐  │  │   │
│  │  │  │ [Address Search Bar]                         │  │  │   │
│  │  │  │   [Search Button]                            │  │  │   │
│  │  │  ├──────────────────────────────────────────────┤  │  │   │
│  │  │  │                                              │  │  │   │
│  │  │  │ [Interactive Google Map]                    │  │  │   │
│  │  │  │  • Click to place marker                    │  │  │   │
│  │  │  │  • Drag to adjust                           │  │  │   │
│  │  │  │  • Red pin shows location                   │  │  │   │
│  │  │  │                                              │  │  │   │
│  │  │  └──────────────────────────────────────────────┘  │  │   │
│  │  │                                                      │  │   │
│  │  │ 💡 Click map, drag marker, or search address       │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  Latitude Input: [________28.7041________]                │   │
│  │  Longitude Input: [________77.1025________]               │   │
│  │                                                            │   │
│  │  [Use Current Location] [Save Location]                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
    ┌─────────────────────────────────────────────────────────┐
    │          Environment Variables (.env.local)             │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │ VITE_GOOGLE_MAPS_API_KEY = AIzaSy...xxxxxx     │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────────────────┐
    │     Google Maps API (JavaScript)                         │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │ Maps API     │  │ Geocoding    │  │ Places API   │  │
    │  │ (Rendering)  │  │ (Address→    │  │ (Optional)   │  │
    │  │              │  │  Coordinates)│  │              │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    └─────────────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────────────────┐
    │         Backend API Endpoints                            │
    │     (No changes required)                               │
    │  ┌──────────────────────────────────────────────────┐  │
    │  │ GET /admin/company-location                      │  │
    │  │   ↓ Retrieves saved company location             │  │
    │  │                                                   │  │
    │  │ POST /admin/company-location                     │  │
    │  │   ↓ Saves latitude, longitude to DB              │  │
    │  └──────────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────────────────┐
    │         MongoDB Database                                │
    │  ┌──────────────────────────────────────────────────┐  │
    │  │ Company Location Document                        │  │
    │  │ {                                                │  │
    │  │   latitude: 28.7041,                             │  │
    │  │   longitude: 77.1025,                            │  │
    │  │   radius: 30,      // geofence in meters         │  │
    │  │   isSet: true,                                   │  │
    │  │   updatedAt: "2026-03-16T10:30:00.000Z"         │  │
    │  │ }                                                │  │
    │  └──────────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────────┘
```

---

## User Interaction Flow

```
┌──────────────┐
│  User Opens  │
│ Admin Panel  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│ Navigate: Admin → Permissions... │
│ → Company Settings              │
└──────┬───────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────────┐
│ Company Settings Page Loads                               │
│ • Loads Google Maps API                                   │
│ • Fetches current location from DB: GET /admin/...        │
│ • Initializes map at current/default location             │
│ • Sets up event listeners (click, drag)                   │
└──────┬─────────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────────────────────────┐
       │                                                     │
       ▼                        ▼                             ▼
   ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
   │ Click Map   │     │ Search       │     │ Use GPS      │
   │             │     │ Address      │     │ Button       │
   └──┬──────────┘     └──┬───────────┘     └──┬───────────┘
      │                   │                     │
      ▼                   ▼                     ▼
   ┌──────────────────────────────────────────────────┐
   │ Get Coordinates                                  │
   │ • Map click: (lat, lng) from event position    │
   │ • Search: Geocoding API converts address→coords │
   │ • GPS: Browser Geolocation API →(lat, lng)     │
   └──────────────┬───────────────────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────────────────┐
   │ Update UI                                        │
   │ • Move marker to new position                    │
   │ • Update Latitude input field                    │
   │ • Update Longitude input field                   │
   │ • Pan/zoom map to new location                   │
   │ • Show visual feedback (marker color/animation) │
   └──────────────┬───────────────────────────────────┘
                  │
          ┌───────┴────────────┐
          │                    │
          ▼                    ▼
    ┌─────────────┐      ┌──────────────┐
    │ User can    │      │ User clicks  │
    │ continue    │      │ Save Button  │
    │ adjusting   │      │              │
    └─────────────┘      └──┬───────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────┐
         │ Validate Coordinates                     │
         │ • Check if both lat & lng are numbers   │
         │ • Check if within valid ranges          │
         │ • (-90 to 90 for lat, -180 to 180 lng)  │
         └──────┬───────────────────────────────────┘
                │
                ▼
         ┌──────────────────────────────────────────┐
         │ POST /admin/company-location             │
         │ {                                        │
         │   latitude: 28.7041,                     │
         │   longitude: 77.1025                     │
         │ }                                        │
         └──────┬───────────────────────────────────┘
                │
                ▼
         ┌──────────────────────────────────────────┐
         │ Server Saves to Database                 │
         │ MongoDB: company-location collection     │
         └──────┬───────────────────────────────────┘
                │
                ▼
         ┌──────────────────────────────────────────┐
         │ Success Response                         │
         │ • Show: "Location saved successfully"    │
         │ • Badge updates: ✓ Set                   │
         │ • Display coordinates in info box        │
         └──────────────────────────────────────────┘
```

---

## Data Flow: Employee Check-In

```
Employee at Office:
30 meters or less from company location
         │
         ▼
    ┌────────────────────────────────┐
    │ Check-In Button Clicked         │
    │ Location: 28.702, 77.103        │
    │ Company: 28.704, 77.102         │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ Calculate Distance (Haversine)  │
    │ Distance = ~250 meters          │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ Check Against Geofence          │
    │ 250 meters ≤ 30 meters?         │
    │ ✗ FALSE → TOO FAR              │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ Mark Check-In FAILED            │
    │ Error: "Outside office radius"  │
    │ Store:                          │
    │ - Attempted location            │
    │ - Distance from office          │
    │ - Timestamp                     │
    └────────────────────────────────┘

---

    If Within 30m:
    ✓ Check-In Successful
    → Update attendance record
    → Store GPS coordinates
    → Log transaction for audit
```

---

## Technology Stack

```
Frontend Layer:
┌─────────────────────────────────┐
│ React Component                 │
│ GoogleMapSelector.jsx           │
│ • useState hooks                │
│ • useEffect hooks               │
│ • useRef for DOM access         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Google Maps JavaScript API      │
│ • google.maps.Map               │
│ • google.maps.Marker            │
│ • google.maps.Geocoder          │
│ • Event listeners               │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Vite Environment Variables      │
│ VITE_GOOGLE_MAPS_API_KEY        │
└─────────────────────────────────┘

Backend Layer:
┌─────────────────────────────────┐
│ Express.js Routes               │
│ admin.routes.js                 │
│ • GET company-location          │
│ • POST company-location         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Controller & Service            │
│ admin.controller.js             │
│ admin.service.js                │
│ • Validation                    │
│ • Business logic                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ MongoDB Database                │
│ • company-location collection   │
│ • Geospatial indexes            │
└─────────────────────────────────┘
```

---

## Environment Configuration

```
Development:
├─ .env.local (CREATE THIS - NOT in git)
│  └─ VITE_GOOGLE_MAPS_API_KEY=demo_key_or_your_key
│
├─ .env.example (Template for reference)
│  └─ VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
│
└─ .gitignore
   └─ *.local ✓ (prevents accidentally committing keys)

Production:
├─ GitHub Secrets / Environment Variables
│  └─ VITE_GOOGLE_MAPS_API_KEY=production_key
│
└─ Deployed with API key injected at build time
```

---

## Security Flow

```
User's Browser:
┌──────────────────────────────────┐
│ API Key sent in request headers  │
│ ONLY to google.com/maps/api      │
└──────────────────────────────────┘
         │
         ▼
Google's Secure Server:
┌──────────────────────────────────┐
│ Validates API Key                │
│ Checks HTTP referrer restrictions│
│ Returns map data                 │
└──────────────────────────────────┘
         │
         ▼
User's Browser:
┌──────────────────────────────────┐
│ Renders map                      │
│ Displays interactive markers     │
│ Processes user input             │
└──────────────────────────────────┘
```

This architecture ensures:
✅ API key never exposed to backend
✅ API key restricted to frontend domain
✅ Geolocation data stays private
✅ Database stores only coordinates
✅ No sensitive data in transit
