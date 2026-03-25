import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getLogs, getRecentUpdates } from "./audit.controller.js";

const router = express.Router();

// Get all audit logs with filters
router.get("/", requireAuth, getLogs);

// Get recent updates (for dashboard)
router.get("/recent", requireAuth, getRecentUpdates);

export default router;
