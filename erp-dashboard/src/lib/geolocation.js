/**
 * Geolocation Service
 * Handles requesting user permission and capturing current location
 */

export async function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
          accuracy: parseFloat(accuracy.toFixed(2)),
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        // User denied permission or location service unavailable
        reject(new Error(formatGeolocationError(error)));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0, // Don't use cached location
      }
    );
  });
}

function formatGeolocationError(error) {
  // Handle both GeolocationPositionError and custom errors
  if (error.code !== undefined) {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return "Location permission denied. Please enable location access in browser settings.";
      case 2: // POSITION_UNAVAILABLE
        return "Location information is unavailable. Make sure GPS/location services are enabled.";
      case 3: // TIMEOUT
        return "Location request timed out. Please try again.";
      default:
        return `Location error (code: ${error.code})`;
    }
  }
  return error.message || "Could not access your location.";
}

export function isGeolocationSupported() {
  return !!navigator.geolocation;
}
