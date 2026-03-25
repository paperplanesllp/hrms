# 🗺️ Google Maps - Quick Start (5 Minutes)

## ⚡ TL;DR Setup

### Step 1: Get API Key (2 minutes)
```
1. Go to https://console.cloud.google.com/
2. Create new project: "ERP"
3. Search & Enable: "Maps JavaScript API" and "Geocoding API"
4. Credentials → Create API Key
5. Copy the key
```

### Step 2: Add to Project (1 minute)
```bash
# In erp-dashboard folder, create .env.local:
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here

# Restart dev server:
npm run dev
```

### Step 3: Use It (2 minutes)
```
1. Go to Admin Settings → Company Settings
2. Click map or search for address
3. Drag marker to adjust
4. Click "Save Location"
✅ Done!
```

---

## 🎮 Using the Map

| Want to... | How to do it |
|-----------|-----------|
| **Set location by clicking** | Click anywhere on map, red marker appears |
| **Fine-tune location** | Drag the red marker |
| **Search by address** | Type address, click Search button |
| **Use device GPS** | Click "Use Current Location" button |
| **Manually enter coords** | Type in Latitude/Longitude fields |
| **View other areas** | Use +/- zoom buttons or scroll wheel |

---

## ✨ Features

✅ Interactive map with click-to-select  
✅ Draggable marker for fine adjustments  
✅ Address search with geocoding  
✅ GPS location capture  
✅ Real-time coordinate display  
✅ 30m geofence for employee check-ins  

---

## 🆓 Free Forever

- **Demo API Key**: Works immediately (500 req/day)
- **Production Key**: Free tier has $300/month Google Cloud credit
- **No credit card** required for free tier

---

## ❓ Not Working?

```
✓ API Key in .env.local?
✓ Development server restarted?
✓ APIs enabled in Google Cloud?
✓ No browser console errors?

Find detailed help: GOOGLE_MAPS_INTEGRATION.md
```
