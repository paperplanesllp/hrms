import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { User } from "../users/User.model.js";
import { createActivityLog } from "../activity/activity.service.js";
import { send2FAOtpEmail } from "../../utils/twoFAEmailService.js";
import { env } from "../../config/env.js";

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit OTP
 */
function generate2FAOTP() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Hash OTP for secure storage
 * @param {string} code - OTP code to hash
 * @returns {string} SHA256 hash of OTP
 */
function hashOTP(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Enable 2FA for a user
 * @param {string} userId - User ID
 * @returns {object} Response with success message
 */
export async function enable2FA(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is already enabled");
  }

  user.twoFactorEnabled = true;
  await user.save();

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "2FA_ENABLED",
    module: "SECURITY",
    description: `${user.name} enabled Two-Factor Authentication`,
    metadata: { email: user.email },
  });

  return {
    message: "2FA has been enabled successfully",
    twoFactorEnabled: true,
  };
}

/**
 * Disable 2FA for a user
 * @param {string} userId - User ID
 * @param {string} password - User's current password (for verification)
 * @returns {object} Response with success message
 */
export async function disable2FA(userId, password) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled");
  }

  // Verify password before disabling 2FA
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid password");
  }

  // Clear all 2FA data
  user.twoFactorEnabled = false;
  user.otpCodeHash = "";
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;
  await user.save();

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "2FA_DISABLED",
    module: "SECURITY",
    description: `${user.name} disabled Two-Factor Authentication`,
    metadata: { email: user.email },
  });

  return {
    message: "2FA has been disabled successfully",
    twoFactorEnabled: false,
  };
}

/**
 * Request OTP for login (after email/password verification)
 * @param {string} userId - User ID (from password verification step)
 * @returns {object} Response with OTP sent confirmation
 */
export async function requestLoginOTP(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled for this user");
  }

  // Check rate limiting - only allow OTP request after 30 seconds
  if (user.otpLastSentAt && Date.now() - new Date(user.otpLastSentAt).getTime() < 30_000) {
    const remainingSeconds = Math.ceil(
      (30_000 - (Date.now() - new Date(user.otpLastSentAt).getTime())) / 1000
    );
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Please wait ${remainingSeconds} seconds before requesting another OTP`
    );
  }

  // Generate new OTP
  const otp = generate2FAOTP();
  const otpHash = hashOTP(otp);

  // Save OTP to database
  user.otpCodeHash = otpHash;
  user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
  user.otpAttempts = 0; // Reset attempts for new OTP
  user.otpLastSentAt = new Date();
  await user.save();

  // Send OTP via email
  await send2FAOtpEmail({
    toEmail: user.email,
    otp,
    name: user.name,
    expiryMinutes: 5,
  });

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "OTP_SENT",
    module: "SECURITY",
    description: `OTP sent to ${user.email} for 2FA login`,
    metadata: { email: user.email },
  });

  // Return success response
  const payload = {
    message: "OTP sent to your email",
    expiresInSeconds: 300,
  };

  // In development, include OTP for testing
  if (env.NODE_ENV !== "production") {
    payload.debugOtp = otp;
  }

  return payload;
}

/**
 * Verify OTP for login
 * @param {string} userId - User ID
 * @param {string} otp - OTP entered by user
 * @param {boolean} rememberMe - Remember device flag
 * @returns {object} Object containing validation status and whether to proceed with login
 */
export async function verify2FAOTP(userId, otp, rememberMe = false) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled for this user");
  }

  // Check if OTP exists and hasn't expired
  if (!user.otpCodeHash || !user.otpExpiresAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No OTP request found. Please request a new OTP");
  }

  if (user.otpExpiresAt < new Date()) {
    // Clear expired OTP
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    // Log the activity
    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "OTP_FAILED",
      module: "SECURITY",
      description: `OTP verification failed - OTP expired`,
      metadata: { email: user.email, reason: "expired" },
    });

    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired. Please request a new OTP");
  }

  // Check attempt limit (5 attempts max)
  if ((user.otpAttempts || 0) >= 5) {
    // Clear OTP after max attempts
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    // Log the activity
    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "OTP_FAILED",
      module: "SECURITY",
      description: `OTP verification failed - Too many attempts`,
      metadata: { email: user.email, reason: "too_many_attempts", attempts: 5 },
    });

    throw new ApiError(
      StatusCodes.LOCKED,
      "Too many invalid OTP attempts. Please request a new OTP"
    );
  }

  // Verify OTP
  const submittedHash = hashOTP(otp);
  if (submittedHash !== user.otpCodeHash) {
    // Increment failed attempts
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();

    // Log the activity
    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "OTP_FAILED",
      module: "SECURITY",
      description: `OTP verification failed - Invalid OTP (Attempt ${user.otpAttempts}/5)`,
      metadata: { email: user.email, reason: "invalid", attempts: user.otpAttempts },
    });

    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      `Invalid OTP. ${5 - user.otpAttempts} attempts remaining`
    );
  }

  // OTP is valid - clear OTP data and prepare for token generation
  user.otpCodeHash = "";
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;
  user.isActive = true;
  await user.save();

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "OTP_VERIFIED",
    module: "SECURITY",
    description: `2FA login successful via OTP${rememberMe ? " (Remember Me enabled)" : ""}`,
    metadata: { email: user.email, rememberMe },
  });

  return {
    valid: true,
    message: "OTP verified successfully",
    rememberMe,
  };
}

/**
 * Get 2FA status for a user
 * @param {string} userId - User ID
 * @returns {object} 2FA status
 */
export async function get2FAStatus(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return {
    twoFactorEnabled: user.twoFactorEnabled || false,
    email: user.email,
  };
}

/**
 * Request OTP for disabling 2FA (verification step)
 * @param {string} userId - User ID
 * @returns {object} Response with OTP sent confirmation
 */
export async function requestDisable2FAOTP(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled");
  }

  // Check rate limiting - only allow OTP request after 30 seconds
  if (
    user.disable2FAOtpLastSentAt &&
    Date.now() - new Date(user.disable2FAOtpLastSentAt).getTime() < 30_000
  ) {
    const remainingSeconds = Math.ceil(
      (30_000 - (Date.now() - new Date(user.disable2FAOtpLastSentAt).getTime())) / 1000
    );
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Please wait ${remainingSeconds} seconds before requesting another OTP`
    );
  }

  // Generate OTP for disabling 2FA
  const otp = generate2FAOTP();
  const otpHash = hashOTP(otp);

  // Save OTP to a separate field for disable 2FA flow
  user.disable2FAOtpHash = otpHash;
  user.disable2FAOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  user.disable2FAOtpAttempts = 0;
  user.disable2FAOtpLastSentAt = new Date();
  await user.save();

  // Send OTP via email
  await send2FAOtpEmail({
    toEmail: user.email,
    otp,
    name: user.name,
    expiryMinutes: 5,
    context: "disable",
  });

  return {
    message: "OTP sent to your email for verification",
    expiresInSeconds: 300,
    debugOtp: env.NODE_ENV !== "production" ? otp : undefined,
  };
}

