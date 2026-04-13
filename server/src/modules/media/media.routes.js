import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  uploadCloudinaryImage,
  uploadCloudinaryFile,
} from "../../middleware/cloudinaryUpload.js";
import {
  uploadImage,
  uploadFile,
  deleteFile,
} from "./media.controller.js";

const router = express.Router();

router.use(requireAuth);
router.post("/image", uploadCloudinaryImage.single("file"), uploadImage);
router.post("/file", uploadCloudinaryFile.single("file"), uploadFile);
router.delete("/file", deleteFile);

export default router;
