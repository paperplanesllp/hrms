/**
 * Convert a Date/ISO timestamp to IST time in 12-hour format.
 * Example output: "10:04 AM"
 */
export function formatIST12Hour(timestamp) {
  if (!timestamp) return "";

  const value = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(value.getTime())) return "";

  const formatted = value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return formatted.replace(/\s?(am|pm)$/i, (match) => match.toUpperCase());
}
