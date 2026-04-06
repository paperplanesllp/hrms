import { Attendance } from "./Attendance.model.js";
import { Calendar } from "../calendar/Calendar.model.js";
import { Event, EVENT_PURPOSE, EVENT_VISIBILITY } from "../calendar/Event.model.js";
import { User } from "../users/User.model.js";
import { env } from "../../config/env.js";
import { isWithinGeofence } from "../../utils/geofencing.js";
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

export async function markMyAttendance(userId, date, checkIn, checkOut, checkInLatitude, checkInLongitude) {
  try {
    const existing = await Attendance.findOne({ userId, date });
    const { shiftStart, shiftEnd } = await getShiftForDate(date);
    const holidayName = await getPublicHolidayNameForDate(date);

    const newCheckIn = checkIn ?? existing?.checkIn ?? "";
    const newCheckOut = checkOut ?? existing?.checkOut ?? "";

    // Initialize geofencing data
    let checkInData = {
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      shiftStart,
      shiftEnd,
      shiftName: "Regular Shift"
    };

    // Validate geofencing if checking in with GPS coordinates
    if (newCheckIn && checkInLatitude !== undefined && checkInLongitude !== undefined) {
      // Get the checking-in user's role — admins are exempt from geofence
      const checkingUser = await User.findById(userId).select("role");
      const isAdmin = checkingUser && checkingUser.role === ROLES.ADMIN;

      if (!isAdmin) {
        // Get company location from first admin marked as company location
        const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
        const adminUser = company || await User.findOne({ role: ROLES.ADMIN });

        // If office location is not configured, block check-in for non-admin users
        if (!adminUser || adminUser.officeLatitude === 0 || adminUser.officeLongitude === 0) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "Office location has not been configured yet. Please ask your admin to set the company location in settings."
          );
        }

        // Validate distance
        const geofenceCheck = isWithinGeofence(
          checkInLatitude,
          checkInLongitude,
          adminUser.officeLatitude,
          adminUser.officeLongitude
        );

        // Store geofencing data
        checkInData.checkInLatitude = checkInLatitude;
        checkInData.checkInLongitude = checkInLongitude;
        checkInData.isWithinGeofence = geofenceCheck.isWithinGeofence;
        checkInData.distanceFromOffice = geofenceCheck.distance;

        // Block check-in if outside geofence
        if (!geofenceCheck.isWithinGeofence) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `You are ${geofenceCheck.distance}m away from office (${geofenceCheck.radius}m allowed). Cannot check in.`
          );
        }
      } else {
        // Admin is exempt — just record their location without enforcing geofence
        checkInData.checkInLatitude = checkInLatitude;
        checkInData.checkInLongitude = checkInLongitude;
        checkInData.isWithinGeofence = true;
        checkInData.distanceFromOffice = 0;
      }
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
    { upsert: true, new: true }
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
    { new: true }
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
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return compareTime(currentTime, shiftEnd) >= 0;
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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayHolidayName = await getPublicHolidayNameForDate(today);

    // Get all staff users (non-admin)
    const staffUsers = await User.find({
      role: { $ne: ROLES.ADMIN },
      isActive: true
    }).select("_id name email");

    // If today is a public holiday, all staff are marked as HOLIDAY.
    if (todayHolidayName) {
      const { shiftStart, shiftEnd } = await getShiftForDate(today);

      for (const staff of staffUsers) {
        await Attendance.findOneAndUpdate(
          { userId: staff._id, date: today },
          {
            $set: {
              shiftStart,
              shiftEnd,
              shiftName: todayHolidayName,
              status: "HOLIDAY",
              totalHours: 0
            }
          },
          { upsert: true, new: true }
        );
      }

      return {
        date: today,
        total: staffUsers.length,
        marked: staffUsers.length,
        present: 0,
        errors: 0,
        holiday: todayHolidayName,
        message: `${today} marked as HOLIDAY for all staff (${todayHolidayName})`
      };
    }
    
    // Skip if not a working day
    if (!isWorkingDay(today)) {
      console.log(`🗓️ Skipping auto-mark: ${today} is not a working day`);
      return { total: 0, marked: 0, errors: 0, message: "Not a working day" };
    }

    // Get shift times for today
    const { shiftStart, shiftEnd } = await getShiftForDate(today);

    console.log(`📋 Auto-marking attendance for ${staffUsers.length} staff members (Date: ${today})`);

    let markedCount = 0;
    let errorCount = 0;

    for (const staff of staffUsers) {
      try {
        // Check if attendance record exists for today
        const existingRecord = await Attendance.findOne({ 
          userId: staff._id, 
          date: today 
        });

        if (!existingRecord) {
          // No record exists → Create ABSENT record
          await Attendance.create({
            userId: staff._id,
            date: today,
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
        } else if (!existingRecord.checkIn) {
          // Record exists but no check-in → Update to ABSENT
          await Attendance.findByIdAndUpdate(existingRecord._id, {
            $set: {
              status: "ABSENT",
              totalHours: 0,
              checkOut: ""
            }
          });

          console.log(`  ❌ ${staff.name} - ABSENT (No check-in recorded)`);
          markedCount++;
        } else {
          // Check-in exists, verify status
          // Check if they forgot to check out
          if (existingRecord.checkIn && !existingRecord.checkOut && isAfterShiftEnd(shiftEnd)) {
            // Checked in but forgot to check out after shift end
            await Attendance.findByIdAndUpdate(existingRecord._id, {
              $set: {
                status: "ABSENT",
                totalHours: 0,
                checkOut: "" // Keep empty to indicate forgot to check out
              }
            });

            console.log(`  ⚠️ ${staff.name} - ABSENT (Forgot to check out - Checked in at ${existingRecord.checkIn})`);
            markedCount++;
          } else {
            // Status should already be set from check-in, but verify it.
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

            // Update status if different
            if (existingRecord.status !== status) {
              await Attendance.findByIdAndUpdate(existingRecord._id, {
                $set: {
                  status,
                  totalHours
                }
              });

              console.log(`  ✓ ${staff.name} - ${status}`);
            }
          }
        }
      } catch (error) {
        console.error(
          `  ⚠️ Error marking ${staff.name} as absent:`,
          error.message
        );
        errorCount++;
      }
    }

    const result = {
      date: today,
      total: staffUsers.length,
      marked: markedCount,
      present: staffUsers.length - markedCount - errorCount,
      errors: errorCount,
      message: `Marked ${markedCount} as ABSENT out of ${staffUsers.length} staff`
    };

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

/**
 * Generate daily attendance summary report
 * Shows: Total staff, Present, Half Day, Absent, Short Hours, Not marked
 */
export async function getAttendanceSummaryForToday() {
  try {
    const today = new Date().toISOString().split('T')[0];

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
    { upsert: true, new: true }
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