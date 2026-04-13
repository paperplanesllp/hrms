import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getCallLogs, getMissedCalls } from "./call.controller.js";

const router = express.Router();

// Get call logs for a conversation
router.get("/conversation/:conversationId", requireAuth, getCallLogs);

// Get missed calls for current user
router.get("/missed", requireAuth, getMissedCalls);

export default router;
