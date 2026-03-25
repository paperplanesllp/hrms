import { User } from "../users/User.model.js";
import { Leave } from "../leave/Leave.model.js";
import { Attendance } from "../attendance/Attendance.model.js";
import { Payroll } from "../payroll/Payroll.model.js";
import { Worksheet } from "../worksheet/Worksheet.model.js";
import { ROLES } from "../../middleware/roles.js";

/**
 * Get all users (Admin oversight)
 * HR can see all users except Admin
 * Optionally filter by role
 */
export async function getAllUsers(requestingUserRole, roleFilter = null) {
  let query = requestingUserRole === ROLES.HR 
    ? { role: { $ne: ROLES.ADMIN } } // HR cannot see Admin
    : {}; // Admin sees everyone
  
  // Apply role filter if provided
  if (roleFilter) {
    query.role = roleFilter.toUpperCase();
    console.log("🔍 [SERVICE] Role filter applied. Searching for role:", roleFilter.toUpperCase());
  }
  
  console.log("🔍 [SERVICE] MongoDB query:", JSON.stringify(query));
  const result = User.find(query).select("-passwordHash -refreshTokenHash").sort({ createdAt: -1 });
  const users = await result;
  console.log("🔍 [SERVICE] Found", users.length, "users matching query");
  return users;
}

/**
 * Get single user by ID
 */
export async function getUserById(userId) {
  return User.findById(userId).select("-passwordHash -refreshTokenHash");
}

/**
 * Terminate user (soft delete - preserve data)
 */
export async function terminateUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.role === ROLES.ADMIN) throw new Error("Cannot terminate admin");
  
  user.role = "TERMINATED";
  await user.save();
  return user;
}

/**
 * Get all HR leave requests for Admin approval
 */
export async function getHRLeaveRequests() {
  const hrUsers = await User.find({ role: ROLES.HR }).select("_id");
  const hrIds = hrUsers.map(u => u._id);
  
  return Leave.find({ userId: { $in: hrIds } })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 });
}

/**
 * Approve/Reject HR leave (Admin only)
 */
export async function updateHRLeaveStatus(leaveId, status) {
  const leave = await Leave.findById(leaveId).populate("userId", "role");
  if (!leave) throw new Error("Leave request not found");
  if (leave.userId.role !== ROLES.HR) throw new Error("Not an HR leave request");
  
  leave.status = status;
  await leave.save();
  return leave;
}

/**
 * Get all attendance records with late arrivals flagged
 */
export async function getAllAttendance(filters = {}) {
  const query = {};
  
  // Filter by date
  if (filters.date) query.date = filters.date;
  
  // Filter by date range
  if (filters.startDate && filters.endDate) {
    query.date = { $gte: filters.startDate, $lte: filters.endDate };
  }
  
  // Filter by status
  if (filters.status) query.status = filters.status;
  
  // Filter by user
  if (filters.userId) query.userId = filters.userId;
  
  return Attendance.find(query)
    .populate("userId", "name email employeeId")
    .sort({ date: -1 });
}

/**
 * Get late arrivals for disciplinary tracking
 */
export async function getLateArrivals(startDate, endDate) {
  const query = { status: "LATE" };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  return Attendance.find(query)
    .populate("userId", "name email employeeId")
    .sort({ date: -1 });
}

/**
 * Get all payroll records
 * HR can see all payroll except Admin's
 */
export async function getAllPayroll(requestingUserRole) {
  let query = {};
  
  if (requestingUserRole === ROLES.HR) {
    // HR cannot see Admin payroll - filter by userId
    const adminUsers = await User.find({ role: ROLES.ADMIN }).select("_id");
    const adminIds = adminUsers.map(u => u._id);
    query.userId = { $nin: adminIds };
  }
  
  return Payroll.find(query)
    .populate("userId", "name email employeeId")
    .sort({ month: -1 });
}

/**
 * Get all worksheets
 */
export async function getAllWorksheets() {
  return Worksheet.find()
    .populate("userId", "name email employeeId")
    .sort({ date: -1 });
}

/**
 * Get system-wide statistics
 */
export async function getSystemStats() {
  const totalUsers = await User.countDocuments({ role: { $ne: "TERMINATED" } });
  const totalHR = await User.countDocuments({ role: ROLES.HR });
  const pendingLeaves = await Leave.countDocuments({ status: "PENDING" });
  const hrPendingLeaves = await Leave.countDocuments({ 
    status: "PENDING",
    userId: { $in: await User.find({ role: ROLES.HR }).select("_id") }
  });
  
  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = await Attendance.countDocuments({ date: today });
  const todayLate = await Attendance.countDocuments({ date: today, status: "LATE" });
  
  return {
    totalUsers,
    totalHR,
    pendingLeaves,
    hrPendingLeaves,
    todayAttendance,
    todayLate
  };
}

