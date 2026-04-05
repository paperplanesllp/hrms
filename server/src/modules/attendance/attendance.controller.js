import { asyncHandler } from "../../utils/asyncHandler.js";
import { markSchema, editAttendanceSchema, adminEditShiftSchema } from "./attendance.schemas.js";
import { markMyAttendance, getMyAttendance, getAllAttendance, editAttendanceHRorAdmin, adminEditShift, editAttendanceById, autoMarkAbsentees, getAttendanceSummaryForToday, recalculateAllAttendance } from "./attendance.service.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { Attendance } from "./Attendance.model.js";

function getTodayDate() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`; // HH:MM
}

export const postMarkMine = asyncHandler(async (req, res) => {
  const data = markSchema.parse(req.body || {});
  const date = data.date || getTodayDate();
  
  // Check if user has already checked in today
  const existingAttendance = await Attendance.findOne({
    userId: req.user.id,
    date: date
  });
  
  // Prevent check-in if already checked in today
  if (existingAttendance && existingAttendance.checkIn) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST, 
      "You have already checked in today"
    );
  }
  
  // Use client-provided time if available, otherwise use server time
  const checkIn = data.checkIn || getCurrentTime();
  const doc = await markMyAttendance(
    req.user.id, 
    date, 
    checkIn, 
    data.checkOut,
    data.checkInLatitude,
    data.checkInLongitude
  );
  res.json({ attendance: doc });
});

export const postCheckOut = asyncHandler(async (req, res) => {
  const data = markSchema.parse(req.body || {});
  const date = data.date || getTodayDate();
  
  // Check if user has checked in today
  const existingAttendance = await Attendance.findOne({
    userId: req.user.id,
    date: date
  });
  
  // Prevent check-out without check-in
  if (!existingAttendance || !existingAttendance.checkIn) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST, 
      "Check-in required before checkout"
    );
  }
  
  // Prevent multiple check-outs
  if (existingAttendance.checkOut) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST, 
      "You have already checked out today."
    );
  }
  
  const checkOut = data.checkOut || getCurrentTime();
  const doc = await markMyAttendance(req.user.id, date, data.checkIn, checkOut);
  res.json({ attendance: doc });
});

export const getMine = asyncHandler(async (req, res) => {
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const rows = await getMyAttendance(req.user.id, from, to);
  // Frontend expects the array directly in response.data
  res.json(rows);
});

export const getAll = asyncHandler(async (req, res) => {
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const userId = String(req.query.userId || ""); // Get userId from query params
  const rows = await getAllAttendance(from, to, req.user.role, userId); // Pass userId to service
  res.json(rows);
});

export const patchAttendance = asyncHandler(async (req, res) => {
  const patch = {};
  ["checkIn", "checkOut", "shiftStart", "shiftEnd"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      patch[key] = req.body[key];
    }
  });

  const recordId = req.params.id;
  if (recordId) {
    // Update by record ID
    const doc = await editAttendanceById(recordId, patch);
    res.json({ attendance: doc });
  } else {
    // Original functionality
    const data = editAttendanceSchema.parse(req.body);
    const doc = await editAttendanceHRorAdmin(data.userId, data.date, {
      checkIn: data.checkIn,
      checkOut: data.checkOut
    });
    res.json({ attendance: doc });
  }
});

export const patchShiftAdmin = asyncHandler(async (req, res) => {
  const data = adminEditShiftSchema.parse(req.body);
  const doc = await adminEditShift(data.userId, data.date, data.shiftStart, data.shiftEnd);
  res.json({ attendance: doc });
});

// ============================================
// AUTO-MARK ABSENT ENDPOINTS (ADMIN ONLY)
// ============================================

/**
 * GET /attendance/admin/auto-mark
 * Manually trigger auto-mark absent for staff who didn't check in
 * Useful for testing or manual execution
 */
export const triggerAutoMarkAbsentees = asyncHandler(async (req, res) => {
  console.log('🔄 [ADMIN REQUEST] Triggering auto-mark absent job...');
  
  const result = await autoMarkAbsentees();
  const summary = await getAttendanceSummaryForToday();

  res.json({
    message: "Auto-mark attendance completed",
    autoMarkResult: result,
    attendanceSummary: summary
  });
});

/**
 * GET /attendance/admin/summary
 * Get today's attendance summary
 */
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const summary = await getAttendanceSummaryForToday();
  res.json(summary);
});

/**
 * GET /attendance/by-date
 * Get user's attendance for a specific date
 */
export const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const userId = req.user.id;

  if (!date) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Date parameter is required");
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid date format. Use YYYY-MM-DD");
  }

  const attendance = await Attendance.findOne({ userId, date });

  res.json({
    success: true,
    data: attendance,
    message: attendance ? undefined : "No attendance record found for this date"
  });
});

/**
 * POST /attendance/admin/recalculate
 * Recalculate all attendance records with fixed status/hours calculation
 * This fixes issues like wrong totalHours and incorrect status
 * ADMIN ONLY
 */
export const triggerRecalculateAttendance = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;

  const result = await recalculateAllAttendance(fromDate, toDate);

  res.json({
    success: true,
    data: result,
    message: result.message || "Attendance recalculation completed"
  });
});