/**
 * IST (Indian Standard Time) DateTime Utilities
 * All attendance dates and times are in Asia/Kolkata timezone
 * This ensures consistency across the system regardless of server location
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date in IST format (YYYY-MM-DD)
 * @returns {string} Current date in YYYY-MM-DD format in IST
 */
export function getCurrentDateIST() {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = istFormatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Get current time in IST format (HH:MM in 24-hour format)
 * @returns {string} Current time in HH:MM format in IST
 */
export function getCurrentTimeIST() {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = istFormatter.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  return `${hour}:${minute}`;
}

/**
 * Get current datetime in IST (both date and time)
 * @returns {object} { date: "YYYY-MM-DD", time: "HH:MM" }
 */
export function getCurrentDateTimeIST() {
  return {
    date: getCurrentDateIST(),
    time: getCurrentTimeIST()
  };
}

/**
 * Convert a Date object to IST date and time
 * @param {Date} dateObj - JavaScript Date object
 * @returns {object} { date: "YYYY-MM-DD", time: "HH:MM", fullDate: Date object in IST }
 */
export function convertToIST(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return null;
  }

  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = istFormatter.formatToParts(dateObj);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  const second = parts.find((p) => p.type === "second")?.value;

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    fullDateTime: `${year}-${month}-${day} ${hour}:${minute}:${second}`
  };
}

/**
 * Get the start of day (00:00) in IST
 * @param {string} dateStr - Date string in YYYY-MM-DD format (IST)
 * @returns {Date} JavaScript Date object representing start of that day in IST
 */
export function getStartOfDayIST(dateStr) {
  // Parse YYYY-MM-DD and create a UTC date that represents IST midnight
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create UTC date equivalent (IST is UTC+5:30)
  const utcDate = new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
  return utcDate;
}

/**
 * Get the end of day (23:59:59) in IST
 * @param {string} dateStr - Date string in YYYY-MM-DD format (IST)
 * @returns {Date} JavaScript Date object representing end of that day in IST
 */
export function getEndOfDayIST(dateStr) {
  // Parse YYYY-MM-DD and create a UTC date that represents IST 23:59:59
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create UTC date equivalent (IST is UTC+5:30)
  const utcDate = new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999)); // 23:59:59 IST = 18:29:59 UTC
  return utcDate;
}

/**
 * Parse time string (HH:MM) to minutes
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number|null} Minutes since midnight, or null if invalid
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) {
    return null;
  }
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Format time in 12-hour format with AM/PM
 * @param {string} timeStr24 - Time in 24-hour format (HH:MM)
 * @returns {string} Time in 12-hour format (hh:MM AM/PM)
 */
export function formatTo12Hour(timeStr24) {
  if (!timeStr24) return "";
  
  const [hours, minutes] = timeStr24.split(":").map(Number);
  
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

/**
 * Format date in DD-MMM-YYYY format
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Date in DD-MMM-YYYY format (e.g., "07-Apr-2026")
 */
export function formatDateDDMMMYYYY(dateStr) {
  if (!dateStr) return "";
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [year, month, day] = dateStr.split("-").map(Number);
  
  return `${String(day).padStart(2, "0")}-${months[month - 1]}-${year}`;
}

/**
 * Check if a date string is in the past (relative to today IST)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {boolean} True if date is before today
 */
export function isPastDateIST(dateStr) {
  const today = getCurrentDateIST();
  return dateStr < today; // String comparison works for YYYY-MM-DD format
}

/**
 * Check if a date string is today (IST)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {boolean} True if date equals today
 */
export function isTodayIST(dateStr) {
  const today = getCurrentDateIST();
  return dateStr === today;
}
