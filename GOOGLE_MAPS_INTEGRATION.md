# Google Maps Integration - Company Location Setup

## 🎯 Overview

The Company Settings page now includes an interactive Google Maps integration that allows you to:

✅ **Click** anywhere on the map to set company location  
✅ **Drag** the marker to fine-tune the position  
✅ **Search** for addresses (e.g., "Times Square, NYC" or "1600 Pennsylvania Ave")  
✅ **View** coordinates in real-time  
✅ **Save** location to database for employee geofencing  

---

## 🔧 Setup Instructions

### 1. Get Google Maps API Key

#### Option A: Quick Setup (Demo Key)
The component comes with a demo API key for testing. This key has limited requests/day.

#### Option B: Production Setup (Recommended)

**Step 1: Create Google Cloud Project**
```
1. Go to https://console.cloud.google.com/
2. Click "Select a Project" → "New Project"
3. Name: "ERP Company Location"
4. Click "Create"
```

**Step 2: Enable Required APIs**
```
1. Search for "Maps JavaScript API" → Enable
2. Search for "Geocoding API" → Enable (for address search)
3. Search for "Places API" → Enable (optional, for advanced searches)
```

**Step 3: Create API Key**
```
1. Go to "Credentials" (left sidebar)
2. Click "Create Credentials" → "API Key"
3. Copy the generated API Key
4. (Optional) Restrict key to HTTP referrers: "localhost:*" and your domain
```

**Step 4: Add to .env.local**

In `erp-dashboard` folder, create `.env.local`:
```bash
VITE_GOOGLE_MAPS_API_KEY=your_copied_api_key_here
```

**Step 5: Restart Dev Server**
```bash
cd erp-dashboard
npm run dev
```

---

## 📍 How to Use

### Setting Company Location

**Method 1: Interactive Map**
1. Navigate to **Admin Settings** → **Company Settings**
2. Click anywhere on the map to set location
3. Red marker appears at clicked position
4. Drag marker to fine-tune location
5. Coordinates auto-update in the input fields
6. Click **"Save Location"**

**Method 2: Address Search**
1. Type address in search bar (e.g., "Google HQ, Mountain View" or "1600 Pennsylvania Ave")
2. Click **"Search"** button
3. Map zooms to address location
4. Marker placed automatically
5. Click **"Save Location"**

**Method 3: GPS Detection**
1. Click **"Use Current Location"** button
2. Browser asks for permission
3. Your device's current GPS location is captured
4. Marker placed automatically
5. Coordinates auto-populate
6. Click **"Save Location"**

**Method 4: Manual Input**
1. Type latitude directly in "Latitude" field
2. Type longitude directly in "Longitude" field
3. Map updates to show your coordinates
4. Click **"Save Location"**

---

## 📊 Features Explained

### Map Interactions

| Action | Result |
|--------|--------|
| **Click map** | Red marker placed, zoom to location |
| **Drag marker** | Fine-tune location, coordinates update |
| **Search address** | Geocoding finds address, marker placed |
| **Use GPS button** | Device location captured, marker placed |

### Display Elements

- **Red Marker**: Shows selected company location
- **Blue Zoom Buttons**: Zoom in/out (±)
- **Full Screen Button**: Expand map to full screen
- **Map Type Selector**: Switch between Map/Satellite views
- **Coordinates Display**: Shows exact lat/lon values

### Geofencing Integration

```
Company Location: 28.7041°N, 77.1025°E (Delhi)
Geofence Radius: 30 meters
✓ Employees within 30m can check in
✗ Employees outside 30m cannot check in
```

---

## 🔐 Security & Best Practices

### API Key Protection

✅ **DO:**
- Restrict key to specific domains in Google Cloud Console
- Use environment variables (.env.local)
- Use different keys for development/production
- Monitor API usage in Google Cloud Console

❌ **DON'T:**
- Commit .env.local to git
- Share API key in code/documentation
- Use unrestricted API keys
- Ignore usage quotas

### Quotas & Billing

**Free Tier Includes:**
- 25,000 requests/day for Maps JavaScript API
- 40,000 requests/month for Geocoding API
- $300 monthly credit from Google

**Monitor Usage:**
- Go to Google Cloud Console → Quotas
- Set up billing alerts
- Check "Maps" and "Geocoding" API usage

---

## 🐛 Troubleshooting

### Problem: Map Not Loading

**Solution 1: Check API Key**
```
✓ .env.local exists with VITE_GOOGLE_MAPS_API_KEY
✓ Restart Dev Server (npm run dev)
✓ Check browser console for errors
```

**Solution 2: Verify API Enabled**
```
1. Google Cloud Console
2. APIs & Services → Enabled APIs
3. Search "Maps JavaScript API" → Should show "Enabled"
4. Search "Geocoding API" → Should show "Enabled"
```

**Solution 3: Clear Cache**
```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Problem: Address Search Not Working

**Solution:** Enable Geocoding API
```
1. Google Cloud Console
2. Search "Geocoding API"
3. Click on it → Click "Enable"
4. Wait 1-2 minutes for changes to propagate
5. Refresh page
```

### Problem: "Invalid API Key" Error

**Solution 1:** API Key Restrictions
```
1. Google Cloud Console → Credentials
2. Click API Key → Edit
3. Under "API Restrictions" → Select "Maps JavaScript API"
4. Under "Application Restrictions" → Select "HTTP referrers"
5. Add: localhost:* and your production domain
```

**Solution 2:** Wait for Key Activation
```
New API keys take 5-10 minutes to activate
- If just created, wait and try again
- Hard refresh browser cache
```

### Problem: "Quota Exceeded" Error

**Solution:** Check Usage & Adjust Quota
```
1. Google Cloud Console → Quotas
2. Search "Maps" or "Geocoding"
3. If at limit, increase quota by clicking on it
4. Or wait for daily quota reset (UTC midnight)
```

---

## 📖 File Locations

| File | Purpose |
|------|---------|
| `erp-dashboard/src/components/ui/GoogleMapSelector.jsx` | Map component with search & drag |
| `erp-dashboard/src/features/admin/CompanySettingsPage.jsx` | Main settings page |
| `erp-dashboard/.env.example` | Example environment variables |
| `erp-dashboard/.env.local` | Your API key (CREATE THIS) |
| `GOOGLE_MAPS_SETUP.md` | This file |

---

## 🚀 Example Addresses to Test

```
✓ Times Square, New York, NY
✓ Eiffel Tower, Paris, France
✓ Tokyo Tower, Japan
✓ Sydney Opera House, Australia
✓ Statue of Liberty, New York, NY
✓ 1600 Pennsylvania Ave, Washington DC
✓ Google HQ, Mountain View, CA
✓ Apple Park, Cupertino, CA
```

---

## 📞 Support

**Issues?**
1. Check browser console (F12 → Console tab)
2. Verify API key and permissions
3. Check Google Cloud Console (quotas, enabled APIs)
4. Look at .env.local file exists and has correct key

**Get Help:**
- Google Maps API Documentation: https://developers.google.com/maps/documentation/javascript
- Google Cloud Help: https://cloud.google.com/support
