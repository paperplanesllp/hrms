import { Worksheet } from "./Worksheet.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

// Helper: Get current time in Indian Standard Time (IST = UTC+5:30)
function getISTTime() {
  const now = new Date();
  // Add IST offset (UTC+5:30 = 5.5 hours = 330 minutes)
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  return istTime;
}

// Helper: Get formatted time string in IST (HH:MM)
function getFormattedISTTime() {
  const istTime = getISTTime();
  const hours = String(istTime.getHours()).padStart(2, "0");
  const minutes = String(istTime.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Helper: Convert time string (HH:MM) to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

// Helper: Convert minutes to time string (HH:MM)
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Helper: Calculate duration between two time strings
function calculateDuration(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end >= start ? end - start : (24 * 60) - start + end;
}

export async function createWorksheet(userId, data) {
  const currentTime = getFormattedISTTime();
  
  const doc = await Worksheet.create({
    userId,
    date: data.date,
    task: data.task,
    hours: data.hours,
    notes: data.notes || "",
    startTime: data.startTime || currentTime,
    status: "active",
    currentSessionStart: data.startTime || currentTime,
    interruptions: [],
    totalActiveTime: 0,
    totalPausedTime: 0,
  });
  return doc;
}

export async function listUserWorksheets(userId) {
  const rows = await Worksheet.find({ userId }).sort({ date: -1 });
  return rows;
}

export async function getWorksheetByDate(userId, date) {
  // Validate date format (YYYY-MM-DD)
  if (!date) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Date parameter is required");
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid date format. Use YYYY-MM-DD");
  }

  const doc = await Worksheet.findOne({ userId, date });
  return doc;
}

export async function updateWorksheet(docId, userId, data) {
  const doc = await Worksheet.findById(docId);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  if (doc.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  if (data.task) doc.task = data.task;
  if (data.hours !== undefined) doc.hours = data.hours;
  if (data.notes !== undefined) doc.notes = data.notes;

  await doc.save();
  return doc;
}

export async function deleteWorksheet(docId, userId) {
  const doc = await Worksheet.findById(docId);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  if (doc.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  await Worksheet.deleteOne({ _id: docId });
}

// NEW: Pause work
export async function pauseWorksheet(docId, userId, reason = "") {
  const doc = await Worksheet.findById(docId);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  if (doc.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  if (doc.status === "paused") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Work is already paused");
  }

  const pausedAt = getFormattedISTTime();
  const istTime = getISTTime();

  // Calculate active time in this session
  if (doc.currentSessionStart) {
    const sessionDuration = calculateDuration(doc.currentSessionStart, pausedAt);
    doc.totalActiveTime += sessionDuration;
  }

  doc.status = "paused";
  doc.interruptions.push({
    pausedAt,
    pausedTime: istTime,
    resumedAt: null,
    resumedTime: null,
    reason: reason || "Work paused",
    duration: 0,
  });

  await doc.save();
  return doc;
}

// NEW: Resume work
export async function resumeWorksheet(docId, userId, interruptionReason = "") {
  const doc = await Worksheet.findById(docId);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  if (doc.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  if (doc.status === "active") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Work is already active");
  }

  const resumedAt = getFormattedISTTime();
  const istTime = getISTTime();

  // Update the last interruption
  if (doc.interruptions.length > 0) {
    const lastInterruption = doc.interruptions[doc.interruptions.length - 1];
    lastInterruption.resumedAt = resumedAt;
    lastInterruption.resumedTime = istTime;
    lastInterruption.duration = calculateDuration(lastInterruption.pausedAt, resumedAt);
    lastInterruption.reason = interruptionReason || lastInterruption.reason;
    doc.totalPausedTime += lastInterruption.duration;
  }

  doc.status = "active";
  doc.currentSessionStart = resumedAt;

  await doc.save();
  return doc;
}

// NEW: Complete work
export async function completeWorksheet(docId, userId) {
  const doc = await Worksheet.findById(docId);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  if (doc.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  if (doc.status === "completed") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Work is already completed");
  }

  const endTime = getFormattedISTTime();

  // Calculate final session time
  if (doc.currentSessionStart && doc.status === "active") {
    const finalSessionDuration = calculateDuration(doc.currentSessionStart, endTime);
    doc.totalActiveTime += finalSessionDuration;
  }

  doc.status = "completed";
  doc.endTime = endTime;

  await doc.save();
  return doc;
}

// NEW: Request time extension
export async function requestTimeExtension(docId, userId, requestedTime, reason) {
  const doc = await Worksheet.findById(docId);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  if (doc.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  // Prevent spam - only allow one request per 5 minutes
  if (doc.lastExtensionRequest) {
    const timeSinceLastRequest = Date.now() - doc.lastExtensionRequest.getTime();
    if (timeSinceLastRequest < 5 * 60 * 1000) { // 5 minutes
      throw new ApiError(StatusCodes.BAD_REQUEST, "Please wait before requesting again");
    }
  }

  if (!requestedTime || requestedTime <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Requested time must be greater than 0");
  }

  if (!reason || reason.trim().length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Please provide a reason for the extension");
  }

  // Automatically increase hours
  doc.hours += Number(requestedTime);

  // Log extension request for audit trail
  doc.timeExtensionRequests.push({
    requestedTime,
    reason: reason.trim(),
    requestedAt: new Date(),
    status: "approved",
  });

  doc.lastExtensionRequest = new Date();

  await doc.save();
  return doc;
}
