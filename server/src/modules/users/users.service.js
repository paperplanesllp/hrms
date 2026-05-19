import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { User } from "./User.model.js";
import { ROLES, normalizeRole } from "../../middleware/roles.js";
import { isOrphanEmailConflict, safeDeleteOrphanUser } from "../companies/orphan.service.js";

function getEmailDomain(email = "") {
  const parts = String(email || "").trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] ? parts[1] : "";
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRoleFilter(roleFilter = null) {
  const requestedRoles = String(roleFilter || "")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter(Boolean);

  return requestedRoles.filter((role) => Object.values(ROLES).includes(role));
}

export async function createUser(data) {
  const email = String(data.email || "").trim().toLowerCase();
  const exists = await User.findOne({ email });
  
  if (exists) {
    // Check if it's an orphan user (belongs to non-existent company)
    const orphanUser = await isOrphanEmailConflict(email);
    if (orphanUser) {
      // Safely delete the orphan user to allow new user creation
      console.info("[CREATE_USER] Found orphan user with conflicting email. Auto-deleting orphan...", {
        email,
        orphanCompanyId: String(orphanUser.companyId),
      });
      await safeDeleteOrphanUser(email, true);
    } else {
      // Email belongs to a real user in an existing company
      throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
    }
  }

  if (!data.companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company is required");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    name: data.name,
    email,
    companyId: data.companyId,
    phone: data.phone || "",
    role: data.role,
    passwordHash,
    profileImageUrl: data.profileImageUrl || "",
    gender: data.gender || null,
    dateOfBirth: data.dateOfBirth || null,
    emergencyContact: data.emergencyContact || "",
    maritalStatus: data.maritalStatus || null,
    nationality: data.nationality || "",
    bloodGroup: data.bloodGroup || null,
    departmentId: data.departmentId || null,
    designationId: data.designationId || null,
    officeLatitude: data.officeLatitude || 0,
    officeLongitude: data.officeLongitude || 0
  });

  return user;
}

export async function listUsers(
  requestingUserRole = null,
  currentUserId = null,
  departmentId = null,
  companyId = null,
  roleFilter = null,
  requesterEmail = ""
) {
  requestingUserRole = normalizeRole(requestingUserRole);

  // Exclude terminated users from shared lists.
  const query = {
    role: { $nin: ["TERMINATED"] },
    $or: [
      { accountType: { $ne: "TEMPORARY" } },
      { accountType: "TEMPORARY", approvalStatus: "APPROVED" },
    ],
  };

  // Handle company filtering based on role
  if (requestingUserRole === ROLES.ADMIN || requestingUserRole === ROLES.SUPERADMIN) {
    // ADMIN/SUPERADMIN: can view all users (optionally scoped to companyId if provided)
    if (companyId) {
      query.companyId = companyId;
    }
  } else if (requestingUserRole === ROLES.HR) {
    // HR: must be scoped to their company
    if (!companyId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "HR company could not be resolved");
    }
    query.companyId = companyId;
  } else if (requestingUserRole === ROLES.USER) {
    query._id = currentUserId;
  }

  // Filter by department if provided
  if (departmentId) {
    query.departmentId = departmentId;
  }

  // Handle role filtering
  let allowedRoles = normalizeRoleFilter(roleFilter);
  
  if (requestingUserRole === ROLES.ADMIN || requestingUserRole === ROLES.SUPERADMIN) {
    // ADMIN/SUPERADMIN: if no roles specified, default to [USER, HR]
    // if roles specified, use them but filter out ADMIN/SUPERADMIN
    if (allowedRoles.length === 0) {
      allowedRoles = [ROLES.USER, ROLES.HR];
    } else {
      // Remove ADMIN/SUPERADMIN from the filter for non-admins to see
      allowedRoles = allowedRoles.filter(role => role === ROLES.USER || role === ROLES.HR);
    }
  } else if (requestingUserRole === ROLES.HR) {
    // HR: can only see USER role
    allowedRoles = [ROLES.USER];
  } else if (requestingUserRole === ROLES.USER) {
    allowedRoles = [ROLES.USER];
  }

  if (allowedRoles.length > 0) {
    query.role = { $in: allowedRoles };
  }

  // Backfill company ID for users with matching email domain (if applicable)
  const requesterDomain = getEmailDomain(requesterEmail);
  if (companyId && requesterDomain) {
    const backfillQuery = {
      $or: [{ companyId: null }, { companyId: { $exists: false } }],
      email: { $regex: `@${escapeRegex(requesterDomain)}$`, $options: "i" },
      role: allowedRoles.length > 0 ? { $in: allowedRoles } : { $nin: [ROLES.SUPERADMIN, ROLES.ADMIN] },
    };

    await User.updateMany(backfillQuery, { $set: { companyId } });
  }

  return User.find(query)
    .select("-passwordHash -refreshTokenHash")
    .sort({ createdAt: -1 });
}

