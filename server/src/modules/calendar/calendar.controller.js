import { asyncHandler } from "../../utils/asyncHandler.js";
import { upsertCalendarSchema } from "./calendar.schemas.js";
import { getMonthlyAttendanceStatus, listCalendar, upsertCalendar, createEvent, getUserEvents, updateEvent, deleteEvent, getAttendanceHeatmap } from "./calendar.service.js";

/**
 * Get monthly attendance status with color coding
 * Query params: ?year=2025&month=2 (month is 0-indexed)
 */
export const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth();
  const userId = req.user.id;

  console.log(`📅 GET Monthly Attendance for user ${userId}: ${year}-${month + 1}`);

  const attendanceData = await getMonthlyAttendanceStatus(userId, year, month);

  console.log(`✅ Retrieved ${attendanceData.length} attendance records`);

  res.json({
    year,
    month,
    userId,
    data: attendanceData
  });
});

/**
 * Get calendar entries (legacy endpoint - kept for backward compatibility)
 */
export const getCalendar = asyncHandler(async (req, res) => {
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const rows = await listCalendar(from, to);
  res.json(rows);
});

/**
 * Update calendar entry (admin only - for managing shifts)
 */
export const putCalendar = asyncHandler(async (req, res) => {
  const data = upsertCalendarSchema.parse(req.body);
  const doc = await upsertCalendar(data);
  res.json({ calendar: doc });
});

/**
 * Create a personal calendar event
 * POST /calendar/events
 */
export const createEventHandler = asyncHandler(async (req, res) => {
  const { title, description, date, startTime, endTime, color, purpose } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!title || !date) {
    return res.status(400).json({
      error: "Title and date are required"
    });
  }

  console.log(`📅 Creating event for user ${userId}: "${title}" on ${date}`);

  const event = await createEvent({
    userId,
    userRole,
    title,
    description: description || "",
    date,
    startTime: startTime || "09:00",
    endTime: endTime || "10:00",
    color: color || "blue",
    purpose: purpose || "PERSONAL",
    status: "ACTIVE"
  });

  console.log(`✅ Event created successfully: ${event._id}`);

  res.status(201).json({
    success: true,
    event
  });
});

/**
 * Get user events for a date range
 * GET /calendar/events?startDate=2025-03-01&endDate=2025-03-31
 */
export const getEventsHandler = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: "startDate and endDate query parameters are required"
    });
  }

  console.log(`📅 Fetching events for user ${userId}: ${startDate} to ${endDate}`);

  const events = await getUserEvents(userId, startDate, endDate);

  console.log(`✅ Retrieved ${events.length} events`);

  res.json({
    success: true,
    events
  });
});

/**
 * Update event (drag-drop time updates)
 * PUT /calendar/events/:id
 */
export const updateEventHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const updateData = req.body;

  console.log(`📅 Updating event ${id} for user ${userId}`);

  const updatedEvent = await updateEvent(id, userId, userRole, updateData);

  console.log(`✅ Event updated successfully`);

  res.json({
    success: true,
    event: updatedEvent
  });
});

/**
 * Delete event (mark as CANCELLED)
 * DELETE /calendar/events/:id
 */
export const deleteEventHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  console.log(`📅 Deleting event ${id} for user ${userId}`);

  const deletedEvent = await deleteEvent(id, userId, userRole);

  console.log(`✅ Event deleted successfully`);

  res.json({
    success: true,
    message: "Event deleted",
    event: deletedEvent
  });
});

/**
 * Get attendance heatmap
 * GET /calendar/heatmap?startDate=2025-01-01&endDate=2025-12-31
 */
export const getHeatmapHandler = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: "startDate and endDate query parameters are required"
    });
  }

  console.log(`📊 Fetching heatmap for user ${userId}: ${startDate} to ${endDate}`);

  const heatmapData = await getAttendanceHeatmap(userId, startDate, endDate);

  console.log(`✅ Retrieved heatmap data with ${heatmapData.length} entries`);

  res.json({
    success: true,
    heatmap: heatmapData
  });
});