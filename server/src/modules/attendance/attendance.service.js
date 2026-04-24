import { Attendance } from "./Attendance.model.js";
import { Calendar } from "../calendar/Calendar.model.js";
import { Event, EVENT_PURPOSE, EVENT_VISIBILITY } from "../calendar/Event.model.js";
import { User } from "../users/User.model.js";
import { env } from "../../config/env.js";
import { isWithinGeofence } from "../../utils/geofencing.js";
import { getCurrentDateIST, getCurrentTimeIST } from "../../utils/istDateTime.js";
import { 
  getServerTime, 
  getServerDateIST, 
  getServerTimeISTPrecision,
  convertToIST 
} from "../../utils/serverTime.js";
import { ROLES } from "../../middleware/roles.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

function compareTime(a, b) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  if (ah !== bh) return ah - bh;
  return am - bm;
}

function calculateTotalHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  
  // If checkout is before checkin, it means checkout is next day (e.g., night shift)
  let diffMinutes = outMinutes - inMinutes;
  if (diffMinutes < 0) {
    // Assume checkout is next day, add 24 hours
    diffMinutes += 24 * 60;
  }
  
  return Math.max(0, Math.round((diffMinutes / 60) * 100) / 100); // Round to 2 decimals
}

function toMinutes(time) {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function calculateShiftDurationMinutes(shiftStart, shiftEnd) {
  const shiftStartMinutes = toMinutes(shiftStart);
  const shiftEndMinutes = toMinutes(shiftEnd);

  if (shiftStartMinutes === null || shiftEndMinutes === null) {
    return 8 * 60;
  }

  const isOvernightShift = shiftEndMinutes <= shiftStartMinutes;
  const normalizedShiftEnd = isOvernightShift ? shiftEndMinutes + 24 * 60 : shiftEndMinutes;
  return Math.max(1, normalizedShiftEnd - shiftStartMinutes);
}

function calculateAttendanceStatus({ date, checkIn, checkOut, shiftStart, shiftEnd }) {
  const today = new Date().toISOString().split("T")[0];

  if (!checkIn) {
    return "ABSENT";
  }

  if (!checkOut) {
    return date < today ? "ABSENT" : "PRESENT";
  }

  const shiftStartMinutes = toMinutes(shiftStart);
  const shiftEndMinutes = toMinutes(shiftEnd);
  const checkInMinutes = toMinutes(checkIn);
  const checkOutMinutes = toMinutes(checkOut);

  if (
    shiftStartMinutes === null ||
    shiftEndMinutes === null ||
    checkInMinutes === null ||
    checkOutMinutes === null
  ) {
    return "PRESENT";
  }

  const isOvernightShift = shiftEndMinutes <= shiftStartMinutes;
  const normalizedShiftEnd = isOvernightShift ? shiftEndMinutes + 24 * 60 : shiftEndMinutes;

  // For regular day shifts, early check-in must remain "early" (not next day).
  // For overnight shifts (e.g., 22:00-06:00), post-midnight punches are normalized to next day.
  const normalizedCheckIn =
    isOvernightShift && checkInMinutes < shiftStartMinutes
      ? checkInMinutes + 24 * 60
      : checkInMinutes;

  let normalizedCheckOut =
    (isOvernightShift || checkOutMinutes < shiftStartMinutes)
      ? checkOutMinutes + 24 * 60
      : checkOutMinutes;

  if (normalizedCheckOut < normalizedCheckIn) {
    normalizedCheckOut += 24 * 60;
  }

  const shiftDurationMinutes = Math.max(1, normalizedShiftEnd - shiftStartMinutes);
  const halfShiftBoundary = shiftStartMinutes + Math.floor(shiftDurationMinutes / 2);
  const workedMinutes = Math.max(0, normalizedCheckOut - normalizedCheckIn);

  // Half-day if only one half of the shift is worked (morning or afternoon pattern),
  // or when total worked duration is up to half-shift.
  const isMorningHalfDay =
    normalizedCheckIn <= shiftStartMinutes && normalizedCheckOut <= halfShiftBoundary;
  const isAfternoonHalfDay =
    normalizedCheckIn >= halfShiftBoundary && normalizedCheckOut >= normalizedShiftEnd;
  const isDurationHalfDay = workedMinutes > 0 && workedMinutes <= Math.ceil(shiftDurationMinutes / 2);

  if (isMorningHalfDay || isAfternoonHalfDay || isDurationHalfDay) {
    return "HALF_DAY";
  }

  if (normalizedCheckIn > shiftStartMinutes || normalizedCheckOut < normalizedShiftEnd) {
    return "SHORT_HOURS";
  }

  return "PRESENT";
}

async function getShiftForDate(date) {
  try {
    const day = await Calendar.findOne({ date });

    if (day?.shiftStart && day?.shiftEnd) {
      return {
        shiftStart: day.shiftStart,
        shiftEnd: day.shiftEnd
      };
    }

    const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true }).select("companyShiftStart companyShiftEnd");
    const firstAdmin = company || await User.findOne({ role: ROLES.ADMIN }).select("companyShiftStart companyShiftEnd");

    return {
      shiftStart: firstAdmin?.companyShiftStart || env.DEFAULT_SHIFT_START,
      shiftEnd: firstAdmin?.companyShiftEnd || env.DEFAULT_SHIFT_END
    };
  } catch (error) {
    console.error("Error fetching shift:", error);
    return {
      shiftStart: env.DEFAULT_SHIFT_START,
      shiftEnd: env.DEFAULT_SHIFT_END
    };
  }
}

