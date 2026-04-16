/**
 * Geolocation Service
 * Use this only for one-time location requests triggered by explicit user actions.
 * Handles requesting user permission and capturing current location.
 * Never use this utility for background tracking or watchPosition flows.
 */

export async function requestGeolocation() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser");
  }

  // Attempt precise GPS first, then fallback to cached/network location for laptops.
  const attempts = [
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    },
    {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 5 * 60 * 1000,
    },
  ];

  let lastError = null;
  for (const options of attempts) {
    try {
      const position = await getCurrentPosition(options);
      const { latitude, longitude, accuracy } = position.coords;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Location data is invalid. Please try again.");
      }

      return {
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6)),
        accuracy: Number.isFinite(accuracy) ? parseFloat(accuracy.toFixed(2)) : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(formatGeolocationError(lastError));
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
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
        return "Location request timed out. Please turn on device location and try again.";
      default:
        return `Location error (code: ${error.code})`;
    }
  }
  return error.message || "Could not access your location.";
}

