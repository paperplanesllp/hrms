import express from "express";
import { authLimiter } from "../../middleware/rateLimit.js";
import { requireSuperadminSecurity } from "../../middleware/superadminGuard.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  postSignup,
  postLogin,
  postSuperadminLogin,
  postRefresh,
  postLogout,
  postForgotPassword,
  postResetPassword,
  postTemporaryRegister,
  postTemporaryRequestOtp,
  postTemporaryVerifyOtp,
} from "./auth.controller.js";
import {
  get2FAStatusHandler,
  enable2FAHandler,
  requestDisable2FAOtpHandler,
  verifyDisable2FAOtpHandler,
  request2FALoginOtpHandler,
  verify2FALoginOtpHandler,
  resend2FALoginOtpHandler,
} from "./twoFA.controller.js";

const router = express.Router();

// ===== AUTHENTICATION ROUTES =====
// ✅ Public
router.post("/signup", authLimiter, postSignup);
router.post("/login", authLimiter, postLogin);
router.post("/superadmin/login", authLimiter, requireSuperadminSecurity, postSuperadminLogin);
router.post("/refresh", postRefresh);
router.post("/forgot-password", authLimiter, postForgotPassword);
router.post("/reset-password", authLimiter, postResetPassword);
router.post("/temporary/register", authLimiter, postTemporaryRegister);
router.post("/temporary/request-otp", authLimiter, postTemporaryRequestOtp);
router.post("/temporary/verify-otp", authLimiter, postTemporaryVerifyOtp);

// ✅ Protected
router.post("/logout", requireAuth, postLogout);

// ===== 2FA ROUTES =====
// ✅ Get 2FA status (protected)
router.get("/2fa/status", requireAuth, get2FAStatusHandler);

// ✅ Enable 2FA (protected)
router.post("/2fa/enable", requireAuth, authLimiter, enable2FAHandler);

// ✅ Disable 2FA flow (protected)
router.post("/2fa/disable/request-otp", requireAuth, authLimiter, requestDisable2FAOtpHandler);
router.post("/2fa/disable/verify-otp", requireAuth, authLimiter, verifyDisable2FAOtpHandler);

// ✅ 2FA Login flow (public - used during login)
router.post("/2fa/login/request-otp", authLimiter, request2FALoginOtpHandler);
router.post("/2fa/login/verify-otp", authLimiter, verify2FALoginOtpHandler);
router.post("/2fa/login/resend-otp", authLimiter, resend2FALoginOtpHandler);

export default router;