async function getPublicHolidayMap(fromDate, toDate) {
  if (!fromDate || !toDate) {
    return new Map();
  }

  const holidays = await Event.find({
    purpose: EVENT_PURPOSE.PUBLIC_HOLIDAY,
    visibility: EVENT_VISIBILITY.PUBLIC,
    status: { $ne: "CANCELLED" },
    date: { $gte: fromDate, $lte: toDate }
  }).select("date title");

  const holidayMap = new Map();
  holidays.forEach((holiday) => {
    if (!holidayMap.has(holiday.date)) {
      holidayMap.set(holiday.date, holiday.title || "Public Holiday");
    }
  });

  return holidayMap;
}

async function getPublicHolidayNameForDate(date) {
  if (!date) return null;

  const holiday = await Event.findOne({
    purpose: EVENT_PURPOSE.PUBLIC_HOLIDAY,
    visibility: EVENT_VISIBILITY.PUBLIC,
    status: { $ne: "CANCELLED" },
    date
  }).select("title");

  return holiday?.title || null;
}

/**
 * SECURE CHECK-IN FUNCTION
 * 
 * Uses server-generated time (NEVER trusts frontend time)
 * Performs all geofence validation server-side
 * 
 * @param {string} userId - User ID
 * @param {string} date - Attendance date (from server)
 * @param {number} checkInLatitude - Employee GPS latitude
 * @param {number} checkInLongitude - Employee GPS longitude
 * @param {number} checkInAccuracy - GPS accuracy in meters (optional)
 * @param {object} fraudAnalysis - Fraud detection results (optional)
 * @returns {object} - Attendance record
 */
export async function performCheckIn(
  userId,
  date,
  checkInLatitude,
  checkInLongitude,
  checkInAccuracy = null,
  fraudAnalysis = null
) {
  try {
    // SECURITY: Get server time (ONLY source of truth)
    const serverTime = getServerTime();
    const checkInTime24 = getServerTimeISTPrecision(); // HH:MM format

    // Verify user exists
    const user = await User.findById(userId).select("role");
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    // Check if user already has active attendance for today
    const existingAttendance = await Attendance.findOne({ userId, date });

    if (existingAttendance && existingAttendance.checkIn) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "You have already checked in today. Check out first before checking in again."
      );
    }

    // Get company location for geofence validation
    const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
    const adminUser = company || await User.findOne({ role: ROLES.ADMIN });

    if (!adminUser || adminUser.officeLatitude === 0 || adminUser.officeLongitude === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Office location not configured. Contact admin."
      );
    }

    // SECURITY: Validate geofence server-side
    const isAdmin = user.role === ROLES.ADMIN;
    let geofenceCheck = { isWithinGeofence: true, distance: 0 };

    if (!isAdmin) {
      geofenceCheck = isWithinGeofence(
        checkInLatitude,
        checkInLongitude,
        adminUser.officeLatitude,
        adminUser.officeLongitude
      );

      if (!geofenceCheck.isWithinGeofence) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `You are ${Math.round(geofenceCheck.distance)}m away from office (${geofenceCheck.radius}m allowed). You must be inside the office location to check in.`
        );
      }
    }

    // Get shift details
    const { shiftStart, shiftEnd } = await getShiftForDate(date);
    const holidayName = await getPublicHolidayNameForDate(date);

    // Calculate status
    const status = holidayName
      ? "HOLIDAY"
      : "PRESENT"; // Could be calculated more precisely, but PRESENT for active check-in

    // Update or create attendance record
    const doc = await Attendance.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          checkIn: checkInTime24,
          checkInTimestamp: serverTime,
          checkInLatitude,
          checkInLongitude,
          checkInAccuracy,
          checkInDistanceFromOffice: geofenceCheck.distance,
          checkInWithinGeofence: geofenceCheck.isWithinGeofence,
          status,
          shiftStart,
          shiftEnd,
          shiftName: "Regular Shift",
          timezone: "Asia/Kolkata",
          isWithinGeofence: geofenceCheck.isWithinGeofence, // Backward compat
          distanceFromOffice: geofenceCheck.distance, // Backward compat
          // Fraud detection: Store if device time differs significantly
          ...(fraudAnalysis?.isSuspicious && {
            suspiciousActivity: {
              type: "TIME_MANIPULATION_SUSPECTED",
              deviceTime: fraudAnalysis.deviceTime,
              serverTime: fraudAnalysis.serverTime,
              differenceMinutes: fraudAnalysis.differenceMinutes,
              timestamp: new Date()
            }
          })
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    return doc;
  } catch (error) {
    console.error("Error during check-in:", error);
    throw error;
  }
}

