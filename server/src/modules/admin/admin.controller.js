import { asyncHandler } from "../../utils/asyncHandler.js";
import * as adminService from "./admin.service.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * GET /admin/users - Get all users (with optional role filter)
 * Query params: role=ADMIN|HR|STAFF|USER
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users = await adminService.getAllUsers(req.user.role, role, req.user.companyId);
  res.json(users);
});

/**
 * GET /admin/users/:id - Get single user
 */
export const getUser = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);
  res.json(user);
});

/**
 * DELETE /admin/users/:id - Terminate user
 */
export const terminateUser = asyncHandler(async (req, res) => {
  const user = await adminService.terminateUser(req.params.id);
  res.json({ message: "User terminated", user });
});

/**
 * GET /admin/hr-leaves - Get all HR leave requests
 */
export const getHRLeaves = asyncHandler(async (req, res) => {
  const leaves = await adminService.getHRLeaveRequests(req.user.companyId);
  res.json(leaves);
});

/**
 * PUT /admin/hr-leaves/:id - Approve/Reject HR leave
 */
export const updateHRLeave = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const leave = await adminService.updateHRLeaveStatus(req.params.id, status);
  res.json({ message: "Leave status updated", leave });
});

/**
 * GET /admin/attendance - Get all attendance records with filters
 */
export const getAttendance = asyncHandler(async (req, res) => {
  const filters = {
    date: req.query.date,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    status: req.query.status,
    userId: req.query.userId
  };
  const records = await adminService.getAllAttendance(filters, req.user.companyId);
  res.json(records);
});

/**
 * GET /admin/late-arrivals - Get late arrivals
 */
export const getLateArrivals = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const records = await adminService.getLateArrivals(startDate, endDate, req.user.companyId);
  res.json(records);
});

/**
 * GET /admin/payroll - Get all payroll records
 */
export const getPayroll = asyncHandler(async (req, res) => {
  const records = await adminService.getAllPayroll(req.user.role, req.user.companyId);
  res.json(records);
});

/**
 * GET /admin/worksheets - Get all worksheets
 */
export const getWorksheets = asyncHandler(async (req, res) => {
  const records = await adminService.getAllWorksheets(req.user.companyId);
  res.json(records);
});

/**
 * GET /admin/stats - Get system statistics
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getSystemStats(req.user.companyId);
  res.json(stats);
});

/**
 * GET /admin/hr-team - Get all HR team members
 */
export const getHRTeam = asyncHandler(async (req, res) => {
  const hrTeam = await adminService.getHRTeam(req.user.companyId);
  res.json(hrTeam);
});

/**
 * GET /admin/hr-team/discussions - Get all HR discussions
 */
export const getHRDiscussions = asyncHandler(async (req, res) => {
  const discussions = await adminService.getHRDiscussions();
  res.json(discussions);
});

/**
 * GET /admin/hr-team/meetings - Get all HR meetings
 */
export const getHRMeetings = asyncHandler(async (req, res) => {
  const meetings = await adminService.getHRMeetings();
  res.json(meetings);
});

/**
 * GET /admin/hr-team/activity - Get HR team activity
 */
export const getHRActivity = asyncHandler(async (req, res) => {
  const activity = await adminService.getHRActivity();
  res.json(activity);
});

/**
 * POST /admin/hr-team/meetings - Create HR meeting
 */
export const createHRMeeting = asyncHandler(async (req, res) => {
  const meeting = await adminService.createHRMeeting(req.user._id, req.body);
  res.status(201).json(meeting);
});

/**
 * PUT /admin/hr-team/meetings/:id - Update HR meeting
 */
export const updateHRMeeting = asyncHandler(async (req, res) => {
  const meeting = await adminService.updateHRMeeting(req.params.id, req.body);
  res.json(meeting);
});

/**
 * DELETE /admin/hr-team/meetings/:id - Delete HR meeting
 */
export const deleteHRMeeting = asyncHandler(async (req, res) => {
  await adminService.deleteHRMeeting(req.params.id);
  res.json({ message: "Meeting deleted" });
});

/**
 * POST /admin/hr-team/discussions/:id/reply - Add reply to discussion
 */
export const addHRDiscussionReply = asyncHandler(async (req, res) => {
  const reply = await adminService.addHRDiscussionReply(req.params.id, req.user._id, req.body.text);
  res.status(201).json(reply);
});

/**
 * POST /admin/company-location - Set company/office location
 * Only admin can set this
 */
export const setCompanyLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Invalid latitude or longitude");
  }
  const company = await adminService.setCompanyLocation(latitude, longitude, req.user.companyId, req.user.id);
  res.json({ message: "Company location updated", location: company });
});

export const getCompanyLocation = asyncHandler(async (req, res) => {
  const company = await adminService.getCompanyLocation(req.user.companyId, req.user.id);
  res.json(company);
});

/**
 * POST /admin/working-days - Set company working days
 * Only admin can set this
 * Body: { workingDays: [1,2,3,4,5] } where 0=Sun, 1=Mon, ..., 6=Sat
 */
export const setWorkingDays = asyncHandler(async (req, res) => {
  const { workingDays } = req.body;
  if (!Array.isArray(workingDays)) throw new Error("workingDays must be an array");
  const result = await adminService.setWorkingDays(workingDays, req.user.companyId, req.user.id);
  res.json({ message: "Working days configuration updated", data: result });
});

export const getWorkingDays = asyncHandler(async (req, res) => {
  const result = await adminService.getWorkingDays(req.user.companyId, req.user.id);
  res.json(result);
});

/**
 * POST /admin/company-timing - Set company shift timing
 * Only admin can set this
 * Body: { shiftStart: "09:30", shiftEnd: "18:30" }
 */
export const setCompanyTiming = asyncHandler(async (req, res) => {
  const { shiftStart, shiftEnd } = req.body;
  if (!shiftStart || !shiftEnd) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "shiftStart and shiftEnd are required");
  }
  const result = await adminService.setCompanyTiming(shiftStart, shiftEnd, req.user.companyId, req.user.id);
  res.json({ message: "Company timing updated", data: result });
});

export const getCompanyTiming = asyncHandler(async (req, res) => {
  const result = await adminService.getCompanyTiming(req.user.companyId, req.user.id);
  res.json(result);
});
