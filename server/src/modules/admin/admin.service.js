import { User } from "../users/User.model.js";
import { Leave } from "../leave/Leave.model.js";
import { Attendance } from "../attendance/Attendance.model.js";
import { Payroll } from "../payroll/Payroll.model.js";
import { Worksheet } from "../worksheet/Worksheet.model.js";
import { ROLES } from "../../middleware/roles.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

// ─── Shared helper ────────────────────────────────────────────────────────────

async function getCompanyAdminUser(companyId, adminId = null) {
  if (adminId) {
    const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN });
    if (admin) return admin;
  }
  if (companyId) {
    const admin = await User.findOne({ role: ROLES.ADMIN, companyId });
    if (admin) return admin;
  }
  throw new ApiError(StatusCodes.NOT_FOUND, "No admin user found for this company");
}

function isValidTimeFormat(time) {
  return typeof time === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers(requestingUserRole, roleFilter = null, companyId = null) {
  let query = requestingUserRole === ROLES.HR ? { role: { $ne: ROLES.ADMIN } } : {};
  if (roleFilter) query.role = roleFilter.toUpperCase();
  if (companyId) query.companyId = companyId;
  return User.find(query).select("-passwordHash -refreshTokenHash").sort({ createdAt: -1 });
}

export async function getUserById(userId) {
  return User.findById(userId).select("-passwordHash -refreshTokenHash");
}

export async function terminateUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.role === ROLES.ADMIN) throw new Error("Cannot terminate admin");
  user.role = "TERMINATED";
  await user.save();
  return user;
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

export async function getHRLeaveRequests(companyId = null) {
  const query = { role: ROLES.HR };
  if (companyId) query.companyId = companyId;
  const hrUsers = await User.find(query).select("_id");
  return Leave.find({ userId: { $in: hrUsers.map(u => u._id) } })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 });
}