/**
 * SECURE CHECK-OUT FUNCTION
 * 
 * Uses server-generated time (NEVER trusts frontend time)
 * Validates active check-in exists
 * Performs geofence validation server-side
 * 
 * @param {string} userId - User ID
 * @param {string} date - Attendance date (from server)
 * @param {number} checkOutLatitude - Employee GPS latitude
 * @param {number} checkOutLongitude - Employee GPS longitude
 * @param {number} checkOutAccuracy - GPS accuracy in meters (optional)
 * @param {object} fraudAnalysis - Fraud detection results (optional)
 * @returns {object} - Updated attendance record
 */
export async function performCheckOut(
  userId,
  date,
  checkOutLatitude,
  checkOutLongitude,
  checkOutAccuracy = null,
  fraudAnalysis = null
) {
  try {
    // SECURITY: Get server time (ONLY source of truth)
    const serverTime = getServerTime();
    const checkOutTime24 = getServerTimeISTPrecision(); // HH:MM format

    // Verify user exists
    const user = await User.findById(userId).select("role");
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    // Check if user has active check-in
    const existingAttendance = await Attendance.findOne({ userId, date });

    if (!existingAttendance || !existingAttendance.checkIn) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Check-in required before checkout. You must check in first."
      );
    }

    if (existingAttendance.checkOut) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "You have already checked out today."
      );
    }

    // Get company location for geofence validation
    const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
    const adminUser = company || await User.findOne({ role: ROLES.ADMIN });

    if (!adminUser || adminUser.officeLatitude === 0 || adminUser.officeLongitude === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Office location not configured. Contact admin."
      );
    }

    // SECURITY: Validate geofence server-side
    const isAdmin = user.role === ROLES.ADMIN;
    let geofenceCheck = { isWithinGeofence: true, distance: 0 };

    if (!isAdmin) {
      geofenceCheck = isWithinGeofence(
        checkOutLatitude,
        checkOutLongitude,
        adminUser.officeLatitude,
        adminUser.officeLongitude
      );

      if (!geofenceCheck.isWithinGeofence) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `You are ${Math.round(geofenceCheck.distance)}m away from office (${geofenceCheck.radius}m allowed). You must be inside the office location to check out.`
        );
      }
    }

    // Calculate total hours worked
    let totalHours = 0;
    if (existingAttendance.checkIn && checkOutTime24) {
      totalHours = calculateTotalHours(existingAttendance.checkIn, checkOutTime24);
    }

    // Get shift details for status calculation
    const { shiftStart, shiftEnd } = await getShiftForDate(date);
    const holidayName = await getPublicHolidayNameForDate(date);

    // Calculate status
    const status = holidayName
      ? "HOLIDAY"
      : calculateAttendanceStatus({
          date,
          checkIn: existingAttendance.checkIn,
          checkOut: checkOutTime24,
          shiftStart,
          shiftEnd
        });

    // Update attendance record
    const doc = await Attendance.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          checkOut: checkOutTime24,
          checkOutTimestamp: serverTime,
          checkOutLatitude,
          checkOutLongitude,
          checkOutAccuracy,
          checkOutDistanceFromOffice: geofenceCheck.distance,
          checkOutWithinGeofence: geofenceCheck.isWithinGeofence,
          totalHours,
          status,
          // Fraud detection: Store if device time differs significantly
          ...(fraudAnalysis?.isSuspicious && {
            suspiciousCheckOutActivity: {
              type: "TIME_MANIPULATION_SUSPECTED",
              deviceTime: fraudAnalysis.deviceTime,
              serverTime: fraudAnalysis.serverTime,
              differenceMinutes: fraudAnalysis.differenceMinutes,
              timestamp: new Date()
            }
          })
        }
      },
      { returnDocument: "after" }
    );

    return doc;
  } catch (error) {
    console.error("Error during check-out:", error);
    throw error;
  }
}

