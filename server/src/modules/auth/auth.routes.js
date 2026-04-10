import express from "express";
import { authLimiter } from "../../middleware/rateLimit.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  postSignup,
  postLogin,
  postRefresh,
  postLogout,
  postForgotPassword,
  postResetPassword,
  postTemporaryRegister,
  postTemporaryRequestOtp,
  postTemporaryVerifyOtp,
} from "./auth.controller.js";

const router = express.Router();

// ✅ Public
router.post("/signup", authLimiter, postSignup);
router.post("/login", authLimiter, postLogin);
router.post("/refresh", postRefresh);
router.post("/forgot-password", authLimiter, postForgotPassword);
router.post("/reset-password", authLimiter, postResetPassword);
router.post("/temporary/register", authLimiter, postTemporaryRegister);
router.post("/temporary/request-otp", authLimiter, postTemporaryRequestOtp);
router.post("/temporary/verify-otp", authLimiter, postTemporaryVerifyOtp);

// ✅ Protected
router.post("/logout", requireAuth, postLogout);

export default router;