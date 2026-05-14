const REPORT_TIME_ZONE = "Asia/Kolkata";

export function clampNumber(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(value, fallback = "N/A") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: REPORT_TIME_ZONE,
  }).format(date);
}

export function formatDateTime(value = new Date(), fallback = "N/A") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: REPORT_TIME_ZONE,
  }).format(date);
}

export function formatHours(value = 0) {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return "0.0h";
  return `${hours.toFixed(1)}h`;
}

export function formatPercent(value = 0) {
  return `${Math.round(clampNumber(value))}%`;
}

export function toHoursFromMs(ms = 0) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value / (1000 * 60 * 60);
}

export function normalizeReportPeriod({ from, to, dateRange = "month" } = {}) {
  const now = new Date();
  const hasExplicitRange = Boolean(from || to);
  let fromDate = from ? new Date(from) : new Date(now);
  let toDate = to ? new Date(to) : now;

  if (Number.isNaN(fromDate.getTime())) fromDate = new Date(now);
  if (Number.isNaN(toDate.getTime())) toDate = new Date(now);

  if (!hasExplicitRange) {
    switch (dateRange) {
      case "week":
        fromDate.setDate(now.getDate() - 7);
        break;
      case "quarter":
        fromDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
      case "month":
      default:
        fromDate.setMonth(now.getMonth() - 1);
        break;
    }
    toDate = now;
  }

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return {
    fromDate,
    toDate,
    label: `${formatDate(fromDate)} - ${formatDate(toDate)}`,
    dateRange: hasExplicitRange ? "custom" : dateRange,
  };
}

export function createDownloadFileName(companyName = "TheHRSaathi", generatedAt = new Date()) {
  const safeCompany = String(companyName || "TheHRSaathi")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "TheHRSaathi";
  const date = generatedAt.toISOString().slice(0, 10);
  return `${safeCompany}-task-analytics-${date}.pdf`;
}