export async function markMyAttendance(userId, date, checkIn, checkOut, checkInLatitude, checkInLongitude, checkOutLatitude, checkOutLongitude, checkInAccuracy = null, checkOutAccuracy = null) {
  try {
    const existing = await Attendance.findOne({ userId, date });
    const { shiftStart, shiftEnd } = await getShiftForDate(date);
    const holidayName = await getPublicHolidayNameForDate(date);

    const newCheckIn = checkIn ?? existing?.checkIn ?? "";
    const newCheckOut = checkOut ?? existing?.checkOut ?? "";

    // Get the checking-in user's role — admins are exempt from geofence
    const checkingUser = await User.findById(userId).select("role");
    const isAdmin = checkingUser && checkingUser.role === ROLES.ADMIN;

    // Get company location (required for geofence validation)
    const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
    const adminUser = company || await User.findOne({ role: ROLES.ADMIN });

    // If office location is not configured, block check-in/checkout for non-admin users
    if (!isAdmin && (!adminUser || adminUser.officeLatitude === 0 || adminUser.officeLongitude === 0)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Office location has not been configured yet. Please ask your admin to set the company location in settings."
      );
    }

    // Initialize geofencing data
    let checkInData = {
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      shiftStart,
      shiftEnd,
      shiftName: "Regular Shift",
      timezone: "Asia/Kolkata"
    };

    // ============================================================
    // VALIDATE CHECK-IN GEOFENCE
    // ============================================================
    if (newCheckIn && checkInLatitude !== undefined && checkInLongitude !== undefined) {
      // Validate that coordinates are provided
      if (!checkInLatitude && checkInLatitude !== 0 || !checkInLongitude && checkInLongitude !== 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Check-in location coordinates are incomplete");
      }

      if (!isAdmin) {
        // Non-admin: must be within geofence
        const geofenceCheck = isWithinGeofence(
          checkInLatitude,
          checkInLongitude,
          adminUser.officeLatitude,
          adminUser.officeLongitude
        );

        // Store check-in geofencing data
        checkInData.checkInLatitude = checkInLatitude;
        checkInData.checkInLongitude = checkInLongitude;
        checkInData.checkInAccuracy = checkInAccuracy;
        checkInData.checkInDistanceFromOffice = geofenceCheck.distance;
        checkInData.checkInWithinGeofence = geofenceCheck.isWithinGeofence;
        checkInData.isWithinGeofence = geofenceCheck.isWithinGeofence; // Backward compatibility
        checkInData.distanceFromOffice = geofenceCheck.distance; // Backward compatibility

        // Block check-in if outside geofence
        if (!geofenceCheck.isWithinGeofence) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `You are ${Math.round(geofenceCheck.distance)}m away from office (${geofenceCheck.radius}m allowed). You must be inside the office location to check in.`
          );
        }
      } else {
        // Admin is exempt — just record their location without enforcing geofence
        checkInData.checkInLatitude = checkInLatitude;
        checkInData.checkInLongitude = checkInLongitude;
        checkInData.checkInAccuracy = checkInAccuracy;
        checkInData.checkInWithinGeofence = true;
        checkInData.checkInDistanceFromOffice = 0;
        checkInData.isWithinGeofence = true; // Backward compatibility
        checkInData.distanceFromOffice = 0; // Backward compatibility
      }

      // Store ISO timestamp for audit trail
      checkInData.checkInTimestamp = new Date();
    }

    // ============================================================
    // VALIDATE CHECK-OUT GEOFENCE
    // ============================================================
    if (newCheckOut && checkOutLatitude !== undefined && checkOutLongitude !== undefined) {
      // Validate that coordinates are provided
      if (!checkOutLatitude && checkOutLatitude !== 0 || !checkOutLongitude && checkOutLongitude !== 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Check-out location coordinates are incomplete");
      }

      // Validate that user has checked in before checking out
      if (!newCheckIn) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Check-in required before checkout");
      }

      if (!isAdmin) {
        // Non-admin: must be within geofence for checkout
        const geofenceCheck = isWithinGeofence(
          checkOutLatitude,
          checkOutLongitude,
          adminUser.officeLatitude,
          adminUser.officeLongitude
        );

        // Store check-out geofencing data
        checkInData.checkOutLatitude = checkOutLatitude;
        checkInData.checkOutLongitude = checkOutLongitude;
        checkInData.checkOutAccuracy = checkOutAccuracy;
        checkInData.checkOutDistanceFromOffice = geofenceCheck.distance;
        checkInData.checkOutWithinGeofence = geofenceCheck.isWithinGeofence;

        // Block check-out if outside geofence
        if (!geofenceCheck.isWithinGeofence) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `You are ${Math.round(geofenceCheck.distance)}m away from office (${geofenceCheck.radius}m allowed). You must be inside the office location to check out.`
          );
        }
      } else {
        // Admin is exempt — just record their location without enforcing geofence
        checkInData.checkOutLatitude = checkOutLatitude;
        checkInData.checkOutLongitude = checkOutLongitude;
        checkInData.checkOutAccuracy = checkOutAccuracy;
        checkInData.checkOutWithinGeofence = true;
        checkInData.checkOutDistanceFromOffice = 0;
      }

      // Store ISO timestamp for audit trail
      checkInData.checkOutTimestamp = new Date();
    }

    // Calculate total worked hours
    const totalHours = calculateTotalHours(newCheckIn, newCheckOut);

    const status = holidayName
      ? "HOLIDAY"
      : calculateAttendanceStatus({
          date,
          checkIn: newCheckIn,
          checkOut: newCheckOut,
          shiftStart,
          shiftEnd
        });

    const doc = await Attendance.findOneAndUpdate(
      { userId, date },
      { 
        $set: { 
          ...checkInData,
          totalHours,
          status 
        } 
      },
      { upsert: true, returnDocument: 'after' }
    );

    return doc;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
}