export async function listAssignableUsers(departmentId = null, companyId = null) {
  if (!companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company is required");
  }

  const query = {
    companyId,
    role: { $nin: ["SUPERADMIN"] },
    $or: [
      { accountType: { $ne: "TEMPORARY" } },
      { accountType: "TEMPORARY", approvalStatus: "APPROVED" },
    ],
  };

  if (departmentId) {
    query.departmentId = departmentId;
  }

  return User.find(query)
    .select("-passwordHash -refreshTokenHash")
    .sort({ name: 1, email: 1 });
}

export async function getUserById(id, companyId = null) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID");
  }

  const user = await User.findOne({
    _id: id,
    ...(companyId ? { companyId } : {}),
  }).select("-passwordHash -refreshTokenHash");
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  return user;
}

export async function updateUser(id, patch) {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: patch },
    { returnDocument: 'after' }
  ).select("-passwordHash -refreshTokenHash");

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  return user;
}

export async function unlockUserAccount(id, companyId = null) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID");
  }

  const user = await User.findOneAndUpdate(
    {
      _id: id,
      ...(companyId ? { companyId } : {}),
    },
    {
      $set: {
        loginAttempts: 0,
        failedLoginAttempts: 0,
        lockUntil: null,
        isLocked: false,
        accountLocked: false,
      },
    },
    { returnDocument: "after" }
  ).select("-passwordHash -refreshTokenHash");

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new ApiError(StatusCodes.BAD_REQUEST, "Current password is incorrect");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
}

export async function listPendingTemporaryUsers(companyId = null) {
  return User.find({
    ...(companyId ? { companyId } : {}),
    accountType: "TEMPORARY",
    approvalStatus: "PENDING",
  })
    .select("name email phone createdAt approvalStatus accountType")
    .sort({ createdAt: -1 });
}

export async function approveTemporaryUser(
  userId,
  approverId,
  approvalNote = "",
  officeLatitude = null,
  officeLongitude = null,
  companyId = null
) {
  const user = await User.findOne({
    _id: userId,
    accountType: "TEMPORARY",
    ...(companyId ? { companyId } : {}),
  });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "Temporary user not found");

  user.approvalStatus = "APPROVED";
  user.approvedBy = approverId;
  user.approvedAt = new Date();
  user.approvalNote = approvalNote || "Approved by HR";

  if (typeof officeLatitude === "number" && typeof officeLongitude === "number") {
    user.officeLatitude = officeLatitude;
    user.officeLongitude = officeLongitude;
  }

  await user.save();
  return user;
}

export async function rejectTemporaryUser(userId, approverId, approvalNote = "", companyId = null) {
  const user = await User.findOne({
    _id: userId,
    accountType: "TEMPORARY",
    ...(companyId ? { companyId } : {}),
  });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "Temporary user not found");

  user.approvalStatus = "REJECTED";
  user.approvedBy = approverId;
  user.approvedAt = new Date();
  user.approvalNote = approvalNote || "Rejected by HR";
  await user.save();
  return user;
}

export async function convertTemporaryToPermanent(userId, converterId, payload, companyId = null) {
  const user = await User.findOne({
    _id: userId,
    accountType: "TEMPORARY",
    ...(companyId ? { companyId } : {}),
  });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Temporary user not found");
  }

  if (user.approvalStatus !== "APPROVED") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only approved temporary users can be converted to permanent"
    );
  }

  const existingEmployeeId = await User.findOne({
    employeeId: payload.employeeId,
    _id: { $ne: userId },
  });

  if (existingEmployeeId) {
    throw new ApiError(StatusCodes.CONFLICT, "Employee ID already exists");
  }

  user.employeeId = payload.employeeId;
  user.departmentId = payload.departmentId || null;
  user.designationId = payload.designationId || null;
  user.salaryBand = payload.salaryBand;
  user.joiningDate = payload.joiningDate ? new Date(payload.joiningDate) : null;

  user.accountType = "EMPLOYEE";
  user.role = "USER";

  user.temporaryRecord = {
    wasTemporary: true,
    registeredAt: user.createdAt,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy,
    approvalNote: user.approvalNote || "",
    convertedAt: new Date(),
    convertedBy: converterId,
  };

  await user.save();
  return user;
}
