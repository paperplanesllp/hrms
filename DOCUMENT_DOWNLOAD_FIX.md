# Document Download/View Fix - Testing Guide

## 🔧 What Was Fixed

### The Problem
The server couldn't serve uploaded files because the static route was using:
```javascript
express.static("uploads")  // ❌ Relative path - WRONG
```

This looks for uploads in the wrong directory.

### The Solution  
Changed to absolute path:
```javascript
const uploadsPath = path.join(__dirname, "../uploads");
express.static(uploadsPath)  // ✅ Absolute path - CORRECT
```

Now the server correctly serves files from: `C:\Users\HP\OneDrive\Desktop\erp-project\server\uploads\documents\`

---

## ✅ Testing Steps

### Step 1: Restart Backend Server

**Terminate current server:**
1. In your backend terminal (node terminal)
2. Press `Ctrl+C` to stop the server
3. Wait for it to stop

**Start fresh:**
```bash
npm run dev
```

**Look for this log:**
```
📁 [SERVER] Uploads directory: C:\Users\HP\OneDrive\Desktop\erp-project\server\uploads
```

---

### Step 2: Test File Download with Postman

1. **Get list of documents:**
   ```
   GET http://localhost:5000/api/documents/status/all
   ```
   
   Expected: JSON with submissions that have `fileUrl` like:
   ```json
   {
     "fileUrl": "/uploads/documents/DEVELOPER_INTERN_KRA_KPI-1710900600000.pdf",
     "fileName": "DEVELOPER_INTERN_KRA_KPI.pdf",
     "fileSize": 354304
   }
   ```

2. **Test direct file access:**
   ```
   GET http://localhost:5000/uploads/documents/DEVELOPER_INTERN_KRA_KPI-1710900600000.pdf
   ```
   
   **Expected:** File downloads (not 404)
   
   **If 404:** Check the exact filename in the directory

---

### Step 3: Test from HR Panel

1. **Login as HR** (hr@gmail.com)
2. **Go to Document Management**
3. **Click a submitted document**
4. **Check browser Console (F12)** for this:
   ```
   📋 [MODAL OPENED] Submission selected
   📋 fileUrl: /uploads/documents/...
   ```

5. **Click "View"** button
   - Browser console should show: ✅ [VIEW DOCUMENT] Window opened successfully
   - PDF should open in new tab

6. **Click "Download"** button
   - Browser console should show: ✅ [DOWNLOAD DOCUMENT] Download completed successfully
   - File should download to your Downloads folder

---

## 🧪 Verification Commands

### Check files are on disk:
```powershell
# Add this exact path to verify files exist
ls "C:\Users\HP\OneDrive\Desktop\erp-project\server\uploads\documents\"

# Should show files like:
# DEVELOPER_INTERN_KRA_KPI-1234567890.pdf
# bank-details-9876543210.pdf
```

### Test API route:
```bash
# Replace filename with actual file from disk
curl http://localhost:5000/uploads/documents/DEVELOPER_INTERN_KRA_KPI-1234567890.pdf
```

---

## 📋 Correct API Routes

**NOT:**
- ❌ `/admin/documents` (doesn't exist)
- ❌ `/documents` (missing `/api/`)

**CORRECT:**
- ✅ `/api/documents` - Get all document types
- ✅ `/api/documents/my-documents` - Get employee's documents
- ✅ `/api/documents/status/all` - Get all submissions (HR only)
- ✅ `/api/documents/upload` - Upload document (POST)
- ✅ `/api/documents/:id/approve` - Approve submission (POST)
- ✅ `/api/documents/:id/reject` - Reject submission (POST)

**File Access:**
- ✅ `/uploads/documents/FILENAME.pdf` - Download file directly

---

## 🔍 Backend Console Logs

After fixing, you should see these logs:

**On startup:**
```
📁 [SERVER] Uploads directory: C:\Users\HP\OneDrive\Desktop\erp-project\server\uploads
```

**When accessing file:**
```
📥 [STATIC] Requested file: /documents/DEVELOPER_INTERN_KRA_KPI-1234567890.pdf
```

**When viewing submissions:**
```
📋 [GET SUBMISSIONS] Total submissions returned: 1
📋 [GET SUBMISSIONS] First submission sample: {
  fileUrl: '/uploads/documents/DEVELOPER_INTERN_KRA_KPI-1234567890.pdf',
  fileName: 'DEVELOPER_INTERN_KRA_KPI.pdf',
  fileSize: 354304,
  ...
}
```

---

## ✨ Expected Result

✅ File uploaded successfully  
✅ Can see filename in HR panel  
✅ Can click "View" → opens in browser  
✅ Can click "Download" → saves to computer  
✅ Both show in browser console as success  

**If this all works → Issue is resolved! 🎉**

---

## ⚠️ If Still Not Working

1. Check backend console for `📁 [SERVER] Uploads directory:` log
2. Verify the path shown is correct
3. Check files exist in that directory: `ls C:\Users\HP\OneDrive\Desktop\erp-project\server\uploads\documents\`
4. Try accessing directly in browser: `http://localhost:5000/uploads/documents/FILENAME.pdf`
5. Share the error and logs from Postman/browser

---

## 📝 Summary of Changes

**File:** `server/src/app.js`

**Added:**
```javascript
import path from "path";
import { fileURLToPath } from "url";
```

**Changed from:**
```javascript
express.static("uploads")
```

**Changed to:**
```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, "../uploads");
express.static(uploadsPath)
```

**Added logging:**
```javascript
console.log("📁 [SERVER] Uploads directory:", uploadsPath);
app.use("/uploads", (req, res, next) => {
  console.log("📥 [STATIC] Requested file:", req.path);
  ...
}, express.static(uploadsPath));
```

This ensures files are served from the correct location!
