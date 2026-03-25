/**
 * Geofencing Utilities
 * Calculate distance between GPS coordinates and validate geofencing rules
 */

const EARTH_RADIUS_METERS = 6371000; // Earth radius in meters
const GEOFENCE_RADIUS_METERS = 50; // 50 meters radius

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Convert to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c; // distance in meters

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if employee location is within geofence radius of company location
 * @param {number} employeeLatitude - Employee's current latitude
 * @param {number} employeeLongitude - Employee's current longitude
 * @param {number} companyLatitude - Company office latitude
 * @param {number} companyLongitude - Company office longitude
 * @returns {object} { isWithinGeofence: boolean, distance: number }
 */
export function isWithinGeofence(
  employeeLatitude,
  employeeLongitude,
  companyLatitude,
  companyLongitude
) {
  // Validate coordinates
  if (
    typeof employeeLatitude !== "number" ||
    typeof employeeLongitude !== "number" ||
    typeof companyLatitude !== "number" ||
    typeof companyLongitude !== "number"
  ) {
    return { isWithinGeofence: false, distance: null, error: "Invalid coordinates" };
  }

  // If company location is not set (0, 0), allow check-in
  if (companyLatitude === 0 && companyLongitude === 0) {
    return {
      isWithinGeofence: true,
      distance: 0,
      message: "Company location not set, allowing check-in",
    };
  }

  const distance = calculateDistance(
    employeeLatitude,
    employeeLongitude,
    companyLatitude,
    companyLongitude
  );

  return {
    isWithinGeofence: distance <= GEOFENCE_RADIUS_METERS,
    distance,
    radius: GEOFENCE_RADIUS_METERS,
  };
}

export { GEOFENCE_RADIUS_METERS };
