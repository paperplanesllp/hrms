import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getNotifications, markRead, markAllRead } from "./notification.controller.js";

const router = express.Router();

router.get("/", requireAuth, getNotifications);
router.patch("/:id/read", requireAuth, markRead);
router.patch("/read-all", requireAuth, markAllRead);

export default router;