export async function getMyAttendance(userId, from, to) {
  const records = await Attendance.find({ userId, date: { $gte: from, $lte: to } }).sort({ date: 1 });
  const effectiveFrom = from || records[0]?.date;
  const effectiveTo = to || records[records.length - 1]?.date;
  const holidayMap = await getPublicHolidayMap(effectiveFrom, effectiveTo);

  return records.map(record => ({
    ...record.toObject(),
    status: holidayMap.has(record.date)
      ? "HOLIDAY"
      : calculateAttendanceStatus({
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          shiftStart: record.shiftStart || env.DEFAULT_SHIFT_START,
          shiftEnd: record.shiftEnd || env.DEFAULT_SHIFT_END
        }),
    ...(holidayMap.has(record.date)
      ? { isHoliday: true, eventName: holidayMap.get(record.date) }
      : {})
  }));
}

export async function getAllAttendance(from, to, userRole, userId = null) {
  try {
    // Default to last 30 days if not specified
    let fromDate = from;
    let toDate = to;
    
    if (!fromDate || !toDate) {
      const today = new Date();
      toDate = today.toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromDate = thirtyDaysAgo.toISOString().split("T")[0];
    }
    
    // Build query - filter by date and optionally by userId
    const query = { date: { $gte: fromDate, $lte: toDate } };
    
    // If userId is provided, filter by that specific user
    if (userId && userId !== "" && userId !== "null") {
      query.userId = userId;
    }
    
    // Get attendance records with user details
    const records = await Attendance.find(query)
      .populate("userId", "name email role")
      .sort({ date: -1 });

    const holidayMap = await getPublicHolidayMap(fromDate, toDate);

    // Transform records to include user details and enforce the latest attendance policy.
    return records
      .filter(record => record.userId) // Filter out records without user (deleted users)
      .filter(record => userRole !== ROLES.HR || record.userId.role === ROLES.USER)
      .map(record => {
        const isHoliday = holidayMap.has(record.date);
        const status = isHoliday
          ? "HOLIDAY"
          : calculateAttendanceStatus({
              date: record.date,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              shiftStart: record.shiftStart || env.DEFAULT_SHIFT_START,
              shiftEnd: record.shiftEnd || env.DEFAULT_SHIFT_END
            });
        
        return {
          _id: record._id,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          shiftStart: record.shiftStart,
          shiftEnd: record.shiftEnd,
          shiftName: record.shiftName,
          shiftHours: calculateShiftHours(record.shiftStart, record.shiftEnd),
          totalHours: record.totalHours,
          status: status,  // Use recalculated status
          userId: record.userId._id,
          userName: record.userId.name || "Unknown User",
          email: record.userId.email || "N/A",
          userRole: record.userId.role || "USER",
          ...(isHoliday ? { isHoliday: true, eventName: holidayMap.get(record.date) } : {})
        };
      });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    throw error;
  }
}

