import { asyncHandler } from "../../utils/asyncHandler.js";
import { markSchema, checkOutSchema } from "./attendance.schemas.js";
import { 
  performCheckIn, 
  performCheckOut, 
  getMyAttendance, 
  getAllAttendance, 
  editAttendanceHRorAdmin, 
  adminEditShift, 
  editAttendanceById, 
  autoMarkAbsentees, 
  getAttendanceSummaryForToday, 
  recalculateAllAttendance 
} from "./attendance.service.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { Attendance } from "./Attendance.model.js";
import { createActivityLog } from "../activity/activity.service.js";
import { ROLES } from "../../middleware/roles.js";
import { User } from "../users/User.model.js";
import { 
  getServerDateIST, 
  getServerTimeISTPrecision,
  detectTimeFraud 
} from "../../utils/serverTime.js";

/**
 * SECURITY: All time values are generated server-side only.
 * Frontend time is NEVER used for recording attendance.
 * Only geolocation coordinates are accepted from frontend.
 */

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

async function resolveCoordinatesFromPayloadOrTrackedLocation({
  userId,
  latitude,
  longitude,
  accuracy,
  actionLabel,
}) {
  if (latitude !== undefined && longitude !== undefined) {
    return { latitude, longitude, accuracy: accuracy ?? null, source: "request" };
  }

  const trackedUser = await User.findById(userId).select(
    "currentLatitude currentLongitude currentLocationAccuracy lastLocationUpdate"
  );

  if (
    trackedUser &&
    trackedUser.currentLatitude !== null &&
    trackedUser.currentLongitude !== null
  ) {
    return {
      latitude: trackedUser.currentLatitude,
      longitude: trackedUser.currentLongitude,
      accuracy: trackedUser.currentLocationAccuracy ?? accuracy ?? null,
      source: "tracked",
    };
  }

  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `Location coordinates are required for ${actionLabel}. Please enable GPS and wait for live location sync.`
  );
}

/**
 * POST /attendance/checkin
 * 
 * Check-in endpoint with server-side time generation
 * 
 * SECURITY:
 * - Time is ALWAYS generated on server
 * - Only accepts geolocation from frontend
 * - Validates geofence server-side
 * - Fraud detection compares device time vs server time
 * 
 * Request body:
 * {
 *   checkInLatitude: number (required),
 *   checkInLongitude: number (required),
 *   checkInAccuracy: number (optional),
 *   deviceTime: string (optional, for audit only)
 * }
 */
export const postMarkMine = asyncHandler(async (req, res) => {
  const data = markSchema.parse(req.body || {});
  const date = getServerDateIST(); // Use server date, not frontend
  
  // Optional: Log fraud detection
  let fraudAnalysis = null;
  if (data.deviceTime) {
    fraudAnalysis = detectTimeFraud(data.deviceTime);
    if (fraudAnalysis.isSuspicious) {
      console.warn(
        `⚠️ FRAUD ALERT on check-in for user ${req.user.id}: ${fraudAnalysis.analysis}`
      );
    }
  }

  const resolvedLocation = await resolveCoordinatesFromPayloadOrTrackedLocation({
    userId: req.user.id,
    latitude: data.checkInLatitude,
    longitude: data.checkInLongitude,
    accuracy: data.checkInAccuracy,
    actionLabel: "check-in",
  });

  // Perform check-in with server-generated time
  const doc = await performCheckIn(
    req.user.id,
    date,
    resolvedLocation.latitude,
    resolvedLocation.longitude,
    resolvedLocation.accuracy,
    fraudAnalysis // Pass fraud analysis to service
  );

  // Log activity
  createActivityLog({
    actorId: req.user.id,
    actorName: req.user.name || "Unknown",
    actorRole: req.user.role,
    actionType: "ATTENDANCE_CHECKIN",
    module: "ATTENDANCE",
    description: `${req.user.name || "User"} checked in at ${doc.checkIn} IST (server-generated)`,
    metadata: { 
      date, 
      checkIn: doc.checkIn,
      distance: doc.checkInDistanceFromOffice,
      isSuspicious: fraudAnalysis?.isSuspicious || false
    },
    ipAddress: req.ip,
    visibility: "PUBLIC",
  }).catch(() => {});

  res.json({ 
    attendance: doc,
    message: fraudAnalysis?.isSuspicious ? "Check-in successful (device time mismatch detected)" : "Check-in successful"
  });
});

