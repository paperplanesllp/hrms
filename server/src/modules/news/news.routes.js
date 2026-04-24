import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { uploadNews } from "../../middleware/upload.js";
import { postNews, getNews, getNewsDetail, patchNews, removeNews, markViewed, cleanupImages } from "./news.controller.js";

const router = express.Router();

// Everyone logged-in can read updates
router.get("/", requireAuth, getNews);

// HR only: create/update/delete (policy/privacy/news)
// Using uploadNews.single("image") for single file upload
router.post("/", requireAuth, requireRole(ROLES.HR), uploadNews.single("image"), postNews);

// Mark a policy update as viewed - MUST come before /:id route
router.post("/:id/viewed", requireAuth, markViewed);

// Admin: cleanup missing images
router.post("/admin/cleanup-images", requireAuth, requireRole(ROLES.HR), cleanupImages);

// Get single news detail
router.get("/:id", requireAuth, getNewsDetail);

// HR only: update/delete specific news
router.patch("/:id", requireAuth, requireRole(ROLES.HR), uploadNews.single("image"), patchNews);
router.delete("/:id", requireAuth, requireRole(ROLES.HR), removeNews);

export default router;