function calculateShiftHours(shiftStart, shiftEnd) {
  if (!shiftStart || !shiftEnd) return "8h";
  const hours = Math.round((calculateShiftDurationMinutes(shiftStart, shiftEnd) / 60) * 100) / 100;
  return `${hours}h`;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeTimeInput(value) {
  if (value === undefined || value === null || value === "") return "";
  return value;
}

async function buildUpdatedAttendanceFields(baseRecord, patch) {
  const effectiveDate = baseRecord.date;
  const baseShift = await getShiftForDate(effectiveDate);
  const holidayName = await getPublicHolidayNameForDate(effectiveDate);

  const nextCheckIn = hasOwn(patch, "checkIn") ? normalizeTimeInput(patch.checkIn) : (baseRecord.checkIn || "");
  const nextCheckOut = hasOwn(patch, "checkOut") ? normalizeTimeInput(patch.checkOut) : (baseRecord.checkOut || "");
  const nextShiftStart = hasOwn(patch, "shiftStart") ? patch.shiftStart : (baseRecord.shiftStart || baseShift.shiftStart);
  const nextShiftEnd = hasOwn(patch, "shiftEnd") ? patch.shiftEnd : (baseRecord.shiftEnd || baseShift.shiftEnd);

  const updatedFields = {
    ...patch,
    checkIn: nextCheckIn,
    checkOut: nextCheckOut,
    shiftStart: nextShiftStart,
    shiftEnd: nextShiftEnd
  };

  updatedFields.totalHours = calculateTotalHours(nextCheckIn, nextCheckOut);
  updatedFields.status = holidayName
    ? "HOLIDAY"
    : calculateAttendanceStatus({
        date: effectiveDate,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        shiftStart: nextShiftStart,
        shiftEnd: nextShiftEnd
      });

  return updatedFields;
}

export async function editAttendanceHRorAdmin(userId, date, patch) {
  const existing = await Attendance.findOne({ userId, date });
  const baseRecord = existing || {
    userId,
    date,
    checkIn: "",
    checkOut: "",
    shiftStart: "",
    shiftEnd: ""
  };

  const updatedFields = await buildUpdatedAttendanceFields(baseRecord, patch);

  const doc = await Attendance.findOneAndUpdate(
    { userId, date },
    { $set: updatedFields },
    { upsert: true, returnDocument: "after" }
  );
  return doc;
}

export async function editAttendanceById(recordId, patch) {
  const existing = await Attendance.findById(recordId);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Attendance record not found");
  }

  const updatedFields = await buildUpdatedAttendanceFields(existing, patch);

  const doc = await Attendance.findByIdAndUpdate(
    recordId,
    { $set: updatedFields },
    { returnDocument: "after" }
  );
  return doc;
}

// ============================================
// AUTO-MARK ATTENDANCE LOGIC
// ============================================

/**
 * Check if a date is a working day (Mon-Fri)
 * @param {string} date - YYYY-MM-DD format
 * @returns {boolean} - true if working day
 */
