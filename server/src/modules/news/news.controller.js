import { asyncHandler } from "../../utils/asyncHandler.js";
import { newsCreateSchema, newsUpdateSchema } from "./news.schemas.js";
import { createNews, listNews, getNewsById, updateNews, deleteNews, markPolicyViewed, cleanupMissingImages } from "./news.service.js";
import { createBulkNotifications } from "../notifications/notification.service.js";
import { User } from "../users/User.model.js";
import { notifyNewsCreated, notifyNewsDeleted, notifyNewsPolicyUpdate } from "../../utils/socket.js";

export const postNews = asyncHandler(async (req, res) => {
  // Convert string boolean from FormData to actual boolean
  if (req.body.isPolicyUpdate) {
    req.body.isPolicyUpdate = req.body.isPolicyUpdate === 'true';
  }
  
  const data = newsCreateSchema.parse(req.body);
  
  // Handle file upload
  if (req.file) {
    data.imageUrl = `/uploads/news/${req.file.filename}`;
  }
  
  const doc = await createNews(req.user.id, data);
  
  // Create notifications for all users
  const users = await User.find({}).select('_id');
  const userIds = users.map(user => user._id);
  
  await createBulkNotifications({
    userIds,
    type: data.isPolicyUpdate ? "policy" : "news",
    title: data.isPolicyUpdate ? "Policy Update: " + data.title : "New Announcement: " + data.title,
    message: data.title,
    targetUrl: data.isPolicyUpdate ? "/privacy-policy" : "/news",
    newsId: doc._id,
    isPolicyUpdate: data.isPolicyUpdate
  });
  
  // Emit socket event for real-time update
  if (data.isPolicyUpdate) {
    notifyNewsPolicyUpdate(doc, data.title);
  } else {
    notifyNewsCreated(doc);
  }
  
  res.status(201).json({ news: doc });
});

export const getNews = asyncHandler(async (req, res) => {
  const rows = await listNews();
  res.json(rows);
});

export const getNewsDetail = asyncHandler(async (req, res) => {
  const news = await getNewsById(req.params.id);
  res.json(news);
});

export const patchNews = asyncHandler(async (req, res) => {
  // Convert string boolean from FormData to actual boolean
  if (req.body.isPolicyUpdate) {
    req.body.isPolicyUpdate = req.body.isPolicyUpdate === 'true';
  }
  
  const patch = newsUpdateSchema.parse(req.body);
  
  // Handle file upload - only update imageUrl if new file provided
  if (req.file) {
    patch.imageUrl = `/uploads/news/${req.file.filename}`;
  } else if (req.body.imageUrl === "") {
    // Allow clearing image
    patch.imageUrl = null;
  }
  
  const doc = await updateNews(req.params.id, patch);
  res.json({ news: doc });
});

export const removeNews = asyncHandler(async (req, res) => {
  await deleteNews(req.params.id);
  
  // Emit socket event for real-time deletion
  notifyNewsDeleted(req.params.id);
  
  res.json({ ok: true });
});

/**
 * Mark a policy update as viewed by current user
 * POST /news/:id/viewed (for policy updates)
 */
export const markViewed = asyncHandler(async (req, res) => {
  const news = await markPolicyViewed(req.params.id, req.user.id);
  res.json({ ok: true, news });
});

/**
 * Admin endpoint: Clean up news items with missing image files
 * POST /news/admin/cleanup-images (HR only)
 */
export const cleanupImages = asyncHandler(async (req, res) => {
  const cleanedCount = await cleanupMissingImages();
  res.json({ 
    ok: true, 
    message: `Cleaned up ${cleanedCount} news items with missing images`,
    cleanedCount 
  });
});