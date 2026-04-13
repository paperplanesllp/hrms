const IST_TIMEZONE = "Asia/Kolkata";

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getISTDateParts = (value) => {
  const d = toDate(value);
  if (!d) return null;

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
};

const toDayKey = (value) => {
  const parts = getISTDateParts(value);
  if (!parts) return null;
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

const shiftDayKey = (dayKey, deltaDays) => {
  if (!dayKey) return null;
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  const ny = utc.getUTCFullYear();
  const nm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(utc.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
};

export const formatISTTime = (value) => {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};

export const formatISTDate = (value, options = {}) => {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    ...options,
  }).format(d);
};

export const formatISTDateTime = (value) => {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};

export const formatISTDateLabel = (value) => {
  const d = toDate(value);
  if (!d) return "";

  const todayKey = toDayKey(new Date());
  const dateKey = toDayKey(d);
  if (!todayKey || !dateKey) return "";

  if (dateKey === todayKey) return "Today";
  if (dateKey === shiftDayKey(todayKey, -1)) return "Yesterday";

  const sixDaysBack = shiftDayKey(todayKey, -6);
  if (sixDaysBack && dateKey >= sixDaysBack) {
    return formatISTDate(d, { weekday: "long" });
  }

  return formatISTDate(d, { day: "2-digit", month: "short", year: "numeric" });
};

export const formatISTChatTimestamp = (value) => {
  const d = toDate(value);
  if (!d) return "";

  const todayKey = toDayKey(new Date());
  const dateKey = toDayKey(d);
  if (!todayKey || !dateKey) return "";

  if (dateKey === todayKey) return formatISTTime(d);
  if (dateKey === shiftDayKey(todayKey, -1)) return "Yesterday";

  return formatISTDate(d, { day: "2-digit", month: "short" });
};

export const IST_TIMEZONE_NAME = IST_TIMEZONE;
