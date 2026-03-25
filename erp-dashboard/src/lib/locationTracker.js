import { requestGeolocation } from "./geolocation.js";
import api from "./api.js";

let trackingInterval = null;
let isTracking = false;

/**
 * Start tracking user location every 10 seconds
 * Sends updates to backend /users/update-current-location endpoint
 */
export function startLocationTracking() {
  if (isTracking) {
    console.log("📍 Location tracking already active");
    return;
  }

  console.log("📍 Starting location tracking...");
  isTracking = true;

  // Track location immediately on start
  trackLocation();

  // Then track every 10 seconds (10000 ms)
  trackingInterval = setInterval(() => {
    trackLocation();
  }, 10000);
}

/**
 * Fetch and send current location to backend
 */
async function trackLocation() {
  try {
    const location = await requestGeolocation();
    
    // Send location to backend via /users/location/update endpoint
    await api.post("/users/location/update", {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
    });

    console.log("📍 Location updated:", {
      lat: location.latitude,
      lon: location.longitude,
      accuracy: location.accuracy,
    });
  } catch (error) {
    console.warn("⚠️  Location tracking error:", error.message);
    // Continue tracking even if one update fails
  }
}

/**
 * Stop tracking user location
 */
export function stopLocationTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    isTracking = false;
    console.log("📍 Location tracking stopped");
  }
}

/**
 * Check if location tracking is active
 */
export function isLocationTrackingActive() {
  return isTracking;
}
