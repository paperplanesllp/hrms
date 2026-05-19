import { News } from "./News.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { deleteFromCloudinary } from "../../utils/cloudinary.js";
import { normalizeRole, ROLES } from "../../middleware/roles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../../uploads/news");

/**
 * Delete image file from disk if it exists
 */
function deleteImageFile(imageUrl) {
  if (!imageUrl) return;
  try {
    const filename = path.basename(imageUrl);
    const filepath = path.join(uploadsDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`✅ Deleted image file: ${filename}`);
    }
  } catch (error) {
    console.error("⚠️ Error deleting image file:", error);
  }
}

async function deleteNewsImage(doc) {
  if (!doc?.imageUrl) return;

  if (doc.imageProvider === "cloudinary" && doc.imagePublicId) {
    try {
      await deleteFromCloudinary(doc.imagePublicId, "image");
      return;
    } catch (error) {
      console.error("Error deleting Cloudinary news image:", error);
    }
  }

  deleteImageFile(doc.imageUrl);
}

function normalizeCompanyId(companyId) {
  return companyId ? String(companyId) : null;
}

function requireCompanyId(companyId) {
  const normalized = normalizeCompanyId(companyId);
  if (!normalized || !mongoose.Types.ObjectId.isValid(normalized)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company context is required");
  }
  return normalized;
}

function newsCompanyScope(user, selectedCompanyId = null) {
  const role = normalizeRole(user?.role);

  if (role === ROLES.SUPERADMIN) {
    const companyId = normalizeCompanyId(selectedCompanyId);
    if (!companyId) return {};
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid companyId");
    }
    return { companyId };
  }

  return { companyId: requireCompanyId(user?.companyId) };
}

function newsTenantMutationScope(user, selectedCompanyId = null) {
  const role = normalizeRole(user?.role);
  if (role === ROLES.SUPERADMIN) {
    return { companyId: requireCompanyId(selectedCompanyId) };
  }
  return { companyId: requireCompanyId(user?.companyId) };
}

export function buildNewsListFilter(user, selectedCompanyId = null) {
  return { status: "published", ...newsCompanyScope(user, selectedCompanyId) };
}

export function buildNewsTenantMutationFilter(id, user, selectedCompanyId = null) {
  return { _id: id, ...newsTenantMutationScope(user, selectedCompanyId) };
}

export async function createNews(userId, data, companyId) {
  const newsData = {
    ...data,
    companyId: requireCompanyId(companyId),
    createdBy: userId,
    publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
    status: "published"
  };
  return News.create(newsData);
}

export async function listNews(user, selectedCompanyId = null) {
  try {
    return await News.find(buildNewsListFilter(user, selectedCompanyId))
      .populate("createdBy", "name role email")
      .sort({ publishDate: -1 });
  } catch (error) {
    console.error("Error listing news:", error);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch news");
  }
}

export async function getNewsById(id, user, selectedCompanyId = null) {
  const news = await News.findOne({ _id: id, ...newsCompanyScope(user, selectedCompanyId) })
    .populate("createdBy", "name role email");
  if (!news) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
  return news;
}

export async function updateNews(id, patch, user, selectedCompanyId = null) {
  const filter = buildNewsTenantMutationFilter(id, user, selectedCompanyId);
  if (patch.publishDate) {
    patch.publishDate = new Date(patch.publishDate);
  }
  delete patch.companyId;
  
  // If updating with a new image, delete the old one
  if (Object.prototype.hasOwnProperty.call(patch, "imageUrl")) {
    const oldDoc = await News.findOne(filter);
    if (!oldDoc) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
    if (oldDoc?.imageUrl) {
      await deleteNewsImage(oldDoc);
    }
  }
  
  const doc = await News.findOneAndUpdate(filter, { $set: patch }, { returnDocument: "after" })
    .populate("createdBy", "name role email");
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
  return doc;
}

export async function deleteNews(id, user, selectedCompanyId = null) {
  const doc = await News.findOneAndDelete(buildNewsTenantMutationFilter(id, user, selectedCompanyId));
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
  
  // Clean up image file if exists
  if (doc.imageUrl) {
    await deleteNewsImage(doc);
  }
  
  return doc;
}

/**
 * Mark a policy update as viewed by a user
 * Used to track which users have seen privacy policy updates
 */
export async function markPolicyViewed(newsId, userId, user, selectedCompanyId = null) {
  try {
    const news = await News.findOne(buildNewsTenantMutationFilter(newsId, user, selectedCompanyId));
    if (!news) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
    
    // Add user to viewedBy array if not already there
    if (!news.viewedBy.includes(userId)) {
      news.viewedBy.push(userId);
      await news.save();
    }
    return news;
  } catch (error) {
    console.error("Error marking policy viewed:", error);
    throw error;
  }
}

/**
 * Clean up news items with missing image files from the database
 * Called on startup or periodically to maintain consistency
 */
export async function cleanupMissingImages() {
  try {
    const allNews = await News.find({ imageUrl: { $exists: true, $ne: null } });
    let cleanedCount = 0;
    
    for (const news of allNews) {
      if (news.imageUrl && news.imageProvider !== "cloudinary" && !String(news.imageUrl).includes("res.cloudinary.com")) {
        const filename = path.basename(news.imageUrl);
        const filepath = path.join(uploadsDir, filename);
        
        if (!fs.existsSync(filepath)) {
          console.warn(`🧹 [CLEANUP] Removing missing image reference: ${news.imageUrl}`);
          await News.findByIdAndUpdate(news._id, { $set: { imageUrl: null } });
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`✅ [CLEANUP] Cleaned up ${cleanedCount} news items with missing images`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error("Error cleaning up missing images:", error);
    return 0;
  }
}
