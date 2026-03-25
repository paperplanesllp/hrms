# Google Maps Configuration for Company Location

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API (optional, for advanced features)

4. Create an API key (Credentials → Create Credentials → API Key)

### 2. Add to Environment Variables

Create a `.env.local` file in the `erp-dashboard` directory:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Google Maps API key.

### 3. Restart Development Server

```bash
npm run dev
```

## Features

✅ **Interactive Map**
- Click anywhere on the map to set company location
- Drag marker to adjust position
- Auto-center on selected location

✅ **Location Input**
- Manual latitude/longitude entry
- Real-time map updates
- GPS "Use Current Location" button

✅ **Visual Feedback**
- Red marker showing selected location
- Map zoom to show geofence area
- Coordinates display in inputs

## Troubleshooting

### Map not loading?
- Check if API key is valid
- Verify Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for errors
- Ensure HTTPS or localhost (development)

### "Default" key errors?
- The component comes with a demo key for testing
- Replace with your own key for production
- Keys are free with $300/month Google Cloud credit

### Permission denied?
- Make sure the browser allows geolocation
- Use "Use Current Location" button to test GPS
- Check location settings on your device
