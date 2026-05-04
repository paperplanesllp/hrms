import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  temporaryRegisterSchema,
  temporaryOtpRequestSchema,
  temporaryOtpVerifySchema,
} from "./auth.schemas.js";
import {
  login,
  refresh,
  logout,
  signup,
  forgotPassword,
  resetPassword,
  registerTemporaryUser,
  requestTemporaryOtp,
  verifyTemporaryOtp,
} from "./auth.service.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const cookieBase = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};

export const postSignup = asyncHandler(async (req, res) => {
  console.log("📝 SIGNUP REQUEST RECEIVED:", req.body);
  
  try {
    const data = signupSchema.parse(req.body);
    const { rememberMe } = req.body;
    console.log("✅ VALIDATION PASSED:", data);

    const result = await signup({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      rememberMe: rememberMe || false,
    });

    console.log("✅ USER CREATED SUCCESSFULLY:", result.user);

    const cookieMaxAge = rememberMe 
      ? 90 * 24 * 60 * 60 * 1000  // 90 days for "Stay logged in"
      : 7 * 24 * 60 * 60 * 1000;  // 7 days for normal signup

    res.cookie("refreshToken", result.refreshToken, {
      ...cookieBase,
      maxAge: cookieMaxAge,
    });

    res.status(201).json({ accessToken: result.accessToken, user: result.user, rememberMe: result.rememberMe });
  } catch (error) {
    console.error("❌ SIGNUP ERROR CAUGHT:", error.message);
    throw error;
  }
});

export const postLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const { rememberMe } = req.body;
  const result = await login(data.email, data.password, rememberMe || false);

  // Handle 2FA requirement
  if (result.requiresTwoFactor) {
    // Don't set refresh token cookie for 2FA flow
    return res.json({
      requiresTwoFactor: true,
      message: result.message,
      tempToken: result.tempToken,
      userId: result.userId,
      userEmail: result.userEmail,
      expiresInSeconds: result.expiresInSeconds,
    });
  }

  // Normal login flow (no 2FA) - set refresh token cookie with expiry based on rememberMe preference
  const cookieMaxAge = rememberMe 
    ? 90 * 24 * 60 * 60 * 1000  // 90 days for "Stay logged in"
    : 7 * 24 * 60 * 60 * 1000;  // 7 days for normal login

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: cookieMaxAge,
  });

  res.json({ 
    requiresTwoFactor: false,
    accessToken: result.accessToken, 
    user: result.user, 
    rememberMe: result.rememberMe 
  });
});

export const postRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "No refresh token in cookies");
  }
  console.log("🔄 Refresh token received, validating...");
  const result = await refresh(token);
  console.log("✅ Refresh successful for user:", result.user.id);
  
  // ✅ REFRESH TOKEN ROTATION: Set the new refresh token in cookie
  const cookieMaxAge = result.rememberMe 
    ? 90 * 24 * 60 * 60 * 1000  // 90 days for "Stay logged in"
    : 7 * 24 * 60 * 60 * 1000;  // 7 days for normal session

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: cookieMaxAge,
  });

  res.json({ 
    accessToken: result.accessToken, 
    user: result.user,
    rememberMe: result.rememberMe 
  });
});

export const postLogout = asyncHandler(async (req, res) => {
  await logout(req.user.id);
  res.clearCookie("refreshToken", { ...cookieBase });
  res.json({ ok: true });
});

export const postForgotPassword = asyncHandler(async (req, res) => {
  const data = forgotPasswordSchema.parse(req.body);
  const result = await forgotPassword(data.email);
  res.json(result);
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);
  const result = await resetPassword(data.token, data.password);
  res.json(result);
});

export const postTemporaryRegister = asyncHandler(async (req, res) => {
  const data = temporaryRegisterSchema.parse(req.body);
  const result = await registerTemporaryUser(data);
  res.status(201).json(result);
});

export const postTemporaryRequestOtp = asyncHandler(async (req, res) => {
  const data = temporaryOtpRequestSchema.parse(req.body);
  const result = await requestTemporaryOtp(data.email);
  res.json(result);
});

export const postTemporaryVerifyOtp = asyncHandler(async (req, res) => {
  const data = temporaryOtpVerifySchema.parse(req.body);
  const { rememberMe } = req.body;
  const result = await verifyTemporaryOtp(data.email, data.otp, rememberMe || false);

  const cookieMaxAge = rememberMe 
    ? 90 * 24 * 60 * 60 * 1000  // 90 days for "Stay logged in"
    : 7 * 24 * 60 * 60 * 1000;  // 7 days for normal session

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: cookieMaxAge,
  });

  res.json({ accessToken: result.accessToken, user: result.user, rememberMe: result.rememberMe });
});