# News Image Fix - Step-by-Step Deployment Guide

## ⏱️ Time Required: 5-10 minutes

---

## Step 1: Update Environment Variables (1 minute)

### For Development (Localhost)
Edit `server/.env`:
```
SERVER_URL=http://localhost:3000
```

### For Production (Server)
Edit `server/.env`:
```
SERVER_URL=https://your-domain.com
```

**Example:**
```
# server/.env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
SERVER_URL=https://erp.company.com
```

---

## Step 2: Deploy Code Changes (2 minutes)

### Pull Latest Code
```bash
git pull origin main
```

### Verify Files Updated
Check these files were updated:
```bash
# Check news controller
cat server/src/modules/news/news.controller.js | grep "baseUrl"

# Check env config
cat server/src/config/env.js | grep "SERVER_URL"

# Check migration script exists
ls scripts/migrateNewsImageUrls.js
```

**Expected output:**
```
✅ news.controller.js has baseUrl code
✅ env.js has SERVER_URL
✅ migrateNewsImageUrls.js exists
```

---

## Step 3: Run Migration Script (2 minutes)

### Navigate to Server Directory
```bash
cd server
```

### Run Migration
```bash
node ../scripts/migrateNewsImageUrls.js
```

### Expected Output
```
🔄 Starting news image URL migration...
✅ Connected to MongoDB
📋 Found 5 news items with relative URLs
✓ Migrated: /uploads/news/image1.jpg → https://your-domain.com/uploads/news/image1.jpg
✓ Migrated: /uploads/news/image2.jpg → https://your-domain.com/uploads/news/image2.jpg
✓ Migrated: /uploads/news/image3.jpg → https://your-domain.com/uploads/news/image3.jpg
✓ Migrated: /uploads/news/image4.jpg → https://your-domain.com/uploads/news/image4.jpg
✓ Migrated: /uploads/news/image5.jpg → https://your-domain.com/uploads/news/image5.jpg

✅ Migration completed: 5/5 news items updated
✅ Disconnected from MongoDB
```

### If No News Items Found
```
✅ No migration needed - all URLs are already full URLs
```

This is fine - means no old news items exist.

---

## Step 4: Restart Server (1 minute)

### Stop Current Server
```bash
# Press Ctrl+C if running in terminal
# OR if running as service:
sudo systemctl stop erp-server
```

### Start Server
```bash
npm start
```

### Verify Server Started
```
✅ Server running on port 3000
✅ Connected to MongoDB
✅ Socket.io initialized
```

---

## Step 5: Test the Fix (2 minutes)

### Test 1: Create News with Image

**Using Frontend:**
1. Go to News section
2. Click "Create News"
3. Fill in title and content
4. Upload an image
5. Click "Publish"

**Check Result:**
- ✅ News created successfully
- ✅ Image displays in news list
- ✅ Image displays in news detail

### Test 2: Verify Database

**Check MongoDB:**
```javascript
// In MongoDB Compass or mongosh
use your_database_name
db.news.findOne({ imageUrl: { $exists: true } })
```

**Expected Result:**
```javascript
{
  _id: ObjectId(...),
  title: "Test News",
  imageUrl: "https://your-domain.com/uploads/news/image-123456.jpg",
  // ... other fields
}
```

**NOT this (old format):**
```javascript
imageUrl: "/uploads/news/image-123456.jpg"  // ❌ Wrong
```

### Test 3: Update News with New Image

1. Go to existing news
2. Click "Edit"
3. Upload a new image
4. Click "Update"

**Check Result:**
- ✅ News updated successfully
- ✅ New image displays
- ✅ Old image file deleted

### Test 4: Delete News

1. Go to existing news
2. Click "Delete"
3. Confirm deletion

**Check Result:**
- ✅ News deleted
- ✅ Image file deleted from server

---

## ✅ Verification Checklist

- [ ] `.env` has `SERVER_URL` set
- [ ] Code changes deployed
- [ ] Migration script ran successfully
- [ ] Server restarted
- [ ] New news with image displays correctly
- [ ] Database shows full URLs
- [ ] Old news images still work (after migration)
- [ ] Image upload/update/delete works

---

## 🔍 Troubleshooting

### Issue: Migration Script Failed

**Error:** `Cannot find module`
```bash
# Solution: Make sure you're in server directory
cd server
node ../scripts/migrateNewsImageUrls.js
```

**Error:** `MongoDB connection failed`
```bash
# Solution: Check MONGO_URI in .env
# Verify MongoDB is running
# Try again
```

### Issue: Images Still Not Showing

**Check 1: Verify .env**
```bash
grep SERVER_URL server/.env
# Should show: SERVER_URL=https://your-domain.com
```

**Check 2: Verify Database**
```javascript
db.news.findOne()
// imageUrl should have full domain
```

**Check 3: Clear Browser Cache**
```
Ctrl+Shift+Delete (Windows)
Cmd+Shift+Delete (Mac)
```

**Check 4: Check Server Logs**
```bash
# Look for errors in server console
# Check if /uploads/news/ directory exists
ls -la server/uploads/news/
```

### Issue: Old Images Broken After Migration

**Solution: Run Migration Again**
```bash
node ../scripts/migrateNewsImageUrls.js
```

---

## 📊 Deployment Summary

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Update .env | 1 min | ⏳ |
| 2 | Deploy code | 2 min | ⏳ |
| 3 | Run migration | 2 min | ⏳ |
| 4 | Restart server | 1 min | ⏳ |
| 5 | Test | 2 min | ⏳ |
| **Total** | | **8 min** | ⏳ |

---

## 🎯 Success Criteria

✅ **All of these should be true:**
- News with images created successfully
- Images display on localhost
- Images display on production server
- Database shows full URLs
- Old images still work
- No broken image icons
- No console errors

---

## 📞 Rollback Plan

If something goes wrong:

### Option 1: Revert Code
```bash
git revert HEAD
npm start
```

### Option 2: Revert Database (Not Recommended)
```javascript
// This will break images again - not recommended
db.news.updateMany(
  { imageUrl: { $regex: "^http" } },
  [{ $set: { imageUrl: { $substr: ["$imageUrl", 18, -1] } } }]
)
```

**Better:** Fix the issue instead of reverting.

---

## 📝 Post-Deployment

### Monitor
- Check server logs for errors
- Monitor image loading times
- Check disk space usage

### Document
- Note deployment date
- Record any issues encountered
- Update team documentation

### Communicate
- Notify team of changes
- Confirm images working
- Get feedback from users

---

## 🎓 What Changed

### Before
```
News image URL: /uploads/news/image.jpg
Works on: Localhost only ✅
Works on: Production ❌
```

### After
```
News image URL: https://your-domain.com/uploads/news/image.jpg
Works on: Localhost ✅
Works on: Production ✅
```

---

## 📚 Additional Resources

- [NEWS_IMAGE_URL_FIX.md](NEWS_IMAGE_URL_FIX.md) - Technical details
- [NEWS_IMAGE_CODE_CHANGES.md](NEWS_IMAGE_CODE_CHANGES.md) - Code changes
- [NEWS_IMAGE_FIX_SUMMARY.md](NEWS_IMAGE_FIX_SUMMARY.md) - Overview

---

## ✨ You're Done!

Once all steps are complete and tests pass, the fix is deployed successfully! 🎉

Images will now work on both localhost and production servers.
