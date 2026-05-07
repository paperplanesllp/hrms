import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import * as spotifyController from "./spotify.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/settings", spotifyController.getSettings);
router.patch("/settings", requireRole(ROLES.ADMIN), spotifyController.updateSettings);

export default router;
