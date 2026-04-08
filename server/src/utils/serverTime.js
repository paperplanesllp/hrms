/**
 * Server Time Utilities
 * 
 * SECURITY CRITICAL:
 * All attendance times MUST be generated on the server.
 * Frontend time is NEVER trusted for recording attendance.
 * 
 * This module provides:
 * - Server-generated current time
 * - IST timezone conversion
 * - Fraud detection by comparing with device time
 */

const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330; // IST is UTC+5:30

/**
 * Get current server time in UTC
 * This is ALWAYS the source of truth for attendance
 * 
 * @returns {Date} - Current Date object (UTC)
 */
export function getServerTime() {
  return new Date();
}

/**
 * Get current date string in IST (YYYY-MM-DD)
 * Uses server time, never frontend time
 * 
 * @returns {string} - Date in format YYYY-MM-DD
 */
export function getServerDateIST() {
  const now = getServerTime();
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
 * Get current time in 24-hour format (HH:MM:SS) in IST
 * Uses server time ONLY
 * 
 * @returns {string} - Time in format HH:MM:SS
 */
export function getServerTimeIST() {
  const now = getServerTime();
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = istFormatter.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  const second = parts.find((p) => p.type === "second")?.value;

  return `${hour}:${minute}:${second}`;
}

/**
 * Get current time in HH:MM format (without seconds) in IST
 * Used for attendance check-in/check-out display
 * 
 * @returns {string} - Time in format HH:MM
 */
export function getServerTimeISTPrecision() {
  const timeStr = getServerTimeIST();
  return timeStr.substring(0, 5); // Get HH:MM
}

/**
 * Convert server Date object to IST readable format
 * Used for display and audit purposes
 * 
 * @param {Date} dateObj - JavaScript Date object (UTC)
 * @returns {object} - { date: "YYYY-MM-DD", time: "HH:MM", displayTime: "hh:MM AM/PM" }
 */
export function convertToIST(dateObj = null) {
  const date = dateObj || getServerTime();
  
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = istFormatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;
  
  // Convert to 12-hour format
  const hourNum = parseInt(hour, 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum % 12 || 12;
  const displayTime = `${String(displayHour).padStart(2, "0")}:${minute} ${ampm}`;

  return {
    date: dateStr,
    time: timeStr,
    displayTime,
    fullISO: date.toISOString()
  };
}

/**
 * FRAUD DETECTION: Compare device time with server time
 * 
 * Returns analysis of time difference
 * If difference > 5 minutes, marks as suspicious
 * 
 * @param {string} deviceTimeStr - Client device time (ISO string or HH:MM format)
 * @returns {object} - { isSuspicious: bool, differenceMinutes: number, analysis: string }
 */
export function detectTimeFraud(deviceTimeStr) {
  if (!deviceTimeStr) {
    return {
      isSuspicious: false,
      reason: "No device time provided",
      differenceSeconds: 0,
      differenceMinutes: 0
    };
  }

  try {
    const serverTime = getServerTime();
    let deviceTime;

    // Try to parse device time
    if (deviceTimeStr.includes("T")) {
      // ISO format
      deviceTime = new Date(deviceTimeStr);
    } else {
      // Assume it's server-sent time, parse carefully
      deviceTime = new Date(deviceTimeStr);
    }

    if (isNaN(deviceTime.getTime())) {
      return {
        isSuspicious: true,
        reason: "Invalid device time format",
        differenceSeconds: 0,
        differenceMinutes: 0
      };
    }

    const differenceSeconds = Math.abs(serverTime - deviceTime) / 1000;
    const differenceMinutes = Math.round(differenceSeconds / 60);

    const isSuspicious = differenceSeconds > 300; // 5 minutes = 300 seconds

    return {
      isSuspicious,
      differenceSeconds: Math.round(differenceSeconds),
      differenceMinutes,
      serverTime: serverTime.toISOString(),
      deviceTime: deviceTime.toISOString(),
      analysis: isSuspicious
        ? `⚠️ SUSPICIOUS: Device time difference is ${differenceMinutes} minutes`
        : `✓ Device time difference: ${differenceMinutes} minutes (acceptable)`,
      reason: isSuspicious ? "Time difference exceeds 5 minutes threshold" : "Within acceptable range"
    };
  } catch (error) {
    return {
      isSuspicious: true,
      reason: `Error parsing device time: ${error.message}`,
      differenceSeconds: 0,
      differenceMinutes: 0
    };
  }
}

/**
 * Format time to 12-hour display format
 * 
 * @param {string} time24 - Time in HH:MM or HH:MM:SS format
 * @returns {string} - Time in hh:MM AM/PM format
 */
export function formatTo12Hour(time24) {
  if (!time24) return "";
  
  const parts = time24.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  
  return `${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
}

/**
 * Parse ISO timestamp to IST display format
 * 
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {object} - { date, time, displayTime }
 */
export function parseISOToIST(isoString) {
  if (!isoString) return null;
  
  try {
    const date = new Date(isoString);
    return convertToIST(date);
  } catch (error) {
    console.error("Error parsing ISO timestamp:", error);
    return null;
  }
}

/**
 * Get difference in seconds between two timestamps
 * Used for calculating worked hours
 * 
 * @param {Date|string} time1 - First timestamp
 * @param {Date|string} time2 - Second timestamp
 * @returns {number} - Difference in seconds
 */
export function getTimeDifferenceSeconds(time1, time2) {
  if (!time1 || !time2) return 0;
  
  const t1 = typeof time1 === "string" ? new Date(time1) : time1;
  const t2 = typeof time2 === "string" ? new Date(time2) : time2;
  
  return Math.abs(t2 - t1) / 1000;
}

/**
 * Convert seconds to hours:minutes:seconds format
 * 
 * @param {number} totalSeconds - Total seconds
 * @returns {string} - Format: "Xh Ym Zs"
 */
export function formatDuration(totalSeconds) {
  if (totalSeconds < 0) return "—";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.length > 0 ? parts.join(" ") : "0s";
}

/**
 * Validate that two times are on the same day (IST)
 * 
 * @param {Date} time1 - First timestamp
 * @param {Date} time2 - Second timestamp
 * @returns {boolean} - True if both times are on same IST date
 */
export function areSameDayIST(time1, time2) {
  const date1 = convertToIST(time1)?.date;
  const date2 = convertToIST(time2)?.date;
  return date1 === date2;
}

/**
 * Get IST midnight (00:00) for a given date
 * 
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Date} - Date object representing midnight IST
 */
export function getISTMidnight(dateStr) {
  // Parse YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create UTC date that represents IST midnight
  // IST is UTC+5:30, so IST midnight = UTC 18:30 previous day
  const utcDate = new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
  return utcDate;
}
