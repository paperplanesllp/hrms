/**
 * Migration Script: Convert relative image URLs to full URLs
 * Run this once to fix all existing news records with relative URLs
 * 
 * Usage: node scripts/migrateNewsImageUrls.js
 */

import mongoose from "mongoose";
import { News } from "../server/src/modules/news/News.model.js";
import { env } from "../server/src/config/env.js";

async function migrateNewsImageUrls() {
  try {
    console.log("🔄 Starting news image URL migration...");
    
    // Connect to database
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    
    // Find all news with relative image URLs
    const newsItems = await News.find({
      imageUrl: { $exists: true, $ne: null, $regex: "^/uploads" }
    });
    
    console.log(`📋 Found ${newsItems.length} news items with relative URLs`);
    
    if (newsItems.length === 0) {
      console.log("✅ No migration needed - all URLs are already full URLs");
      await mongoose.disconnect();
      return;
    }
    
    // Get the server URL from environment or use default
    const serverUrl = env.SERVER_URL || "http://localhost:3000";
    console.log(`🌐 Using server URL: ${serverUrl}`);
    
    let migratedCount = 0;
    
    for (const news of newsItems) {
      try {
        const oldUrl = news.imageUrl;
        const newUrl = `${serverUrl}${oldUrl}`;
        
        await News.findByIdAndUpdate(news._id, { $set: { imageUrl: newUrl } });
        
        console.log(`✓ Migrated: ${oldUrl} → ${newUrl}`);
        migratedCount++;
      } catch (error) {
        console.error(`⚠️ Error migrating news ${news._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Migration completed: ${migratedCount}/${newsItems.length} news items updated`);
    
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateNewsImageUrls();
