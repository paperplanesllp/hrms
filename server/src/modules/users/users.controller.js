import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createUserSchema,
  updateUserSchema,
  updateMyProfileSchema,
  convertTemporaryToPermanentSchema,
} from "./users.schemas.js";
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  changePassword,
  listPendingTemporaryUsers,
  approveTemporaryUser,
  rejectTemporaryUser,
  convertTemporaryToPermanent,
} from "./users.service.js";
import { User } from "./User.model.js";
import { AuditLog } from "../audit/AuditLog.model.js";
import { ROLES } from "../../middleware/roles.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { createActivityLog } from "../activity/activity.service.js";
import { sendWelcomeEmail } from "../../utils/emailService.js";
import { unlink } from "fs/promises";
import { isCloudinaryConfigured, uploadProfileImageToCloudinary } from "../../utils/cloudinary.js";

function requireCompanyId(req) {
  if (!req.user?.companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company is required");
  }
}

export const createUserByAdmin = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  requireCompanyId(req);
  
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
  
  const user = await createUser({ ...data, companyId: req.user.companyId });
  
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
  requireCompanyId(req);
  const { department } = req.query;
  const users = await listUsers(req.user.role, req.user.id, department, req.user.companyId);
  res.json(users);
});

export const getPendingTemporaryUsers = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  const users = await listPendingTemporaryUsers(req.user.companyId);
  res.json(users);
});

export const approveTemporaryRegistration = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  const note = String(req.body?.note || "").trim();
  const officeLatitude = Number(req.body?.officeLatitude);
  const officeLongitude = Number(req.body?.officeLongitude);

  if (!Number.isFinite(officeLatitude) || !Number.isFinite(officeLongitude)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "officeLatitude and officeLongitude are required for approval"
    );
  }

  const user = await approveTemporaryUser(
    req.params.id,
    req.user.id,
    note,
    officeLatitude,
    officeLongitude,
    req.user.companyId
  );

  try {
    await createActivityLog({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      actionType: "TEMP_APPROVAL",
      module: "Users",
      description: `Approved temporary user: ${user.name} (${user.email})`,
      targetUserId: user._id,
      targetUserName: user.name,
      metadata: {
        email: user.email,
        note: user.approvalNote,
        officeLatitude,
        officeLongitude,
      },
    });
  } catch (logError) {
    console.error("Failed to log temp approval activity:", logError.message);
  }

  res.json({ user });
});

export const rejectTemporaryRegistration = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  const note = String(req.body?.note || "").trim();
  const user = await rejectTemporaryUser(req.params.id, req.user.id, note, req.user.companyId);

  try {
    await createActivityLog({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      actionType: "TEMP_REJECTION",
      module: "Users",
      description: `Rejected temporary user: ${user.name} (${user.email})`,
      targetUserId: user._id,
      targetUserName: user.name,
      metadata: { email: user.email, note: user.approvalNote },
    });
  } catch (logError) {
    console.error("Failed to log temp rejection activity:", logError.message);
  }

  res.json({ user });
});

export const convertTemporaryUserToPermanent = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  const data = convertTemporaryToPermanentSchema.parse(req.body);

  const user = await convertTemporaryToPermanent(req.params.id, req.user.id, data, req.user.companyId);

  try {
    await createActivityLog({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      actionType: "TEMP_CONVERT_PERMANENT",
      module: "Users",
      description: `Converted temporary user to permanent: ${user.name} (${user.email})`,
      targetUserId: user._id,
      targetUserName: user.name,
      metadata: {
        employeeId: user.employeeId,
        departmentId: user.departmentId,
        designationId: user.designationId,
        salaryBand: user.salaryBand,
        joiningDate: user.joiningDate,
      },
    });
  } catch (logError) {
    console.error("Failed to log temporary conversion activity:", logError.message);
  }

  res.json({ user });
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
  const user = await getUserById(req.user.id, req.user.companyId || null);
  res.json({ user });
});

export const get2FAStatus = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id, req.user.companyId || null);
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
  requireCompanyId(req);
  const user = await getUserById(req.params.id, req.user.companyId);
  res.json({ user });
});

export const patchUser = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  const targetUser = await getUserById(req.params.id, req.user.companyId);

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
    if (!isCloudinaryConfigured()) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env"
      );
    }

    try {
      const uploadedImage = await uploadProfileImageToCloudinary(req.file.path, req.user.id);
      patch.profileImageUrl = uploadedImage.secure_url;
    } catch (error) {
      console.error("Cloudinary profile upload failed:", error.message);
      throw new ApiError(StatusCodes.BAD_GATEWAY, "Failed to upload profile image. Please try again.");
    } finally {
      await unlink(req.file.path).catch(() => null);
    }
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

  if (req.user.id !== id) {
    requireCompanyId(req);
    await getUserById(id, req.user.companyId);
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

  // Validate latitude and longitude ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid latitude or longitude values");
  }

  // Update current user's location
  const user = await updateUser(req.user.id, {
    currentLatitude: latitude,
    currentLongitude: longitude,
    currentLocationAccuracy: accuracy || null,
    lastLocationUpdate: timestamp || new Date(),
    isActive: true,
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

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

export const deleteUser = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  const targetUser = await getUserById(req.params.id, req.user.companyId);

  // Nobody can delete themselves
  if (req.user.id === String(targetUser._id)) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You cannot delete your own account");
  }

  // HR can only delete USER accounts
  if (req.user.role === ROLES.HR && targetUser.role !== ROLES.USER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "HR can only delete employee accounts");
  }

  // ADMIN can delete USER and HR accounts, but not other ADMINs
  if (req.user.role === ROLES.ADMIN && targetUser.role === ROLES.ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Admin accounts cannot be deleted");
  }

  await User.findByIdAndDelete(req.params.id);

  try {
    await createActivityLog({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      actionType: "USER_DELETE",
      module: "Users",
      description: `Deleted ${targetUser.role} user: ${targetUser.name} (${targetUser.email})`,
      targetUserId: targetUser._id,
      targetUserName: targetUser.name,
      metadata: { email: targetUser.email, role: targetUser.role },
    });
  } catch (logError) {
    console.error("Failed to log delete activity:", logError.message);
  }

  res.json({ message: "User deleted successfully" });
});

// Get active employees' real-time locations (HR & Admin only)
export const getActiveLocations = asyncHandler(async (req, res) => {
  requireCompanyId(req);
  // Only HR and Admin can view employee locations
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only HR and Admin can view employee locations");
  }

  // Get all employees with active location data
  const employees = await User.find({
    ...(req.user.companyId ? { companyId: req.user.companyId } : {}),
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