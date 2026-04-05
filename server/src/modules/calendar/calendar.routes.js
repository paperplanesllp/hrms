import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { getCalendar, putCalendar, getMonthlyAttendance, createEventHandler, getEventsHandler, updateEventHandler, deleteEventHandler, getHeatmapHandler } from "./calendar.controller.js";

const router = express.Router();

// Get monthly attendance status with color coding
router.get("/monthly", requireAuth, getMonthlyAttendance);

// Event management
router.post("/events", requireAuth, createEventHandler);
router.get("/events", requireAuth, getEventsHandler);
router.put("/events/:id", requireAuth, updateEventHandler);
router.delete("/events/:id", requireAuth, deleteEventHandler);

// Attendance heatmap (for GitHub-style visualization)
router.get("/heatmap", requireAuth, getHeatmapHandler);

// Legacy endpoints (backward compatibility)
router.get("/", requireAuth, getCalendar);
router.put("/", requireAuth, requireRole(ROLES.ADMIN), putCalendar);

export default router;