import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { uploadPolicy } from "../../middleware/upload.js";
import { getPrivacyPolicy, updatePrivacyPolicy, markViewed, getCompanyPolicyHandler, updateCompanyPolicyHandler, sendPolicyUpdateNotification } from "./policy.controller.js";

const router = express.Router();

// Everyone can read policy
router.get("/", requireAuth, getPrivacyPolicy);

// Mark policy as viewed
router.post("/viewed", requireAuth, markViewed);

// HR only: update policy
router.put("/", requireAuth, requireRole(ROLES.HR), uploadPolicy.array("attachments", 5), updatePrivacyPolicy);

// Company Policy routes
router.get("/company-policy", requireAuth, getCompanyPolicyHandler);
router.put("/company-policy", requireAuth, requireRole(ROLES.HR, ROLES.ADMIN), updateCompanyPolicyHandler);

// Notification routes
router.post("/policy-update", requireAuth, requireRole(ROLES.HR, ROLES.ADMIN), sendPolicyUpdateNotification);

export default router;