/**
 * POST /attendance/checkout
 * 
 * Check-out endpoint with server-side time generation
 * 
 * SECURITY:
 * - Time is ALWAYS generated on server
 * - Only accepts geolocation from frontend
 * - Validates geofence server-side
 * - Prevents duplicate checkout
 * - Requires active check-in
 * 
 * Request body:
 * {
 *   checkOutLatitude: number (required),
 *   checkOutLongitude: number (required),
 *   checkOutAccuracy: number (optional),
 *   deviceTime: string (optional, for audit only)
 * }
 */
export const postCheckOut = asyncHandler(async (req, res) => {
  const parsedPayload = checkOutSchema.safeParse(req.body || {});
  if (!parsedPayload.success) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Invalid location payload for check-out. Please verify GPS data and try again."
    );
  }

  const data = parsedPayload.data;
  const date = getServerDateIST(); // Use server date

  // Optional: Log fraud detection
  let fraudAnalysis = null;
  if (data.deviceTime) {
    fraudAnalysis = detectTimeFraud(data.deviceTime);
    if (fraudAnalysis.isSuspicious) {
      console.warn(
        `⚠️ FRAUD ALERT on check-out for user ${req.user.id}: ${fraudAnalysis.analysis}`
      );
    }
  }

  const resolvedLocation = await resolveCoordinatesFromPayloadOrTrackedLocation({
    userId: req.user.id,
    latitude: data.checkOutLatitude,
    longitude: data.checkOutLongitude,
    accuracy: data.checkOutAccuracy,
    actionLabel: "check-out",
  });

  // Perform check-out with server-generated time
  const doc = await performCheckOut(
    req.user.id,
    date,
    resolvedLocation.latitude,
    resolvedLocation.longitude,
    resolvedLocation.accuracy,
    fraudAnalysis
  );

  // Log activity
  createActivityLog({
    actorId: req.user.id,
    actorName: req.user.name || "Unknown",
    actorRole: req.user.role,
    actionType: "ATTENDANCE_CHECKOUT",
    module: "ATTENDANCE",
    description: `${req.user.name || "User"} checked out at ${doc.checkOut} IST (server-generated)`,
    metadata: { 
      date, 
      checkOut: doc.checkOut,
      distance: doc.checkOutDistanceFromOffice,
      isSuspicious: fraudAnalysis?.isSuspicious || false,
      totalHours: doc.totalHours
    },
    ipAddress: req.ip,
    visibility: "PUBLIC",
  }).catch(() => {});

  res.json({ 
    attendance: doc,
    message: fraudAnalysis?.isSuspicious ? "Check-out successful (device time mismatch detected)" : "Check-out successful"
  });
});

export const getMine = asyncHandler(async (req, res) => {
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const rows = await getMyAttendance(req.user.id, from, to);
  res.json(rows);
});

export const getAll = asyncHandler(async (req, res) => {
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const userId = String(req.query.userId || "");
  const rows = await getAllAttendance(from, to, req.user.role, userId, req.user.companyId);
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

    const doc = await editAttendanceById(recordId, patch);
    res.json({ attendance: doc });
  } else {
    const editAttendanceSchema = import("./attendance.schemas.js").then(m => m.editAttendanceSchema);
    // Keep existing behavior for backward compatibility
    const doc = await editAttendanceHRorAdmin(req.body.userId, req.body.date, {
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut
    });
    res.json({ attendance: doc });
  }
});

export const patchShiftAdmin = asyncHandler(async (req, res) => {
  const doc = await adminEditShift(req.body.userId, req.body.date, req.body.shiftStart, req.body.shiftEnd);
  res.json({ attendance: doc });
});

// ============================================
// AUTO-MARK ABSENT ENDPOINTS (ADMIN ONLY)
// ============================================

export const triggerAutoMarkAbsentees = asyncHandler(async (req, res) => {
  console.log('🔄 [ADMIN REQUEST] Triggering auto-mark absent job...');
  
  const result = await autoMarkAbsentees(req.user.companyId);
  const summary = await getAttendanceSummaryForToday(req.user.companyId);

  res.json({
    message: "Auto-mark attendance completed",
    autoMarkResult: result,
    attendanceSummary: summary
  });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const summary = await getAttendanceSummaryForToday(req.user.companyId);
  res.json(summary);
});

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

export const triggerRecalculateAttendance = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;

  const result = await recalculateAllAttendance(fromDate, toDate);

  res.json({
    success: true,
    data: result,
    message: result.message || "Attendance recalculation completed"
  });
});