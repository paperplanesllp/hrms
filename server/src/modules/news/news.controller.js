import { asyncHandler } from "../../utils/asyncHandler.js";
import { newsCreateSchema, newsUpdateSchema } from "./news.schemas.js";
import { createNews, listNews, getNewsById, updateNews, deleteNews, markPolicyViewed, cleanupMissingImages } from "./news.service.js";
import { createBulkNotifications } from "../notifications/notification.service.js";
import { User } from "../users/User.model.js";
import { notifyNewsCreated, notifyNewsDeleted, notifyNewsPolicyUpdate } from "../../utils/socket.js";
import { isCloudinaryConfigured, uploadNewsImageToCloudinary } from "../../utils/cloudinary.js";
import fs from "fs";

const toBoolean = (value) => value === true || value === "true" || value === "on" || value === "1";

const removeTempUpload = (filePath) => {
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => {});
};

async function attachNewsImage(req, payload) {
  if (!req.file) return payload;

  if (isCloudinaryConfigured()) {
    let result;
    try {
      result = await uploadNewsImageToCloudinary(req.file.path);
    } finally {
      removeTempUpload(req.file.path);
    }
    return {
      ...payload,
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
      imageProvider: "cloudinary",
    };
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return {
    ...payload,
    imageUrl: `${baseUrl}/uploads/news/${req.file.filename}`,
    imagePublicId: null,
    imageProvider: "local",
  };
}

export const postNews = asyncHandler(async (req, res) => {
  req.body.isPolicyUpdate = toBoolean(req.body.isPolicyUpdate);
  req.body.isImportant = toBoolean(req.body.isImportant) || req.body.isPolicyUpdate;
  
  const data = await attachNewsImage(req, newsCreateSchema.parse(req.body));
  
  const created = await createNews(req.user.id, data, req.user.companyId);
  const doc = await getNewsById(created._id, req.user);
  
  const users = await User.find({
    ...(req.user.companyId ? { companyId: req.user.companyId } : {}),
  }).select('_id');
  const userIds = users.map(user => user._id);
  
  await createBulkNotifications({
    userIds,
    companyId: req.user.companyId,
    type: data.isPolicyUpdate ? "policy" : "news",
    title: data.isPolicyUpdate
      ? "Policy Update: " + data.title
      : data.isImportant
        ? "Important Announcement: " + data.title
        : "New Announcement: " + data.title,
    message: data.isImportant ? `Important: ${data.title}` : data.title,
    targetUrl: data.isPolicyUpdate ? "/privacy-policy" : "/news",
    newsId: doc._id,
    isPolicyUpdate: data.isPolicyUpdate
  });
  
  if (data.isPolicyUpdate) {
    notifyNewsPolicyUpdate(doc, data.title);
  } else {
    notifyNewsCreated(doc);
  }
  
  res.status(201).json({ news: doc });
});

export const getNews = asyncHandler(async (req, res) => {
  const rows = await listNews(req.user, req.query.companyId);
  res.json(rows);
});

export const getNewsDetail = asyncHandler(async (req, res) => {
  const news = await getNewsById(req.params.id, req.user, req.query.companyId);
  res.json(news);
});

export const patchNews = asyncHandler(async (req, res) => {
  if (Object.prototype.hasOwnProperty.call(req.body, "isPolicyUpdate")) {
    req.body.isPolicyUpdate = toBoolean(req.body.isPolicyUpdate);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "isImportant")) {
    req.body.isImportant = toBoolean(req.body.isImportant) || toBoolean(req.body.isPolicyUpdate);
  }
  
  let patch = newsUpdateSchema.parse(req.body);
  
  if (req.file) {
    patch = await attachNewsImage(req, patch);
  } else if (req.body.imageUrl === "") {
    patch.imageUrl = null;
    patch.imagePublicId = null;
    patch.imageProvider = null;
  }
  
  const doc = await updateNews(req.params.id, patch, req.user, req.query.companyId);
  res.json({ news: doc });
});

export const removeNews = asyncHandler(async (req, res) => {
  const deleted = await deleteNews(req.params.id, req.user, req.query.companyId);
  
  // Emit socket event for real-time deletion
  notifyNewsDeleted(deleted);
  
  res.json({ ok: true });
});

/**
 * Mark a policy update as viewed by current user
 * POST /news/:id/viewed (for policy updates)
 */
export const markViewed = asyncHandler(async (req, res) => {
  const news = await markPolicyViewed(req.params.id, req.user.id, req.user, req.query.companyId);
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
