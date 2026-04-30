# News Image URL Fix - Code Changes Summary

## Problem
Images uploaded to news were stored with relative URLs (`/uploads/news/image.jpg`), which worked on localhost but not on production servers.

## Solution
Store full URLs with domain (`https://domain.com/uploads/news/image.jpg`) in the database.

---

## Change 1: News Controller

**File:** `server/src/modules/news/news.controller.js`

### postNews() - Create News with Image
```javascript
// BEFORE
if (req.file) {
  data.imageUrl = `/uploads/news/${req.file.filename}`;
}

// AFTER
if (req.file) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  data.imageUrl = `${baseUrl}/uploads/news/${req.file.filename}`;
}
```

### patchNews() - Update News with Image
```javascript
// BEFORE
if (req.file) {
  patch.imageUrl = `/uploads/news/${req.file.filename}`;
}

// AFTER
if (req.file) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  patch.imageUrl = `${baseUrl}/uploads/news/${req.file.filename}`;
}
```

---

## Change 2: Environment Configuration

**File:** `server/src/config/env.js`

```javascript
// BEFORE
export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  // ... rest of config
};

// AFTER
export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  SERVER_URL: process.env.SERVER_URL || "http://localhost:3000",  // ← NEW
  // ... rest of config
};
```

---

## Change 3: News Service

**File:** `server/src/modules/news/news.service.js`

### deleteImageFile() - Extract Filename from Full URL
```javascript
// BEFORE & AFTER (No change needed - already handles both)
function deleteImageFile(imageUrl) {
  if (!imageUrl) return;
  try {
    const filename = path.basename(imageUrl);  // Works with both relative and full URLs
    const filepath = path.join(uploadsDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`✅ Deleted image file: ${filename}`);
    }
  } catch (error) {
    console.error("⚠️ Error deleting image file:", error);
  }
}
```

### cleanupMissingImages() - Handle Full URLs
```javascript
// BEFORE & AFTER (No change needed - already handles both)
export async function cleanupMissingImages() {
  try {
    const allNews = await News.find({ imageUrl: { $exists: true, $ne: null } });
    let cleanedCount = 0;
    
    for (const news of allNews) {
      if (news.imageUrl) {
        const filename = path.basename(news.imageUrl);  // Works with both
        const filepath = path.join(uploadsDir, filename);
        
        if (!fs.existsSync(filepath)) {
          await News.findByIdAndUpdate(news._id, { $set: { imageUrl: null } });
          cleanedCount++;
        }
      }
    }
    return cleanedCount;
  } catch (error) {
    console.error("Error cleaning up missing images:", error);
    return 0;
  }
}
```

---

## Change 4: Migration Script (NEW FILE)

**File:** `scripts/migrateNewsImageUrls.js`

```javascript
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
```

---

## Environment Variables

### .env (Development)
```
SERVER_URL=http://localhost:3000
```

### .env (Production)
```
SERVER_URL=https://your-domain.com
```

---

## How It Works

### Before Fix
```
User uploads image → Stored as: /uploads/news/image.jpg
Frontend requests: http://localhost:3000/uploads/news/image.jpg ✅ (localhost works)
Frontend requests: https://domain.com/uploads/news/image.jpg ❌ (server fails)
```

### After Fix
```
User uploads image → Stored as: https://domain.com/uploads/news/image.jpg
Frontend requests: https://domain.com/uploads/news/image.jpg ✅ (works everywhere)
```

---

## Testing

### Test 1: Create News with Image
```bash
curl -X POST http://localhost:3000/api/news \
  -H "Authorization: Bearer <token>" \
  -F "title=Test News" \
  -F "body=Test content" \
  -F "image=@image.jpg"
```

**Check database:**
```javascript
db.news.findOne({ title: "Test News" })
// Should show: imageUrl: "http://localhost:3000/uploads/news/image-123456.jpg"
```

### Test 2: Verify Image Displays
- Open news page
- Image should display ✅
- No broken image icons ✅

### Test 3: Run Migration
```bash
node scripts/migrateNewsImageUrls.js
```

**Output:**
```
✅ Connected to MongoDB
📋 Found 5 news items with relative URLs
✓ Migrated: /uploads/news/image1.jpg → http://localhost:3000/uploads/news/image1.jpg
✓ Migrated: /uploads/news/image2.jpg → http://localhost:3000/uploads/news/image2.jpg
...
✅ Migration completed: 5/5 news items updated
```

---

## Rollback (If Needed)

If you need to revert to relative URLs:

```javascript
// In MongoDB
db.news.updateMany(
  { imageUrl: { $regex: "^http" } },
  [{ $set: { imageUrl: { $substr: ["$imageUrl", 18, -1] } } }]
)
```

But this is NOT recommended - full URLs are better for production.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| URL Format | `/uploads/news/image.jpg` | `https://domain.com/uploads/news/image.jpg` |
| Localhost | ✅ Works | ✅ Works |
| Production | ❌ Broken | ✅ Works |
| Migration | N/A | One-time script |
| Config | N/A | `SERVER_URL` in .env |
