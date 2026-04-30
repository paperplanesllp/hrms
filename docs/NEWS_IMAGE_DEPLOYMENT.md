# News Image Fix - Quick Deployment Checklist

## ✅ What Was Fixed

Images in news now work on both localhost AND production server.

**Before:** Images only worked on localhost ❌
**After:** Images work everywhere ✅

## 🚀 Deployment Steps (5 minutes)

### Step 1: Update .env File
Add this line to your server `.env`:
```
SERVER_URL=https://your-domain.com
```

For localhost:
```
SERVER_URL=http://localhost:3000
```

### Step 2: Deploy Code
Pull the latest code with these changes:
- `server/src/modules/news/news.controller.js` ✅
- `server/src/modules/news/news.service.js` ✅
- `server/src/config/env.js` ✅
- `scripts/migrateNewsImageUrls.js` ✅

### Step 3: Run Migration (One-time)
```bash
cd server
node ../scripts/migrateNewsImageUrls.js
```

**Output should show:**
```
✅ Connected to MongoDB
📋 Found X news items with relative URLs
✓ Migrated: /uploads/news/... → https://your-domain.com/uploads/news/...
✅ Migration completed: X/X news items updated
```

### Step 4: Restart Server
```bash
npm start
```

### Step 5: Test
1. Create a news item with an image
2. Check if image displays ✅
3. Check database - URL should have full domain

## 🔍 Verification

### Check Database
```javascript
// In MongoDB
db.news.findOne({ imageUrl: { $exists: true } })

// Should show:
// imageUrl: "https://your-domain.com/uploads/news/image-123.jpg"
```

### Check Frontend
- Image should display in news list ✅
- Image should display in news detail ✅
- No broken image icons ✅

## ⚠️ Troubleshooting

### Images Still Not Showing?
1. Check `.env` has `SERVER_URL` set
2. Run migration: `node scripts/migrateNewsImageUrls.js`
3. Restart server
4. Clear browser cache (Ctrl+Shift+Delete)

### Migration Failed?
```bash
# Check MongoDB connection
# Verify MONGO_URI in .env
# Verify MongoDB is running
# Try again: node scripts/migrateNewsImageUrls.js
```

### Old Images Broken?
Run migration to fix all old URLs:
```bash
node scripts/migrateNewsImageUrls.js
```

## 📋 Files Changed

| File | Change |
|------|--------|
| `news.controller.js` | Store full URLs instead of relative |
| `news.service.js` | Handle full URLs in cleanup |
| `env.js` | Add SERVER_URL config |
| `migrateNewsImageUrls.js` | NEW - Migration script |

## 🎯 Expected Result

### Before Fix
- Localhost: ✅ Images work
- Server: ❌ Images broken

### After Fix
- Localhost: ✅ Images work
- Server: ✅ Images work
- Production: ✅ Images work

## 📞 Support

If images still don't work:
1. Check `.env` has correct `SERVER_URL`
2. Check migration ran successfully
3. Check database has full URLs
4. Check `/uploads/news/` directory exists
5. Check file permissions on server

## 🔐 Security

- Only HR can upload images
- Images validated (JPEG, PNG, GIF, WebP)
- Max 5MB per image
- Old images auto-deleted
- Unique filenames prevent conflicts
