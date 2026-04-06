import { asyncHandler } from "../../utils/asyncHandler.js";
import { markSchema, editAttendanceSchema, adminEditShiftSchema } from "./attendance.schemas.js";
import { markMyAttendance, getMyAttendance, getAllAttendance, editAttendanceHRorAdmin, adminEditShift, editAttendanceById, autoMarkAbsentees, getAttendanceSummaryForToday, recalculateAllAttendance } from "./attendance.service.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { Attendance } from "./Attendance.model.js";
import { createActivityLog } from "../activity/activity.service.js";
import { ROLES } from "../../middleware/roles.js";
import { User } from "../users/User.model.js";

function getTodayDate() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`; // HH:MM
}

async function assertCanEditAttendanceTarget(actor, targetUserId) {
  if (actor.role === ROLES.ADMIN) return;

  if (actor.role !== ROLES.HR) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Forbidden");
  }

  const actorId = String(actor.id);
  const targetId = String(targetUserId || "");

  if (!targetId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Target user is required");
  }

  if (actorId === targetId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "HR cannot edit their own attendance");
  }

  const targetUser = await User.findById(targetId).select("role");
  if (!targetUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target user not found");
  }

  if (targetUser.role !== ROLES.USER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "HR can only edit employee attendance");
  }
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

  // Log activity
  createActivityLog({
    actorId: req.user.id,
    actorName: req.user.name || "Unknown",
    actorRole: req.user.role,
    actionType: "ATTENDANCE_CHECKIN",
    module: "ATTENDANCE",
    description: `${req.user.name || "User"} checked in at ${checkIn}`,
    metadata: { date, checkIn },
    ipAddress: req.ip,
    visibility: "PUBLIC",
  }).catch(() => {});

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

  // Log activity
  createActivityLog({
    actorId: req.user.id,
    actorName: req.user.name || "Unknown",
    actorRole: req.user.role,
    actionType: "ATTENDANCE_CHECKOUT",
    module: "ATTENDANCE",
    description: `${req.user.name || "User"} checked out at ${checkOut}`,
    metadata: { date, checkOut },
    ipAddress: req.ip,
    visibility: "PUBLIC",
  }).catch(() => {});

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
    const targetRecord = await Attendance.findById(recordId).select("userId");
    if (!targetRecord) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Attendance record not found");
    }

    await assertCanEditAttendanceTarget(req.user, targetRecord.userId);

    // Update by record ID
    const doc = await editAttendanceById(recordId, patch);
    res.json({ attendance: doc });
  } else {
    // Original functionality
    const data = editAttendanceSchema.parse(req.body);
    await assertCanEditAttendanceTarget(req.user, data.userId);

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