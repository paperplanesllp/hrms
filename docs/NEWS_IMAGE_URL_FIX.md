# News Image URL Fix - Complete Solution

## Problem
Images uploaded to news were showing on localhost but not on production server.

**Root Cause:** 
- Images were stored with relative URLs: `/uploads/news/image.jpg`
- On localhost: `http://localhost:3000/uploads/news/image.jpg` ✅ works
- On server: `/uploads/news/image.jpg` ❌ doesn't work (relative path)

## Solution
Store **full URLs** with domain in the database instead of relative paths.

## Changes Made

### 1. News Controller (`news.controller.js`)
**Before:**
```javascript
data.imageUrl = `/uploads/news/${req.file.filename}`;
```

**After:**
```javascript
const baseUrl = `${req.protocol}://${req.get('host')}`;
data.imageUrl = `${baseUrl}/uploads/news/${req.file.filename}`;
```

Now stores: `http://example.com/uploads/news/image.jpg` ✅

### 2. Environment Configuration (`env.js`)
Added `SERVER_URL` variable:
```javascript
SERVER_URL: process.env.SERVER_URL || "http://localhost:3000"
```

### 3. Migration Script (`scripts/migrateNewsImageUrls.js`)
Converts existing relative URLs to full URLs.

## Deployment Steps

### Step 1: Update Environment Variables
Add to your `.env` file:
```
SERVER_URL=https://your-domain.com
```

### Step 2: Deploy Code Changes
- Update news controller
- Update env.js
- Deploy to server

### Step 3: Run Migration (One-time)
```bash
cd server
node ../scripts/migrateNewsImageUrls.js
```

This converts all existing news records from:
- `/uploads/news/image.jpg` → `https://your-domain.com/uploads/news/image.jpg`

### Step 4: Verify
1. Create a new news item with image
2. Check database - should have full URL
3. Check frontend - image should display

## How It Works

### Creating News with Image
```
POST /api/news
Content-Type: multipart/form-data

title: "Company Update"
body: "..."
image: [file]
```

**Response:**
```json
{
  "news": {
    "_id": "...",
    "title": "Company Update",
    "imageUrl": "https://your-domain.com/uploads/news/image-123456.jpg"
  }
}
```

### Frontend Usage
```javascript
// Image URL is now complete and works everywhere
<img src={news.imageUrl} alt={news.title} />
```

## Testing

### Local Testing
1. Create news with image on localhost
2. Check database - should have `http://localhost:3000/uploads/news/...`
3. Image displays ✅

### Production Testing
1. Set `SERVER_URL=https://your-domain.com` in `.env`
2. Create news with image
3. Check database - should have `https://your-domain.com/uploads/news/...`
4. Image displays ✅

## Troubleshooting

### Images Still Not Showing
1. Check if `SERVER_URL` is set correctly in `.env`
2. Verify migration script ran: `node scripts/migrateNewsImageUrls.js`
3. Check database - imageUrl should have full domain
4. Check browser console for CORS errors

### Migration Failed
```bash
# Check MongoDB connection
node scripts/migrateNewsImageUrls.js

# If error, verify:
# 1. MONGO_URI is correct in .env
# 2. MongoDB is running
# 3. Database has news records
```

### Old Images Not Working
Run migration script to convert old relative URLs:
```bash
node scripts/migrateNewsImageUrls.js
```

## Files Modified

1. **server/src/modules/news/news.controller.js**
   - Updated `postNews()` - store full URL
   - Updated `patchNews()` - store full URL

2. **server/src/modules/news/news.service.js**
   - Updated `deleteImageFile()` - handle full URLs
   - Updated `cleanupMissingImages()` - handle full URLs

3. **server/src/config/env.js**
   - Added `SERVER_URL` configuration

4. **scripts/migrateNewsImageUrls.js** (NEW)
   - Migration script to convert existing URLs

## Environment Variables

### Development (.env)
```
SERVER_URL=http://localhost:3000
```

### Production (.env)
```
SERVER_URL=https://your-domain.com
```

## API Endpoints

### Create News with Image
```
POST /api/news
Authorization: Bearer <token>
Content-Type: multipart/form-data

title: "News Title"
body: "News content"
image: <file>
isPolicyUpdate: false
```

### Update News with New Image
```
PATCH /api/news/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

title: "Updated Title"
image: <file>
```

### Delete News (Cleans Up Image)
```
DELETE /api/news/:id
Authorization: Bearer <token>
```

## Database Schema

### News Model
```javascript
{
  title: String,
  body: String,
  imageUrl: String,  // Now stores full URL: "https://domain.com/uploads/news/..."
  publishDate: Date,
  isPolicyUpdate: Boolean,
  createdBy: ObjectId,
  viewedBy: [ObjectId],
  status: String,
  timestamps: true
}
```

## Performance Notes

- Images are served from `/uploads` directory via Express static middleware
- Full URLs are cached in database (no runtime construction)
- CORS headers are properly set for image serving
- Cache-Control: `public, max-age=3600` (1 hour)

## Security Notes

- Only HR can create/update/delete news
- Images are validated (JPEG, PNG, GIF, WebP only)
- Max file size: 5MB
- Files are stored server-side with unique names
- Old images are deleted when news is updated/deleted