export async function updateHRLeaveStatus(leaveId, status) {
  const leave = await Leave.findById(leaveId).populate("userId", "role");
  if (!leave) throw new Error("Leave request not found");
  if (leave.userId.role !== ROLES.HR) throw new Error("Not an HR leave request");
  leave.status = status;
  await leave.save();
  return leave;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAllAttendance(filters = {}, companyId = null) {
  const query = {};

  if (filters.date) query.date = filters.date;
  if (filters.startDate && filters.endDate) {
    query.date = { $gte: filters.startDate, $lte: filters.endDate };
  }
  if (filters.status) query.status = filters.status;

  if (filters.userId) {
    if (companyId) {
      const userExists = await User.exists({ _id: filters.userId, companyId });
      if (!userExists) return [];
    }
    query.userId = filters.userId;
  } else if (companyId) {
    const companyUsers = await User.find({ companyId }).select("_id").lean();
    query.userId = { $in: companyUsers.map(u => u._id) };
  }

  const records = await Attendance.find(query)
    .populate("userId", "name email employeeId")
    .sort({ date: -1 });
  return records.filter(r => r.userId !== null);
}

export async function getLateArrivals(startDate, endDate, companyId = null) {
  const query = { status: "LATE" };
  if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
  if (companyId) {
    const companyUsers = await User.find({ companyId }).select("_id").lean();
    query.userId = { $in: companyUsers.map(u => u._id) };
  }
  return Attendance.find(query)
    .populate("userId", "name email employeeId")
    .sort({ date: -1 });
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export async function getAllPayroll(requestingUserRole, companyId = null) {
  let query = {};

  if (companyId) {
    const companyUsers = await User.find({ companyId }).select("_id").lean();
    query.userId = { $in: companyUsers.map(u => u._id) };
  }

  if (requestingUserRole === ROLES.HR) {
    const adminUsers = await User.find({ role: ROLES.ADMIN }).select("_id").lean();
    const adminIds = adminUsers.map(u => String(u._id));
    const existing = query.userId?.$in?.map(String) || null;
    query.userId = existing
      ? { $in: existing.filter(id => !adminIds.includes(id)) }
      : { $nin: adminUsers.map(u => u._id) };
  }

  return Payroll.find(query)
    .populate("userId", "name email employeeId")
    .sort({ month: -1 });
}

// ─── Worksheets ───────────────────────────────────────────────────────────────

export async function getAllWorksheets(companyId = null) {
  const query = {};
  if (companyId) {
    const companyUsers = await User.find({ companyId }).select("_id").lean();
    query.userId = { $in: companyUsers.map(u => u._id) };
  }
  return Worksheet.find(query)
    .populate("userId", "name email employeeId")
    .sort({ date: -1 });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getSystemStats(companyId = null) {
  const baseQuery = companyId ? { companyId } : {};
  const companyUsers = companyId
    ? (await User.find({ companyId }).select("_id").lean()).map(u => u._id)
    : null;

  const totalUsers = await User.countDocuments({ ...baseQuery, role: { $ne: "TERMINATED" } });
  const totalHR = await User.countDocuments({ ...baseQuery, role: ROLES.HR });

  const leaveQuery = companyUsers
    ? { status: "PENDING", userId: { $in: companyUsers } }
    : { status: "PENDING" };
  const pendingLeaves = await Leave.countDocuments(leaveQuery);

  const hrUsers = await User.find({ ...baseQuery, role: ROLES.HR }).select("_id").lean();
  const hrPendingLeaves = await Leave.countDocuments({
    status: "PENDING",
    userId: { $in: hrUsers.map(u => u._id) }
  });

  const today = new Date().toISOString().split("T")[0];
  const attendanceQuery = companyUsers
    ? { date: today, userId: { $in: companyUsers } }
    : { date: today };
  const todayAttendance = await Attendance.countDocuments(attendanceQuery);
  const todayLate = await Attendance.countDocuments({ ...attendanceQuery, status: "LATE" });

  return { totalUsers, totalHR, pendingLeaves, hrPendingLeaves, todayAttendance, todayLate };
}

// ─── Company Settings (all scoped by companyId) ───────────────────────────────

export async function setCompanyLocation(latitude, longitude, companyId, adminId) {
  const company = await getCompanyAdminUser(companyId, adminId);
  company.officeLatitude = latitude;
  company.officeLongitude = longitude;
  company.isCompanyLocation = true;
  await company.save();
  return {
    latitude: company.officeLatitude,
    longitude: company.officeLongitude,
    adminId: company._id,
    adminEmail: company.email
  };
}

export async function getCompanyLocation(companyId, adminId) {
  const company = await getCompanyAdminUser(companyId, adminId);
  return {
    latitude: company.officeLatitude || 0,
    longitude: company.officeLongitude || 0,
    adminId: company._id,
    adminEmail: company.email,
    isSet: !!company.officeLatitude && !!company.officeLongitude
  };
}

export async function setWorkingDays(workingDays, companyId, adminId) {
  if (!Array.isArray(workingDays) || workingDays.length === 0) {
    throw new Error("Working days must be a non-empty array");
  }
  if (!workingDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
    throw new Error("Working days must contain integers between 0-6");
  }
  const company = await getCompanyAdminUser(companyId, adminId);
  company.workingDays = workingDays.sort((a, b) => a - b);
  await company.save();
  return { workingDays: company.workingDays, adminId: company._id, adminEmail: company.email };
}

export async function getWorkingDays(companyId, adminId) {
  const company = await getCompanyAdminUser(companyId, adminId);
  return {
    workingDays: company.workingDays || [1, 2, 3, 4, 5],
    adminId: company._id,
    adminEmail: company.email
  };
}

export async function setCompanyTiming(shiftStart, shiftEnd, companyId, adminId) {
  if (!isValidTimeFormat(shiftStart) || !isValidTimeFormat(shiftEnd)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "shiftStart and shiftEnd must be in HH:MM format");
  }
  const company = await getCompanyAdminUser(companyId, adminId);
  company.companyShiftStart = shiftStart;
  company.companyShiftEnd = shiftEnd;
  await company.save();
  return {
    shiftStart: company.companyShiftStart,
    shiftEnd: company.companyShiftEnd,
    adminId: company._id,
    adminEmail: company.email
  };
}

export async function getCompanyTiming(companyId, adminId) {
  const company = await getCompanyAdminUser(companyId, adminId);
  return {
    shiftStart: company.companyShiftStart || env.DEFAULT_SHIFT_START,
    shiftEnd: company.companyShiftEnd || env.DEFAULT_SHIFT_END,
    adminId: company._id,
    adminEmail: company.email
  };
}

// ─── HR Team (in-memory, per-session) ────────────────────────────────────────

let hrDiscussions = [];
let hrMeetings = [];
let hrActivity = [];

export async function getHRTeam(companyId = null) {
  const query = { role: ROLES.HR };
  if (companyId) query.companyId = companyId;
  return User.find(query).select("_id name email profileImageUrl role").sort({ createdAt: -1 });
}

export async function getHRDiscussions() {
  return hrDiscussions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getHRMeetings() {
  return hrMeetings.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getHRActivity() {
  return hrActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
}

export async function createHRMeeting(userId, meetingData) {
  const { randomBytes } = await import("crypto");
  const organizer = await User.findById(userId).select("name email");
  const attendees = meetingData.attendees
    ? await User.find({ _id: { $in: meetingData.attendees } }).select("name email")
    : [];

  const meeting = {
    _id: randomBytes(12).toString("hex"),
    title: meetingData.title,
    description: meetingData.description,
    type: meetingData.type,
    date: meetingData.date,
    time: meetingData.time,
    location: meetingData.location || null,
    organizer,
    attendees,
    status: "scheduled",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  hrMeetings.push(meeting);
  hrActivity.push({
    type: "meeting",
    message: `${organizer.name} scheduled a meeting: "${meeting.title}"`,
    timestamp: new Date(),
    user: organizer
  });

  return meeting;
}

export async function updateHRMeeting(meetingId, updateData) {
  const idx = hrMeetings.findIndex(m => m._id === meetingId);
  if (idx === -1) throw new Error("Meeting not found");
  hrMeetings[idx] = { ...hrMeetings[idx], ...updateData, updatedAt: new Date() };
  return hrMeetings[idx];
}

export async function deleteHRMeeting(meetingId) {
  const idx = hrMeetings.findIndex(m => m._id === meetingId);
  if (idx === -1) throw new Error("Meeting not found");
  const meeting = hrMeetings.splice(idx, 1)[0];
  hrActivity.push({ type: "meeting", message: `Meeting cancelled: "${meeting.title}"`, timestamp: new Date() });
  return meeting;
}

export async function addHRDiscussionReply(discussionId, userId, replyText) {
  const { randomBytes } = await import("crypto");
  const author = await User.findById(userId).select("name email");
  const idx = hrDiscussions.findIndex(d => d._id === discussionId);
  if (idx === -1) throw new Error("Discussion not found");

  const reply = { _id: randomBytes(12).toString("hex"), text: replyText, author, createdAt: new Date() };
  if (!hrDiscussions[idx].replies) hrDiscussions[idx].replies = [];
  hrDiscussions[idx].replies.push(reply);
  hrActivity.push({ type: "reply", message: `${author.name} replied to discussion`, timestamp: new Date(), user: author });
  return reply;
}
