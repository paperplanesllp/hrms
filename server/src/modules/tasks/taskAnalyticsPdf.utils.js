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

export function formatDuration(hours = 0, minutes = 0) {
  const totalHours = Number(hours) + Number(minutes) / 60;
  if (!Number.isFinite(totalHours) || totalHours <= 0) return "0h";
  if (totalHours < 1) return `${Math.round(totalHours * 60)}m`;
  if (totalHours % 1 === 0) return `${totalHours.toFixed(0)}h`;
  return `${totalHours.toFixed(1)}h`;
}

export function formatDays(days = 0) {
  const d = Number(days);
  if (!Number.isFinite(d)) return "0d";
  if (d === 0) return "0d";
  return `${d} day${d === 1 ? "" : "s"}`;
}

export function getStatusLabel(status) {
  const labels = {
    "completed": "Completed",
    "pending": "Pending",
    "new": "New",
    "in-progress": "In Progress",
    "in_progress": "In Progress",
    "paused": "Paused",
    "on-hold": "On Hold",
    "hold": "On Hold",
    "due-soon": "Due Soon",
    "extended": "Extended",
    "under-review": "Under Review",
    "extension_requested": "Extension Requested",
    "overdue": "Overdue",
    "rejected": "Rejected",
    "cancelled": "Cancelled",
  };
  return labels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown");
}

export function getPriorityLabel(priority) {
  const labels = {
    "LOW": "Low",
    "MEDIUM": "Medium",
    "HIGH": "High",
    "URGENT": "Urgent",
  };
  return labels[priority] || priority || "Medium";
}

export function getStatusTone(status) {
  const tones = {
    "completed": "success",
    "pending": "warning",
    "new": "muted",
    "in-progress": "info",
    "in_progress": "info",
    "paused": "warning",
    "on-hold": "warning",
    "hold": "warning",
    "due-soon": "warning",
    "extended": "info",
    "under-review": "info",
    "extension_requested": "warning",
    "overdue": "danger",
    "rejected": "danger",
    "cancelled": "muted",
  };
  return tones[status] || "muted";
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

export function createDownloadFileName(companyName = "TheHRSaathi", generatedAt = new Date(), memberName = null) {
  const safeCompany = String(companyName || "TheHRSaathi")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "TheHRSaathi";
  
  const safeMember = memberName
    ? String(memberName)
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 20)
    : null;
  
  const date = generatedAt.toISOString().slice(0, 10);
  
  if (safeMember) {
    return `${safeCompany}-${safeMember}-task-analytics-${date}.pdf`;
  }
  
  return `${safeCompany}-task-analytics-${date}.pdf`;
}
