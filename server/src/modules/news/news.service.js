import { News } from "./News.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

export async function createNews(userId, data) {
  const newsData = {
    ...data,
    createdBy: userId,
    publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
    status: "published"
  };
  return News.create(newsData);
}

export async function listNews() {
  try {
    return await News.find({ status: "published" })
      .populate("createdBy", "name role email")
      .sort({ publishDate: -1 });
  } catch (error) {
    console.error("Error listing news:", error);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch news");
  }
}

export async function getNewsById(id) {
  const news = await News.findById(id).populate("createdBy", "name role email");
  if (!news) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
  return news;
}

export async function updateNews(id, patch) {
  if (patch.publishDate) {
    patch.publishDate = new Date(patch.publishDate);
  }
  
  // If updating with a new image, delete the old one
  if (patch.imageUrl) {
    const oldDoc = await News.findById(id);
    if (oldDoc?.imageUrl) {
      deleteImageFile(oldDoc.imageUrl);
    }
  }
  
  const doc = await News.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after" }).populate("createdBy", "name role email");
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
  return doc;
}

export async function deleteNews(id) {
  const doc = await News.findByIdAndDelete(id);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "News not found");
  
  // Clean up image file if exists
  if (doc.imageUrl) {
    deleteImageFile(doc.imageUrl);
  }
  
  return doc;
}

/**
 * Mark a policy update as viewed by a user
 * Used to track which users have seen privacy policy updates
 */
export async function markPolicyViewed(newsId, userId) {
  try {
    const news = await News.findById(newsId);
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
      if (news.imageUrl) {
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