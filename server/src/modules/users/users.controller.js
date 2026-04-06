import { asyncHandler } from "../../utils/asyncHandler.js";
import { createUserSchema, updateUserSchema, updateMyProfileSchema } from "./users.schemas.js";
import { createUser, listUsers, getUserById, updateUser, changePassword } from "./users.service.js";
import { User } from "./User.model.js";
import { AuditLog } from "../audit/AuditLog.model.js";
import { ROLES } from "../../middleware/roles.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { createActivityLog } from "../activity/activity.service.js";
import { sendWelcomeEmail } from "../../utils/emailService.js";

export const createUserByAdmin = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  
  // HR can only create EMPLOYEE users
  if (req.user.role === ROLES.HR && data.role && data.role !== ROLES.USER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "HR can only create employee accounts");
  }
  
  // Default role to EMPLOYEE if not specified (especially for HR creating)
  if (!data.role) {
    data.role = ROLES.USER;
  }
  
  // Store the original password before it gets hashed in createUser
  const temporaryPassword = data.password;
  const creatorName = req.user.name;
  
  const user = await createUser(data);
  
  // Send welcome email to the newly created user
  const emailSent = await sendWelcomeEmail(
    user.email,
    user.name,
    temporaryPassword,
    creatorName,
    user.role
  );
  
  // Log user creation activity
  try {
    await createActivityLog({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      actionType: "USER_CREATE",
      module: "Users",
      description: `Created new ${user.role} user: ${user.name} (${user.email})`,
      targetUserId: user._id,
      targetUserName: user.name,
      metadata: { email: user.email, role: user.role }
    });
  } catch (logError) {
    console.error("Failed to log activity:", logError.message);
    // Don't fail the user creation if logging fails
  }
  
  res.status(201).json({ 
    user,
    emailNotification: {
      sent: emailSent,
      message: emailSent 
        ? `Welcome email sent to ${user.email}` 
        : `Account created but welcome email could not be sent to ${user.email}`
    }
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await listUsers(req.user.role);
  res.json(users);
});

export const changeUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "currentPassword and newPassword are required");
  }
  if (newPassword.length < 6) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "New password must be at least 6 characters");
  }
  await changePassword(req.user.id, currentPassword, newPassword);
  res.json({ message: "Password changed successfully" });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  res.json({ user });
});

export const get2FAStatus = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  res.json({ enabled: Boolean(user.twoFactorEnabled) });
});

export const toggle2FA = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid 2FA setting");
  }

  const user = await updateUser(req.user.id, { twoFactorEnabled: enabled });
  res.json({ enabled: Boolean(user.twoFactorEnabled) });
});

export const getActivityLog = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const activities = await AuditLog.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("-__v");

  res.json({ activities });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  res.json({ user });
});

export const patchUser = asyncHandler(async (req, res) => {
  const targetUser = await getUserById(req.params.id);

  // HR can only edit employee (USER role) accounts
  if (req.user.role === ROLES.HR && targetUser.role !== ROLES.USER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "HR can only edit employee accounts");
  }

  const patch = updateUserSchema.parse(req.body);

  // HR cannot assign ADMIN or HR roles
  if (req.user.role === ROLES.HR && patch.role && patch.role !== ROLES.USER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "HR cannot assign Admin or HR roles");
  }

  // Prevent duplicate email if it's being changed
  if (patch.email && patch.email !== targetUser.email) {
    const emailTaken = await User.findOne({ email: patch.email, _id: { $ne: req.params.id } });
    if (emailTaken) {
      throw new ApiError(StatusCodes.CONFLICT, "Email is already used by another account");
    }
  }

  // Strip undefined values to avoid unintentional overwrites
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const user = await updateUser(req.params.id, patch);

  try {
    await createActivityLog({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      actionType: "USER_UPDATE",
      module: "Users",
      description: `Updated employee profile: ${user.name} (${user.email})`,
      targetUserId: user._id,
      targetUserName: user.name,
      metadata: { updatedFields: Object.keys(patch) },
    });
  } catch (logError) {
    console.error("Failed to log activity:", logError.message);
  }

  res.json({ user });
});

// Update current user's own profile
export const updateMe = asyncHandler(async (req, res) => {
  // Use restricted schema to ensure users can only update safe fields
  const patch = updateMyProfileSchema.parse(req.body);
  
  // Remove empty string values to avoid overwriting with empty data
  Object.keys(patch).forEach((key) => {
    if (patch[key] === "") {
      delete patch[key];
    }
  });
  
  // Handle profile image upload
  if (req.file) {
    // Generate the image URL path
    const profileImageUrl = `/uploads/profile-images/${req.file.filename}`;
    patch.profileImageUrl = profileImageUrl;
  }
  
  const user = await updateUser(req.user.id, patch);

  // Log the profile update activity
  const updatedFields = Object.keys(patch).filter(key => !["profileImageUrl"].includes(key));
  if (updatedFields.length > 0) {
    const description = `${user.role} ${user.name} updated personal profile (${updatedFields.join(", ")})`;
    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "PROFILE_UPDATE",
      module: "PROFILE",
      description,
      metadata: { updatedFields, changes: patch },
    });
  }

  res.json({ user });
});

export const updateUserLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { officeLatitude, officeLongitude } = req.body;

  // Validate input
  if (typeof officeLatitude !== "number" || typeof officeLongitude !== "number") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid latitude or longitude");
  }

  // Ensure user can only update their own location (or admin can update anyone)
  if (req.user.id !== id && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You can only update your own location");
  }

  const user = await updateUser(id, {
    officeLatitude,
    officeLongitude,
  });

  res.json({ 
    user,
    message: "Location updated successfully" 
  });
});

// Update current user's real-time geolocation (called every 10 seconds)
export const updateCurrentLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy, timestamp } = req.body;

  // Validate input
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid latitude or longitude");
  }

  // Update current user's location
  const user = await updateUser(req.user.id, {
    currentLatitude: latitude,
    currentLongitude: longitude,
    currentLocationAccuracy: accuracy || null,
    lastLocationUpdate: timestamp || new Date(),
    isActive: true,
  });

  res.json({ 
    message: "Location updated successfully",
    location: {
      latitude: user.currentLatitude,
      longitude: user.currentLongitude,
      accuracy: user.currentLocationAccuracy,
      lastUpdate: user.lastLocationUpdate,
    }
  });
});

// Get active employees' real-time locations (HR & Admin only)
export const getActiveLocations = asyncHandler(async (req, res) => {
  // Only HR and Admin can view employee locations
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only HR and Admin can view employee locations");
  }

  // Get all employees with active location data
  const employees = await User.find({
    role: ROLES.USER,
    isActive: true,
    currentLatitude: { $ne: null },
    currentLongitude: { $ne: null }
  }).select("name email employeeId currentLatitude currentLongitude currentLocationAccuracy lastLocationUpdate isActive");

  res.json({ 
    employees,
    total: employees.length,
    timestamp: new Date().toISOString()
  });
});