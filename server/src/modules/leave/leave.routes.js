import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { postLeave, getMyLeaves, getAllLeaves, getHRLeaves, getUserLeaves, patchLeave, deleteMyLeave } from "./leave.controller.js";

const router = express.Router();

// Frontend expects "/my" not "/me"
router.post("/", requireAuth, postLeave);
router.get("/my", requireAuth, getMyLeaves);
router.get("/me", requireAuth, getMyLeaves); // Backward compatibility
router.delete("/:id", requireAuth, deleteMyLeave);

// HR - Get user leaves for approval
router.get("/hr/user-leaves", requireAuth, requireRole(ROLES.HR), getUserLeaves);

// Admin - Get HR staff leaves for approval
router.get("/admin/hr-leaves", requireAuth, requireRole(ROLES.ADMIN), getHRLeaves);

// General - Get all leaves (HR sees all employee leaves, Admin sees everything)
router.get("/", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getAllLeaves);

// Approve/Reject leave (HR approves USER, Admin approves HR)
router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), patchLeave);

export default router;