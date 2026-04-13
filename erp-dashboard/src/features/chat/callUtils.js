const FINAL_STATUSES = new Set(["missed", "declined", "completed", "cancelled", "unanswered"]);
const CALL_TYPES = new Set(["voice", "video"]);

const LEGACY_STATUS_MAP = {
  no_answer: "missed",
  rejected: "declined",
  completed: "completed",
  cancelled: "cancelled",
  busy: "unanswered",
  failed: "unanswered",
  ringing: "unanswered",
  accepted: "unanswered",
  connected: "completed",
  initiated: "unanswered",
};

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const normalizeCallStatus = (data = {}) => {
  const direct = String(data.callStatus || "").toLowerCase();
  if (FINAL_STATUSES.has(direct)) return direct;

  const legacy = String(data.status || "").toLowerCase();
  return LEGACY_STATUS_MAP[legacy] || null;
};

export const normalizeCallType = (data = {}) => {
  const t = String(data.callType || data.type || "").toLowerCase();
  if (!CALL_TYPES.has(t)) return null;
  return t;
};

export const resolveCallDurationSeconds = (data = {}) => {
  const explicit = Number(data.durationSeconds ?? data.duration ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }

  const answeredAt = toDate(data.answeredAt);
  const endedAt = toDate(data.endedAt);
  if (answeredAt && endedAt && endedAt >= answeredAt) {
    return Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000);
  }

  return 0;
};

export const formatCallDuration = (secondsInput) => {
  const seconds = Math.max(0, Math.floor(Number(secondsInput) || 0));
  if (seconds < 60) return `${seconds}s`;

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${String(secs).padStart(2, "0")}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
};

export const getCallTitle = (data = {}) => {
  const callType = normalizeCallType(data);
  const status = normalizeCallStatus(data);

  if (!callType || !status) return "Call";

  if (status === "missed" || status === "unanswered") {
    return `Missed ${callType} call`;
  }
  if (status === "declined") {
    return `Declined ${callType} call`;
  }
  if (status === "cancelled") {
    return `Cancelled ${callType} call`;
  }
  return `${callType === "video" ? "Video" : "Voice"} call`;
};

export const isCompletedCallWithDuration = (data = {}) => {
  const status = normalizeCallStatus(data);
  return status === "completed" && resolveCallDurationSeconds(data) > 0;
};

export const getCallPreviewText = (data = {}) => {
  const base = getCallTitle(data);
  if (!isCompletedCallWithDuration(data)) return base;
  return `${base} · ${formatCallDuration(resolveCallDurationSeconds(data))}`;
};
