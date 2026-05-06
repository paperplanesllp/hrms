import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import {
  enable2FA,
  disable2FA,
  requestLoginOTP,
  verify2FAOTP,
  get2FAStatus,
  requestDisable2FAOTP,
  verifyDisable2FAOTP,
} from "./twoFA.service.js";
import {
  request2FALoginOTP,
  verify2FALoginOTP,
} from "./auth.service.js";

/**
 * Get 2FA status for authenticated user
 * GET /auth/2fa/status
 */
export const get2FAStatusHandler = asyncHandler(async (req, res) => {
  const status = await get2FAStatus(req.user.id);
  res.json(status);
});

/**
 * Enable 2FA for authenticated user
 * POST /auth/2fa/enable
 */
export const enable2FAHandler = asyncHandler(async (req, res) => {
  const result = await enable2FA(req.user.id);
  res.json(result);
});

/**
 * Request OTP to disable 2FA
 * POST /auth/2fa/disable/request-otp
 */
export const requestDisable2FAOtpHandler = asyncHandler(async (req, res) => {
  const result = await requestDisable2FAOTP(req.user.id);
  res.json(result);
});

/**
 * Verify OTP and disable 2FA
 * POST /auth/2fa/disable/verify-otp
 * Body: { otp: "123456" }
 */
export const verifyDisable2FAOtpHandler = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  
  if (!otp || typeof otp !== "string") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP is required");
  }

  const result = await verifyDisable2FAOTP(req.user.id, otp);
  res.json(result);
});

/**
 * Request OTP for 2FA login (during login flow, after password verification)
 * POST /auth/2fa/login/request-otp
 * Body: { userId: "...", tempToken: "..." }
 */
export const request2FALoginOtpHandler = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId || typeof userId !== "string") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User ID is required");
  }

  const result = await request2FALoginOTP(userId);
  res.json(result);
});

/**
 * Verify OTP and complete 2FA login
 * POST /auth/2fa/login/verify-otp
 * Body: { userId: "...", otp: "123456", rememberMe: true }
 */
export const verify2FALoginOtpHandler = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const rememberMe = true;

  if (!userId || typeof userId !== "string") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User ID is required");
  }

  if (!otp || typeof otp !== "string") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP is required");
  }

  const result = await verify2FALoginOTP(userId, otp, rememberMe);

  // Set refresh token cookie
  const cookieBase = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
  };

  const cookieMaxAge = 90 * 24 * 60 * 60 * 1000;

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: cookieMaxAge,
  });

  // Return tokens and user info
  res.json({
    accessToken: result.accessToken,
    user: result.user,
    rememberMe: result.rememberMe,
  });
});

/**
 * Resend OTP for 2FA login
 * POST /auth/2fa/login/resend-otp
 * Body: { userId: "..." }
 */
export const resend2FALoginOtpHandler = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId || typeof userId !== "string") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User ID is required");
  }

  const result = await request2FALoginOTP(userId);
  res.json(result);
});
