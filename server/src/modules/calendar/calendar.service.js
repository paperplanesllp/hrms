import { Attendance } from "../attendance/Attendance.model.js";
import { Leave } from "../leave/Leave.model.js";
import { Event } from "./Event.model.js";
import { User } from "../users/User.model.js";
import { ROLES } from "../../middleware/roles.js";

/**
 * Indian Public Holidays 2025
 */
const INDIAN_HOLIDAYS = [
  { date: "2025-01-26", name: "Republic Day" },
  { date: "2025-03-14", name: "Holi" },
  { date: "2025-03-31", name: "Eid ul-Fitr" },
  { date: "2025-04-10", name: "Mahavir Jayanti" },
  { date: "2025-04-14", name: "Ambedkar Jayanti" },
  { date: "2025-04-18", name: "Good Friday" },
  { date: "2025-05-01", name: "May Day" },
  { date: "2025-06-07", name: "Eid ul-Adha" },
  { date: "2025-08-15", name: "Independence Day" },
  { date: "2025-08-27", name: "Janmashtami" },
  { date: "2025-10-02", name: "Gandhi Jayanti" },
  { date: "2025-10-22", name: "Dussehra" },
  { date: "2025-11-01", name: "Diwali" },
  { date: "2025-11-05", name: "Guru Nanak Jayanti" },
  { date: "2025-12-25", name: "Christmas" }
];

/**
 * Calculate if attendance is short hours
 * Short hours if:
 * - Clock-in is after shift start (LATE)
 * - Clock-out is before shift end (EARLY)
 * - Total worked < shift hours
 */
function isShortHours(record) {
  if (!record.checkIn || !record.checkOut || !record.shiftStart || !record.shiftEnd) {
    return false;
  }

  const checkIn = new Date(`2000-01-01 ${record.checkIn}`);
  const checkOut = new Date(`2000-01-01 ${record.checkOut}`);
  const shiftStart = new Date(`2000-01-01 ${record.shiftStart}`);
  const shiftEnd = new Date(`2000-01-01 ${record.shiftEnd}`);

  // Check if late arrival
  const isLate = checkIn > shiftStart;

  // Check if early departure
  const isEarly = checkOut < shiftEnd;

  // Calculate worked hours
  const workedMs = checkOut - checkIn;
  const workedHours = workedMs / (1000 * 60 * 60);

  const requiredMs = shiftEnd - shiftStart;
  const requiredHours = requiredMs / (1000 * 60 * 60);

  // Return true if late or early or worked less than required
  return isLate || isEarly || (workedHours < requiredHours);
}

/**
 * Get company working days configuration
 * Returns array of day numbers [0-6] that are working days
 * Defaults to [1,2,3,4,5] (Monday-Friday)
 */
async function getCompanyWorkingDays() {
  try {
    const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
    
    if (!company) {
      const firstAdmin = await User.findOne({ role: ROLES.ADMIN });
      if (!firstAdmin) return [1, 2, 3, 4, 5]; // Default Monday-Friday
      return firstAdmin.workingDays || [1, 2, 3, 4, 5];
    }
    
    return company.workingDays || [1, 2, 3, 4, 5];
  } catch (error) {
    console.error("Error fetching working days config:", error);
    return [1, 2, 3, 4, 5]; // Default fallback
  }
}

/**
 * Get attendance status for a user for a given month
 * Returns array of dates with their status (PRESENT, SHORT_HOURS, or ABSENT) and holiday info
 * 
 * ABSENT if:
 * - User took an APPROVED leave
 * - No check-in activity (status is ABSENT)
 * - Public Holiday
 * - Non-working day (weekend)
 * 
 * SHORT_HOURS if:
 * - Clock-in is after shift start
 * - Clock-out is before shift end
 * - Total duration < required shift hours
 * 
 * PRESENT if:
 * - User checked in completely
 */
