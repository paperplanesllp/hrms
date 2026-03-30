import { Attendance } from "./Attendance.model.js";
import { Calendar } from "../calendar/Calendar.model.js";
import { User } from "../users/User.model.js";
import { env } from "../../config/env.js";
import { isWithinGeofence } from "../../utils/geofencing.js";
import { ROLES } from "../../middleware/roles.js";

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
  const diffMinutes = outMinutes - inMinutes;
  return Math.max(0, Math.round((diffMinutes / 60) * 100) / 100); // Round to 2 decimals
}

async function getShiftForDate(date) {
  try {
    const day = await Calendar.findOne({ date });
    return {
      shiftStart: day?.shiftStart || env.DEFAULT_SHIFT_START,
      shiftEnd: day?.shiftEnd || env.DEFAULT_SHIFT_END
    };
  } catch (error) {
    console.error("Error fetching shift:", error);
    return {
      shiftStart: env.DEFAULT_SHIFT_START,
      shiftEnd: env.DEFAULT_SHIFT_END
    };
  }
}

export async function markMyAttendance(userId, date, checkIn, checkOut, checkInLatitude, checkInLongitude) {
  try {
    const existing = await Attendance.findOne({ userId, date });
    const { shiftStart, shiftEnd } = await getShiftForDate(date);

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
      // Get employee's current location
      const employee = await User.findById(userId).select("officeLatitude officeLongitude");
      
      // Get company location from first admin marked as company location
      const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
      const adminUser = company || await User.findOne({ role: ROLES.ADMIN });
      
      if (adminUser && adminUser.officeLatitude !== 0 && adminUser.officeLongitude !== 0) {
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
          throw new Error(
            `You are ${geofenceCheck.distance}m away from office (${geofenceCheck.radius}m allowed). Cannot check in.`
          );
        }
      }
    }

    // Calculate total worked hours
    const totalHours = calculateTotalHours(newCheckIn, newCheckOut);

    // Determine status based on check-in/check-out and date
    let status = "PRESENT";
    
    if (!newCheckIn) {
      // No check-in means ABSENT
      status = "ABSENT";
    } else if (newCheckIn && !newCheckOut) {
      // Checked in but no check-out
      // If this is a past date, mark as ABSENT (forgot to checkout)
      const today = new Date().toISOString().split("T")[0];
      if (date < today) {
        // Past date with no checkout = ABSENT
        status = "ABSENT";
      } else {
        // Today or future - don't mark as absent yet (might checkout later)
        status = "PRESENT";
      }
    } else {
      // Checked in AND checked out - determine based on hours/timing
      // If checked in after shift start, mark as SHORT_HOURS (late arrival)
      if (compareTime(newCheckIn, shiftStart) > 0) {
        status = "SHORT_HOURS";
      } else {
        status = "PRESENT";
      }
    }

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
  
  // Recalculate status for past dates (in case they forgot to checkout)
  const today = new Date().toISOString().split("T")[0];
  return records.map(record => {
    // If it's a past date, has check-in but no check-out, mark as ABSENT
    if (record.date < today && record.checkIn && !record.checkOut) {
      return {
        ...record.toObject(),
        status: "ABSENT"
      };
    }
    return record;
  });
}

export async function getAllAttendance(from, to, userRole) {
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
    
    const query = { date: { $gte: fromDate, $lte: toDate } };
    
    // Get all attendance records with user details
    const records = await Attendance.find(query)
      .populate("userId", "name email role")
      .sort({ date: -1 });

    // Transform records to include user details and recalculate status for past dates
    const today = new Date().toISOString().split("T")[0];
    return records
      .filter(record => record.userId) // Filter out records without user (deleted users)
      .map(record => {
        // Recalculate status for past dates: if no checkout on a past date, mark as ABSENT
        let status = record.status;
        if (record.date < today && record.checkIn && !record.checkOut) {
          status = "ABSENT";
        }
        
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
          userRole: record.userId.role || "USER"
        };
      });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    throw error;
  }
}

function calculateShiftHours(shiftStart, shiftEnd) {
  if (!shiftStart || !shiftEnd) return "8h";
  const [startH, startM] = shiftStart.split(":").map(Number);
  const [endH, endM] = shiftEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const diffMinutes = endMinutes - startMinutes;
  const hours = Math.round((diffMinutes / 60) * 100) / 100;
  return `${hours}h`;
}

export async function editAttendanceHRorAdmin(userId, date, patch) {
  const doc = await Attendance.findOneAndUpdate(
    { userId, date },
    { $set: patch },
    { upsert: true, new: true }
  );
  return doc;
}

export async function editAttendanceById(recordId, patch) {
  const doc = await Attendance.findByIdAndUpdate(
    recordId,
    { $set: patch },
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
    
    // Skip if not a working day
    if (!isWorkingDay(today)) {
      console.log(`🗓️ Skipping auto-mark: ${today} is not a working day`);
      return { total: 0, marked: 0, errors: 0, message: "Not a working day" };
    }

    // Get shift times for today
    const { shiftStart, shiftEnd } = await getShiftForDate(today);

    // Get all staff users (non-admin)
    const staffUsers = await User.find({ 
      role: { $ne: ROLES.ADMIN },
      isActive: true 
    }).select("_id name email");

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
            // Status should already be set from check-in, but verify it
            const totalHours = calculateTotalHours(
              existingRecord.checkIn,
              existingRecord.checkOut
            );

            let status = "PRESENT";
            if (compareTime(existingRecord.checkIn, shiftStart) > 0) {
              status = "SHORT_HOURS"; // Checked in late
            }

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
 * Shows: Total staff, Present, Absent, Short Hours, Not marked
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
      absent: 0,
      shortHours: 0,
      notMarked: 0
    };

    // Populate counts from summary
    summary.forEach(item => {
      if (item._id === "PRESENT") result.present = item.count;
      if (item._id === "ABSENT") result.absent = item.count;
      if (item._id === "SHORT_HOURS") result.shortHours = item.count;
    });

    // Calculate not marked (no attendance record)
    const markedStaff = result.present + result.absent + result.shortHours;
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