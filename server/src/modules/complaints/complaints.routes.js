import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import * as complaintController from "./complaints.controller.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ==========================================
// ADMIN ROUTES (Must go BEFORE /:id routes)
// ==========================================
router.get("/admin/search", requireRole(ROLES.ADMIN), complaintController.searchComplaints);
router.get("/admin/stats", requireRole(ROLES.ADMIN), complaintController.getComplaintsStats);
router.get("/admin/all", requireRole(ROLES.ADMIN), complaintController.getAllComplaints);

// ==========================================
// STANDARD USER ROUTES
// ==========================================
router.post("/", complaintController.createComplaint);
router.get("/my", complaintController.getMyComplaints);

// ==========================================
// DYNAMIC ID ROUTES (Must go LAST)
// ==========================================
router.get("/:id", complaintController.getComplaint);
router.post("/:id/reply", requireRole(ROLES.ADMIN), complaintController.replyToComplaint);
router.patch("/:id/status", requireRole(ROLES.ADMIN), complaintController.updateStatus);
router.post("/:id/satisfaction", complaintController.submitSatisfaction);

export default router;