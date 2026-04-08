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

/**
 * Format time in IST (Asia/Kolkata) 12-hour format
 * @param {Date|string} date - Date object or date string
 * @returns {string} e.g., "3:15 PM"
 */
export function formatISTTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Format date and time in IST (Asia/Kolkata) 12-hour format
 * @param {Date|string} date - Date object or date string
 * @returns {string} e.g., "08 Apr 2026, 3:15 PM"
 */
export function formatISTDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Format "last seen" or relative time in IST
 * @param {Date|string} date - Date object or date string
 * @returns {string} e.g., "today at 3:15 PM", "yesterday at 9:05 AM"
 */
export function formatLastSeenIST(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const istOptions = { timeZone: 'Asia/Kolkata' };
  
  // Get IST date parts for comparison
  const dIST = new Date(d.toLocaleString('en-US', istOptions));
  const nowIST = new Date(now.toLocaleString('en-US', istOptions));
  
  const dDay = new Date(dIST); dDay.setHours(0,0,0,0);
  const nowDay = new Date(nowIST); nowDay.setHours(0,0,0,0);
  const diffDays = Math.floor((nowDay - dDay) / (24 * 3600000));
  
  const time = formatISTTime(date);
  
  if (diffDays === 0) return `today at ${time}`;
  if (diffDays === 1) return `yesterday at ${time}`;
  
  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  return `${dateStr} at ${time}`;
}

/**
 * Format date only in IST (Asia/Kolkata)
 * @param {Date|string} date - Date object or date string
 * @returns {string} e.g., "08 Apr 2026"
 */
export function formatISTDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}