export async function getMonthlyAttendanceStatus(userId, year, month) {
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

  try {
    // Get working days configuration
    const workingDays = await getCompanyWorkingDays();

    // Get all attendance records for the month
    const attendanceRecords = await Attendance.find({
      userId,
      date: { $gte: monthStart, $lte: monthEnd }
    });

    // Get all APPROVED leaves for the month
    const approvedLeaves = await Leave.find({
      userId,
      status: "APPROVED",
      fromDate: { $lte: monthEnd },
      toDate: { $gte: monthStart }
    });

    // Build a map of dates -> {status, eventName}
    const statusMap = {};

    // Mark non-working days as "WEEKEND"
    const [startDate, endDate] = [new Date(monthStart), new Date(monthEnd)];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();
      
      if (!workingDays.includes(dayOfWeek)) {
        statusMap[dateStr] = { status: "WEEKEND", isWeekend: true };
      }
    }

    // Mark public holidays as ABSENT with holiday name
    INDIAN_HOLIDAYS.forEach((holiday) => {
      if (holiday.date >= monthStart && holiday.date <= monthEnd) {
        statusMap[holiday.date] = { status: "ABSENT", eventName: holiday.name, isHoliday: true };
      }
    });

    // Mark all leave dates as ABSENT
    approvedLeaves.forEach((leave) => {
      const [fromY, fromM, fromD] = leave.fromDate.split("-").map(Number);
      const [toY, toM, toD] = leave.toDate.split("-").map(Number);

      const from = new Date(fromY, fromM - 1, fromD);
      const to = new Date(toY, toM - 1, toD);

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (!statusMap[dateStr]?.eventName) {
          statusMap[dateStr] = { status: "ABSENT", isLeave: true };
        }
      }
    });

    // Mark attendance records
    attendanceRecords.forEach((record) => {
      // If holiday, don't override
      if (statusMap[record.date]?.eventName) return;
      // If leave already marked, don't override
      if (statusMap[record.date]?.isLeave) return;
      // If weekend, don't override
      if (statusMap[record.date]?.isWeekend) return;

      // Use the actual status from the record
      if (record.status === "ABSENT") {
        statusMap[record.date] = { status: "ABSENT", checkIn: null };
      } else if (record.status === "SHORT_HOURS") {
        statusMap[record.date] = { status: "SHORT_HOURS", checkIn: record.checkIn };
      } else if (record.status === "PRESENT") {
        statusMap[record.date] = { status: "PRESENT", checkIn: record.checkIn };
      }
    });

    // Convert to array format for frontend
    const result = Object.entries(statusMap).map(([date, data]) => ({
      date,
      status: data.status,
      ...(data.eventName && { eventName: data.eventName }),
      ...(data.checkIn && { checkIn: data.checkIn }),
      ...(data.isWeekend && { isWeekend: true }),
      ...(data.isHoliday && { isHoliday: true }),
      ...(data.isLeave && { isLeave: true })
    }));

    return result;
  } catch (error) {
    console.error("❌ Error in getMonthlyAttendanceStatus:", error);
    throw error;
  }
}

/**
 * Legacy calendar functions (kept for backward compatibility)
 */
export async function listCalendar(from, to) {
  return Attendance.find({
    date: { $gte: from, $lte: to }
  }).sort({ date: 1 });
}

export async function upsertCalendar(data) {
  return Attendance.findOneAndUpdate(
    { date: data.date },
    { $set: data },
    { upsert: true, new: true }
  );
}

/**
 * Create a user event (personal calendar event)
 */
export async function createEvent(eventData) {
  try {
    const event = new Event(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error("❌ Error creating event:", error);
    throw error;
  }
}

/**
 * Get user events for a specific date range
 */
export async function getUserEvents(userId, startDate, endDate) {
  try {
    const events = await Event.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      status: { $ne: "CANCELLED" }
    }).sort({ date: 1, startTime: 1 });

    return events;
  } catch (error) {
    console.error("❌ Error fetching user events:", error);
    throw error;
  }
}

/**
 * Update event (for drag-drop time updates)
 */
export async function updateEvent(eventId, userId, updateData) {
  try {
    const event = await Event.findOne({ _id: eventId, userId });
    if (!event) {
      throw new Error("Event not found");
    }

    if (updateData.startTime) event.startTime = updateData.startTime;
    if (updateData.endTime) event.endTime = updateData.endTime;
    if (updateData.date) event.date = updateData.date;
    if (updateData.title) event.title = updateData.title;
    if (updateData.description !== undefined) event.description = updateData.description;
    if (updateData.status) event.status = updateData.status;
    if (updateData.color) event.color = updateData.color;

    await event.save();
    return event;
  } catch (error) {
    console.error("❌ Error updating event:", error);
    throw error;
  }
}

/**
 * Delete event (mark as CANCELLED)
 */
export async function deleteEvent(eventId, userId) {
  try {
    const event = await Event.findOne({ _id: eventId, userId });
    if (!event) {
      throw new Error("Event not found");
    }

    event.status = "CANCELLED";
    await event.save();
    return event;
  } catch (error) {
    console.error("❌ Error deleting event:", error);
    throw error;
  }
}

/**
 * Get attendance heatmap data for GitHub-style visualization
 * Returns: array of dates with attendance status and intensity
 */
export async function getAttendanceHeatmap(userId, startDate, endDate) {
  try {
    const attendanceRecords = await Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const heatmap = attendanceRecords.map((record) => {
      let intensity = 0; // 0 = none, 1 = light, 2 = medium, 3 = high, 4 = full
      
      if (record.status === "PRESENT") {
        intensity = 4;
      } else if (record.status === "SHORT_HOURS") {
        intensity = 2;
      } else if (record.status === "ABSENT") {
        intensity = 0;
      }

      return {
        date: record.date,
        status: record.status,
        intensity,
        checkIn: record.checkIn,
        checkOut: record.checkOut
      };
    });

    return heatmap;
  } catch (error) {
    console.error("❌ Error fetching heatmap:", error);
    throw error;
  }
}