/**
 * Frontend Date/Time Utilities for IST (Indian Standard Time)
 * Complements backend istDateTime.js utilities
 * Ensures consistent formatting across the application
 */

/**
 * Format date from YYYY-MM-DD to DD-MMM-YYYY
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date like "07-Apr-2026"
 */
export function formatDateDDMMMYYYY(dateStr) {
  if (!dateStr) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${String(day).padStart(2, "0")}-${months[month - 1]}-${year}`;
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 * @param {string} time24 - Time in HH:MM format
 * @returns {string} - Time in hh:MM AM/PM format
 */
export function formatTo12Hour(time24) {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

/**
 * Get current date in YYYY-MM-DD format
 * Uses client's local time (not IST conversion - just display)
 * @returns {string} - Date in YYYY-MM-DD format
 */
export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Check if a distance is within the geofence radius (50m)
 * @param {number} distance - Distance in meters
 * @returns {boolean} - True if within geofence
 */
export function isWithinGeofenceRadius(distance) {
  return distance <= 50;
}

/**
 * Format distance as readable string
 * @param {number} distance - Distance in meters
 * @returns {string} - Formatted distance string
 */
export function formatDistance(distance) {
  if (!distance && distance !== 0) return "—";
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(2)}km`;
}
