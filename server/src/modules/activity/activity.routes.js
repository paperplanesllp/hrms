import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getMyActivities,
  getHRTimelineController,
  getAdminTimelineController,
  getAllActivities,
} from "./activity.controller.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// User can get their own activities
router.get("/my-activities", getMyActivities);

// HR timeline - activities relevant to HR
router.get("/hr-timeline", getHRTimelineController);

// Admin timeline - HR and system-level activities
router.get("/admin-timeline", getAdminTimelineController);

// All activities - admin only with filters
router.get("/all", getAllActivities);

export default router;
