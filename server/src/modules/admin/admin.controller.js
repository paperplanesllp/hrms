import { asyncHandler } from "../../utils/asyncHandler.js";
import * as adminService from "./admin.service.js";

/**
 * GET /admin/users - Get all users (with optional role filter)
 * Query params: role=ADMIN|HR|STAFF|USER
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  console.log("🔍 [ADMIN] GET /admin/users called with role filter:", role);
  const users = await adminService.getAllUsers(req.user.role, role);
  console.log("🔍 [ADMIN] Returning", users.length, "users with role filter:", role);
  console.log("🔍 [ADMIN] Users data:", users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
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
  const leaves = await adminService.getHRLeaveRequests();
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
  const records = await adminService.getAllAttendance(filters);
  res.json(records);
});

/**
 * GET /admin/late-arrivals - Get late arrivals
 */
export const getLateArrivals = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const records = await adminService.getLateArrivals(startDate, endDate);
  res.json(records);
});

/**
 * GET /admin/payroll - Get all payroll records
 */
export const getPayroll = asyncHandler(async (req, res) => {
  const records = await adminService.getAllPayroll(req.user.role);
  res.json(records);
});

/**
 * GET /admin/worksheets - Get all worksheets
 */
export const getWorksheets = asyncHandler(async (req, res) => {
  const records = await adminService.getAllWorksheets();
  res.json(records);
});

/**
 * GET /admin/stats - Get system statistics
 */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getSystemStats();
  res.json(stats);
});

/**
 * GET /admin/hr-team - Get all HR team members
 */
export const getHRTeam = asyncHandler(async (req, res) => {
  const hrTeam = await adminService.getHRTeam();
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
  
  const company = await adminService.setCompanyLocation(latitude, longitude);
  res.json({ 
    message: "Company location updated",
    location: company 
  });
});

/**
 * GET /admin/company-location - Get company/office location
 */
export const getCompanyLocation = asyncHandler(async (req, res) => {
  const company = await adminService.getCompanyLocation();
  res.json(company);
});

/**
 * POST /admin/working-days - Set company working days
 * Only admin can set this
 * Body: { workingDays: [1,2,3,4,5] } where 0=Sun, 1=Mon, ..., 6=Sat
 */
export const setWorkingDays = asyncHandler(async (req, res) => {
  const { workingDays } = req.body;
  
  if (!Array.isArray(workingDays)) {
    throw new Error("workingDays must be an array");
  }
  
  const result = await adminService.setWorkingDays(workingDays);
  res.json({ 
    message: "Working days configuration updated",
    data: result 
  });
});

/**
 * GET /admin/working-days - Get company working days configuration
 */
export const getWorkingDays = asyncHandler(async (req, res) => {
  const result = await adminService.getWorkingDays();
  res.json(result);
});