function isWorkingDay(date) {
  const dayOfWeek = new Date(date).getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Compare current time with shift end time
 * @param {string} shiftEnd - Time in HH:MM format (e.g., "18:30")
 * @returns {boolean} - true if current time is after shift end
 */
function isAfterShiftEnd(shiftEnd) {
  const currentTime = getCurrentTimeIST();
  return compareTime(currentTime, shiftEnd) >= 0;
}

async function autoMarkAbsenteesForDate(targetDate, staffUsers, { forceFinalize = false } = {}) {
  const holidayName = await getPublicHolidayNameForDate(targetDate);

  if (holidayName) {
    const { shiftStart, shiftEnd } = await getShiftForDate(targetDate);

    for (const staff of staffUsers) {
      const leaveRecord = await Event.findOne({
        userId: staff._id,
        date: targetDate,
        purpose: EVENT_PURPOSE.PERSONAL,
        status: { $ne: "CANCELLED" }
      });

      const status = leaveRecord ? "ABSENT" : "HOLIDAY";

      await Attendance.findOneAndUpdate(
        { userId: staff._id, date: targetDate },
        {
          $set: {
            shiftStart,
            shiftEnd,
            shiftName: holidayName,
            status,
            totalHours: 0,
            checkIn: "",
            checkOut: ""
          }
        },
        { upsert: true, returnDocument: "after" }
      );
    }

    return {
      date: targetDate,
      total: staffUsers.length,
      marked: staffUsers.length,
      errors: 0,
      holiday: holidayName,
      skipped: false,
      message: `${targetDate} marked as HOLIDAY for all staff (${holidayName})`
    };
  }

  if (!isWorkingDay(targetDate)) {
    console.log(`🗓️ Skipping auto-mark: ${targetDate} is not a working day`);
    return {
      date: targetDate,
      total: staffUsers.length,
      marked: 0,
      errors: 0,
      skipped: true,
      message: "Not a working day"
    };
  }

  const { shiftStart, shiftEnd } = await getShiftForDate(targetDate);
  const shouldFinalizeMissingCheckout = forceFinalize || targetDate < getCurrentDateIST() || isAfterShiftEnd(shiftEnd);

  console.log(`📋 Auto-marking attendance for ${staffUsers.length} staff members (Date: ${targetDate})`);

  let markedCount = 0;
  let errorCount = 0;

  for (const staff of staffUsers) {
    try {
      const existingRecord = await Attendance.findOne({
        userId: staff._id,
        date: targetDate
      });

      if (!existingRecord) {
        await Attendance.create({
          userId: staff._id,
          date: targetDate,
          checkIn: "",
          checkOut: "",
          shiftStart,
          shiftEnd,
          shiftName: "Regular Shift",
          totalHours: 0,
          status: "ABSENT",
          isWithinGeofence: false,
          distanceFromOffice: 0
        });

        console.log(`  ❌ ${staff.name} - ABSENT (No check-in record created)`);
        markedCount++;
        continue;
      }

      if (!existingRecord.checkIn) {
        await Attendance.findByIdAndUpdate(existingRecord._id, {
          $set: {
            status: "ABSENT",
            totalHours: 0,
            checkOut: ""
          }
        });

        console.log(`  ❌ ${staff.name} - ABSENT (No check-in recorded)`);
        markedCount++;
        continue;
      }

      if (existingRecord.checkIn && !existingRecord.checkOut && shouldFinalizeMissingCheckout) {
        await Attendance.findByIdAndUpdate(existingRecord._id, {
          $set: {
            status: "ABSENT",
            totalHours: 0,
            checkOut: ""
          }
        });

        console.log(`  ⚠️ ${staff.name} - ABSENT (Forgot to check out - Checked in at ${existingRecord.checkIn})`);
        markedCount++;
        continue;
      }

      const totalHours = calculateTotalHours(existingRecord.checkIn, existingRecord.checkOut);
      const effectiveShiftStart = existingRecord.shiftStart || shiftStart;
      const effectiveShiftEnd = existingRecord.shiftEnd || shiftEnd;
      const status = calculateAttendanceStatus({
        date: existingRecord.date,
        checkIn: existingRecord.checkIn,
        checkOut: existingRecord.checkOut,
        shiftStart: effectiveShiftStart,
        shiftEnd: effectiveShiftEnd
      });

      if (existingRecord.status !== status || existingRecord.totalHours !== totalHours) {
        await Attendance.findByIdAndUpdate(existingRecord._id, {
          $set: {
            status,
            totalHours
          }
        });

        console.log(`  ✓ ${staff.name} - ${status}`);
      }
    } catch (error) {
      console.error(
        `  ⚠️ Error marking ${staff.name} on ${targetDate}:`,
        error.message
      );
      errorCount++;
    }
  }

  return {
    date: targetDate,
    total: staffUsers.length,
    marked: markedCount,
    present: staffUsers.length - markedCount - errorCount,
    errors: errorCount,
    skipped: false,
    message: `Marked ${markedCount} as ABSENT out of ${staffUsers.length} staff`
  };
}

/**
 * Auto-mark absent for staff who didn't check in
 * Run this daily at end of shift (e.g., 7 PM)
 * 
 * Logic:
 * - Get all staff (non-admin users)
 * - For today, check if they have attendance record
 * - If no record exists → Create ABSENT record
 * - If record exists but no check-in → Update to ABSENT
 * - If checked in late → Mark as SHORT_HOURS
 * 
 * @returns {Object} - { total: count, marked: count, errors: count }
 */
export async function autoMarkAbsentees() {
  try {
    const today = getCurrentDateIST();

    const staffUsers = await User.find({
      role: { $ne: ROLES.ADMIN },
      isActive: true
    }).select("_id name email");

    const result = await autoMarkAbsenteesForDate(today, staffUsers, { forceFinalize: false });

    console.log(`\n✅ Auto-mark attendance completed:`, result);
    return result;
  } catch (error) {
    console.error("❌ Error in autoMarkAbsentees:", error.message);
    return {
      total: 0,
      marked: 0,
      errors: 1,
      error: error.message
    };
  }
}

export async function markPublicHolidayForAllEmployees(date, holidayName) {
  try {
    console.log(`🎉 Marking public holiday: ${date} (${holidayName})`);
    
    const staffUsers = await User.find({
      role: { $ne: ROLES.ADMIN },
      isActive: true
    }).select("_id name email");

    const { shiftStart, shiftEnd } = await getShiftForDate(date);
    let markedCount = 0;
    let errorCount = 0;

    for (const staff of staffUsers) {
      try {
        const leaveRecord = await Event.findOne({
          userId: staff._id,
          date: date,
          purpose: EVENT_PURPOSE.PERSONAL,
          status: { $ne: "CANCELLED" }
        });

        const status = leaveRecord ? "ABSENT" : "HOLIDAY";

        await Attendance.findOneAndUpdate(
          { userId: staff._id, date: date },
          {
            $set: {
              shiftStart,
              shiftEnd,
              shiftName: holidayName,
              status,
              totalHours: 0,
              checkIn: "",
              checkOut: ""
            }
          },
          { upsert: true, returnDocument: "after" }
        );

        console.log(`  ✓ ${staff.name} - ${status}`);
        markedCount++;
      } catch (error) {
        console.error(`  ⚠️ Error marking ${staff.name}:`, error.message);
        errorCount++;
      }
    }

    const result = {
      date,
      holidayName,
      total: staffUsers.length,
      marked: markedCount,
      errors: errorCount,
      message: `Marked ${markedCount} employees for holiday (${holidayName})`
    };

    console.log(`\n✅ Holiday marking completed:`, result);
    return result;
  } catch (error) {
    console.error("❌ Error in markPublicHolidayForAllEmployees:", error.message);
    return {
      total: 0,
      marked: 0,
      errors: 1,
      error: error.message
    };
  }
}

/**
 * Generate daily attendance summary report
 * Shows: Total staff, Present, Half Day, Absent, Short Hours, Not marked
 */
export async function getAttendanceSummaryForToday() {
  try {
    const today = getCurrentDateIST();

    const summary = await Attendance.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total staff
    const totalStaff = await User.countDocuments({
      role: { $ne: ROLES.ADMIN },
      isActive: true
    });

    const result = {
      date: today,
      totalStaff,
      present: 0,
      halfDay: 0,
      absent: 0,
      holiday: 0,
      shortHours: 0,
      notMarked: 0
    };

    // Populate counts from summary
    summary.forEach(item => {
      if (item._id === "PRESENT") result.present = item.count;
      if (item._id === "HALF_DAY") result.halfDay = item.count;
      if (item._id === "ABSENT") result.absent = item.count;
      if (item._id === "HOLIDAY") result.holiday = item.count;
      if (item._id === "SHORT_HOURS") result.shortHours = item.count;
    });

    // Calculate not marked (no attendance record)
    const markedStaff = result.present + result.halfDay + result.absent + result.holiday + result.shortHours;
    result.notMarked = Math.max(0, totalStaff - markedStaff);

    console.log(`📊 Attendance Summary for ${today}:`, result);
    return result;
  } catch (error) {
    console.error("Error getting attendance summary:", error.message);
    throw error;
  }
}

export async function adminEditShift(userId, date, shiftStart, shiftEnd) {
  const doc = await Attendance.findOneAndUpdate(
    { userId, date },
    { $set: { shiftStart, shiftEnd } },
    { upsert: true, returnDocument: "after" }
  );
  return doc;
}

/**
 * Recalculate all attendance records with fixed logic
 * Fixes issues like:
 * - totalHours showing 0 when it should calculate
 * - Status not properly calculated for late check-ins
 * - Night shift handling
 * 
 * @param {String} fromDate - Optional from date (YYYY-MM-DD)
 * @param {String} toDate - Optional to date (YYYY-MM-DD)
 * @returns {Object} - { total: count, recalculated: count, fixed: count, errors: count }
 */
export async function recalculateAllAttendance(fromDate = null, toDate = null) {
  try {
    console.log("🔄 Starting attendance recalculation...");
    
    // Set default date range to last 90 days if not provided
    let query = {};
    if (fromDate && toDate) {
      query.date = { $gte: fromDate, $lte: toDate };
    } else {
      const today = new Date();
      const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      query.date = { 
        $gte: ninetyDaysAgo.toISOString().split('T')[0],
        $lte: today.toISOString().split('T')[0]
      };
    }
    
    // Get all attendance records in range
    const records = await Attendance.find(query);
    const holidayMap = await getPublicHolidayMap(query.date.$gte, query.date.$lte);
    console.log(`📋 Found ${records.length} records to recalculate`);
    
    let recalculatedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
      try {
        // Get shift for this date
        const { shiftStart, shiftEnd } = await getShiftForDate(record.date);
        
        const oldStatus = record.status;
        const oldHours = record.totalHours;
        
        // Recalculate totalHours with fixed logic
        const newTotalHours = calculateTotalHours(record.checkIn, record.checkOut);
        
        const newStatus = holidayMap.has(record.date)
          ? "HOLIDAY"
          : calculateAttendanceStatus({
              date: record.date,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              shiftStart,
              shiftEnd
            });
        
        // Check if anything changed
        if (oldStatus !== newStatus || oldHours !== newTotalHours) {
          await Attendance.findByIdAndUpdate(record._id, {
            $set: {
              status: newStatus,
              totalHours: newTotalHours
            }
          });
          
          fixedCount++;
          console.log(`  ✓ Fixed: ${record.date} - Status: ${oldStatus} → ${newStatus}, Hours: ${oldHours} → ${newTotalHours}`);
        }
        
        recalculatedCount++;
      } catch (error) {
        console.error(`  ⚠️ Error recalculating record ${record._id}:`, error.message);
        errorCount++;
      }
    }
    
    const result = {
      dateRange: {
        from: fromDate || (new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        to: toDate || new Date().toISOString().split('T')[0]
      },
      total: records.length,
      recalculated: recalculatedCount,
      fixed: fixedCount,
      errors: errorCount,
      message: `Recalculated ${recalculatedCount} records, fixed ${fixedCount} issues, ${errorCount} errors`
    };
    
    console.log(`\n✅ Recalculation completed:`, result);
    return result;
  } catch (error) {
    console.error("❌ Error in recalculateAllAttendance:", error.message);
    return {
      total: 0,
      recalculated: 0,
      fixed: 0,
      errors: 1,
      error: error.message
    };
  }
}