/**
 * Verify OTP for disabling 2FA
 * @param {string} userId - User ID
 * @param {string} otp - OTP code
 * @returns {object} Response indicating 2FA has been disabled
 */
export async function verifyDisable2FAOTP(userId, otp) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled");
  }

  // Check if OTP exists and hasn't expired
  if (!user.disable2FAOtpHash || !user.disable2FAOtpExpiresAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No OTP found. Please request a new OTP");
  }

  if (user.disable2FAOtpExpiresAt < new Date()) {
    user.disable2FAOtpHash = "";
    user.disable2FAOtpExpiresAt = null;
    user.disable2FAOtpAttempts = 0;
    await user.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired");
  }

  // Check attempt limit
  if ((user.disable2FAOtpAttempts || 0) >= 5) {
    user.disable2FAOtpHash = "";
    user.disable2FAOtpExpiresAt = null;
    user.disable2FAOtpAttempts = 0;
    await user.save();
    throw new ApiError(StatusCodes.LOCKED, "Too many invalid attempts. Please request a new OTP");
  }

  // Verify OTP
  const submittedHash = hashOTP(otp);
  if (submittedHash !== user.disable2FAOtpHash) {
    user.disable2FAOtpAttempts = (user.disable2FAOtpAttempts || 0) + 1;
    await user.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid OTP");
  }

  // OTP verified - disable 2FA
  user.twoFactorEnabled = false;
  user.otpCodeHash = "";
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;
  user.disable2FAOtpHash = "";
  user.disable2FAOtpExpiresAt = null;
  user.disable2FAOtpAttempts = 0;
  user.disable2FAOtpLastSentAt = null;
  await user.save();

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "2FA_DISABLED",
    module: "SECURITY",
    description: `${user.name} disabled Two-Factor Authentication`,
    metadata: { email: user.email },
  });

  return {
    message: "2FA has been disabled successfully",
    twoFactorEnabled: false,
  };
}