/**
 * HR Team Premium Features
 */

// In-memory storage for HR team features (can be extended with MongoDB)
let hrDiscussions = [];
let hrMeetings = [];
let hrActivity = [];

/**
 * Get all HR team members
 */
export async function getHRTeam() {
  return User.find({ role: ROLES.HR })
    .select("_id name email profileImageUrl role")
    .sort({ createdAt: -1 });
}

/**
 * Get all HR discussions
 */
export async function getHRDiscussions() {
  return hrDiscussions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get all HR meetings
 */
export async function getHRMeetings() {
  return hrMeetings.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Get HR team activity feed
 */
export async function getHRActivity() {
  return hrActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
}

/**
 * Create HR meeting
 */
export async function createHRMeeting(userId, meetingData) {
  const organizer = await User.findById(userId).select("name email");
  const attendees = meetingData.attendees ? 
    await User.find({ _id: { $in: meetingData.attendees } }).select("name email") : 
    [];

  const meeting = {
    _id: require("crypto").randomBytes(12).toString("hex"),
    title: meetingData.title,
    description: meetingData.description,
    type: meetingData.type, // discussion, video-call, onsite
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

  // Add to activity
  hrActivity.push({
    type: "meeting",
    message: `${organizer.name} scheduled a meeting: "${meeting.title}"`,
    timestamp: new Date(),
    user: organizer
  });

  return meeting;
}

/**
 * Update HR meeting status
 */
export async function updateHRMeeting(meetingId, updateData) {
  const meetingIndex = hrMeetings.findIndex(m => m._id === meetingId);
  if (meetingIndex === -1) throw new Error("Meeting not found");

  hrMeetings[meetingIndex] = {
    ...hrMeetings[meetingIndex],
    ...updateData,
    updatedAt: new Date()
  };

  return hrMeetings[meetingIndex];
}

/**
 * Delete HR meeting
 */
export async function deleteHRMeeting(meetingId) {
  const meetingIndex = hrMeetings.findIndex(m => m._id === meetingId);
  if (meetingIndex === -1) throw new Error("Meeting not found");

  const meeting = hrMeetings[meetingIndex];
  hrMeetings.splice(meetingIndex, 1);

  // Add to activity
  hrActivity.push({
    type: "meeting",
    message: `Meeting cancelled: "${meeting.title}"`,
    timestamp: new Date()
  });

  return meeting;
}

/**
 * Add reply to discussion
 */
export async function addHRDiscussionReply(discussionId, userId, replyText) {
  const author = await User.findById(userId).select("name email");
  const discussionIndex = hrDiscussions.findIndex(d => d._id === discussionId);
  
  if (discussionIndex === -1) throw new Error("Discussion not found");

  const reply = {
    _id: require("crypto").randomBytes(12).toString("hex"),
    text: replyText,
    author,
    createdAt: new Date()
  };

  if (!hrDiscussions[discussionIndex].replies) {
    hrDiscussions[discussionIndex].replies = [];
  }

  hrDiscussions[discussionIndex].replies.push(reply);

  // Add to activity
  hrActivity.push({
    type: "reply",
    message: `${author.name} replied to discussion`,
    timestamp: new Date(),
    user: author
  });

  return reply;
}

/**
 * Set company/office location (latitude and longitude)
 * Stores this in the first admin user (company representative)
 */
export async function setCompanyLocation(latitude, longitude) {
  // Find the first admin user (company HQ)
  let company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
  
  if (!company) {
    // If no company location set yet, mark the first admin as company location
    company = await User.findOne({ role: ROLES.ADMIN });
  }
  
  if (!company) throw new Error("No admin user found to set company location");
  
  // Update coordinates
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

/**
 * Get company/office location
 */
export async function getCompanyLocation() {
  // Find the admin user marked as company location
  const company = await User.findOne({ role: ROLES.ADMIN, isCompanyLocation: true });
  
  if (!company) {
    // Fallback to first admin if no marker exists
    const firstAdmin = await User.findOne({ role: ROLES.ADMIN });
    if (!firstAdmin) throw new Error("No admin user found");
    
    return {
      latitude: firstAdmin.officeLatitude || 0,
      longitude: firstAdmin.officeLongitude || 0,
      adminId: firstAdmin._id,
      adminEmail: firstAdmin.email,
      isSet: firstAdmin.officeLatitude !== 0 && firstAdmin.officeLongitude !== 0
    };
  }
  
  return {
    latitude: company.officeLatitude,
    longitude: company.officeLongitude,
    adminId: company._id,
    adminEmail: company.email,
    isSet: company.officeLatitude !== 0 && company.officeLongitude !== 0
  };
}
