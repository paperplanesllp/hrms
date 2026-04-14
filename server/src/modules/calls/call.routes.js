import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
	getCallLogs,
	getCallSessionById,
	getMissedCalls,
	registerPushSubscription,
	unregisterPushSubscription,
} from "./call.controller.js";

const router = express.Router();

// Get call logs for a conversation
router.get("/conversation/:conversationId", requireAuth, getCallLogs);

// Get missed calls for current user
router.get("/missed", requireAuth, getMissedCalls);

// Resolve a call session by callId (for notification-tap restore).
router.get("/:callId/session", requireAuth, getCallSessionById);

// Register/remove browser push subscriptions used for call fallback delivery.
router.post("/push-subscriptions", requireAuth, registerPushSubscription);
router.delete("/push-subscriptions", requireAuth, unregisterPushSubscription);

export default router;
