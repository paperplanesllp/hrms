import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { uploadProfileImage } from "../../middleware/upload.js";
import {
	createUserByAdmin,
	getAllUsers,
	getMe,
	getUser,
	patchUser,
	deleteUser,
	updateMe,
	updateUserLocation,
	updateCurrentLocation,
	getActiveLocations,
	get2FAStatus,
	toggle2FA,
	getActivityLog,
	changeUserPassword,
	getPendingTemporaryUsers,
	approveTemporaryRegistration,
	rejectTemporaryRegistration,
	convertTemporaryUserToPermanent,
} from "./users.controller.js";

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.put("/me", requireAuth, uploadProfileImage.single("profileImage"), updateMe);

// Admin can create any role (ADMIN, HR, EMPLOYEE)
// HR can only create EMPLOYEE users
router.post("/", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), createUserByAdmin);

// Get all users - available to all authenticated users for task assignment
router.get("/", requireAuth, getAllUsers);

// Endpoints for the current user (2FA status + activity log)
router.get("/2fa-status", requireAuth, get2FAStatus);
router.post("/2fa-toggle", requireAuth, toggle2FA);
router.get("/activity-log", requireAuth, getActivityLog);
router.post("/change-password", requireAuth, changeUserPassword);

// Temporary user registration approvals (HR/Admin)
router.get(
	"/temporary/pending",
	requireAuth,
	requireRole(ROLES.ADMIN, ROLES.HR),
	getPendingTemporaryUsers
);
router.patch(
	"/temporary/:id/approve",
	requireAuth,
	requireRole(ROLES.ADMIN, ROLES.HR),
	approveTemporaryRegistration
);
router.patch(
	"/temporary/:id/reject",
	requireAuth,
	requireRole(ROLES.ADMIN, ROLES.HR),
	rejectTemporaryRegistration
);
router.patch(
	"/temporary/:id/convert-permanent",
	requireAuth,
	requireRole(ROLES.ADMIN, ROLES.HR),
	convertTemporaryUserToPermanent
);

// Real-time geolocation tracking (called every 10 seconds from frontend)
router.post("/location/update", requireAuth, updateCurrentLocation);

// Get active employees' real-time locations (HR & Admin only)
router.get("/location/active", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getActiveLocations);

// Admin & HR can view/edit/delete users (role-based restrictions enforced in controller)
router.get("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getUser);
router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), patchUser);
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), deleteUser);

// User can update their own location (or admin can update anyone's)
router.patch("/:id/update-location", requireAuth, updateUserLocation);

export default router;