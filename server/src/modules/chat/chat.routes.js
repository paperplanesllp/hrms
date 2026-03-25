import express from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../../middleware/auth.js";
import * as chatController from "./chat.controller.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const prefix = file.mimetype.startsWith('image/') ? 'image' : 'voice';
    cb(null, `${prefix}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'));
    }
  }
});

router.use(requireAuth);

// Chat operations
router.get("/", chatController.getMyChats);
router.post("/", chatController.createChat);
router.delete("/:chatId", chatController.deleteConversation);
router.get("/:chatId/details", chatController.getGroupDetails);
router.get("/search", chatController.searchUsers);

// Group management
router.put("/:chatId/group", chatController.updateGroup);
router.post("/:chatId/add-member", chatController.addMember);
router.post("/:chatId/remove-member", chatController.removeMember);
router.post("/:chatId/rename", chatController.renameGroup);
router.post("/:chatId/leave", chatController.leaveGroup);

// Message operations
router.get("/:chatId/messages", chatController.getMessages);
router.post("/:chatId/messages", upload.fields([{ name: 'voice', maxCount: 1 }, { name: 'image', maxCount: 1 }]), chatController.postMessage);
router.put("/:chatId/read", chatController.markRead);
router.put("/messages/:messageId", chatController.updateMessage);
router.delete("/messages/:messageId", chatController.deleteMessage);
router.delete("/:chatId/messages", chatController.clearChat);
router.get("/messages/:messageId/info", chatController.getMessageInfo);

export default router;
