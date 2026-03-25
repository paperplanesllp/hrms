# Document Upload Debugging Guide

## Console Logging Added ✅

I've added comprehensive logging to help identify the issue. Here's what to check:

### Step 1: Open Developer Console
1. Open Firefox/Chrome
2. Press `F12` or right-click → "Inspect" 
3. Click **Console** tab

### Step 2: Loading Submissions
When the HR Document Management page loads:

**Look for this log:**
```
✅ [DATA LOADED] Document Submissions:
```

This will show all submissions with their data structure. Check if:
- ✅ `fileUrl` - Should exist (e.g., `/uploads/documents/file-123.pdf`)
- ✅ `fileName` - Original filename uploaded
- ✅ `fileSize` - Size in bytes
- ✅ `submittedAt` - ISO datetime string

**If you see `undefined` for these fields** → Problem is in backend (not returning file info)

---

### Step 3: Click on a "submitted" Document

**Look for this log:**
```
📋 [MODAL OPENED] Submission selected
📋 Full submission object: {...}
📋 fileUrl: /uploads/documents/DEVELOPER_INTERN_KRA_KPI.pdf
📋 fileName: DEVELOPER_INTERN_KRA_KPI.pdf
📋 fileSize: 354304
📋 submittedAt: 2026-03-19T10:30:00.000Z
```

**Check:**
- Does `fileUrl` have a value?
- Does it start with `/uploads/documents/`?

**If fileUrl is `null` or `undefined`:**
- Backend isn't populating the file fields
- Files may not be saving properly during upload

---

### Step 4: Click "View" Button

**Look for these logs:**
```
👁️ [VIEW BUTTON] Clicked
📂 [VIEW DOCUMENT] Called
📂 fileUrl: /uploads/documents/DEVELOPER_INTERN_KRA_KPI.pdf
📂 window.location.origin: http://localhost:5174
📂 Full URL: http://localhost:5174/uploads/documents/DEVELOPER_INTERN_KRA_KPI.pdf
✅ [VIEW DOCUMENT] Opening file in new window...
✅ [VIEW DOCUMENT] Window opened successfully
```

**If instead you see:**
```
❌ [VIEW DOCUMENT] No fileUrl provided!
```
→ The backend didn't store the file URL

**If you see:**
```
❌ [VIEW DOCUMENT] Failed to open new window (popup blocked?)
```
→ Allow popups for this site

---

### Step 5: Click "Download" Button

**Look for these logs:**
```
⬇️ [DOWNLOAD BUTTON] Clicked
⬇️ [DOWNLOAD DOCUMENT] Called
⬇️ fileUrl: /uploads/documents/DEVELOPER_INTERN_KRA_KPI.pdf
⬇️ fileName: DEVELOPER_INTERN_KRA_KPI.pdf
⬇️ [DOWNLOAD DOCUMENT] Starting download...
⬇️ [DOWNLOAD DOCUMENT] Fetching from local API: /uploads/documents/...
⬇️ [DOWNLOAD DOCUMENT] API response received, blob size: 354304
⬇️ [DOWNLOAD DOCUMENT] Object URL created: blob:http://localhost:5174/...
⬇️ [DOWNLOAD DOCUMENT] Link created, triggering click...
✅ [DOWNLOAD DOCUMENT] Download completed successfully
```

**If you see an error like:**
```
❌ [DOWNLOAD DOCUMENT] Error occurred: 404 Not Found
```
→ Backend endpoint doesn't have the file (check `uploads/documents/` directory)

**If you see:**
```
❌ [DOWNLOAD DOCUMENT] Error occurred: CORS or network error
```
→ Backend not serving the file or CORS not configured

---

## Common Issues & Solutions

### Issue 1: fileUrl is `null`
**Symptom:** Console shows `fileUrl: null` or `undefined`

**Root Cause:** Backend `uploadEmployeeDocument` controller isn't saving file path to database

**Solution:**
1. Check backend: `server/src/modules/documents/document.controller.js`
2. Find `uploadEmployeeDocument` function
3. Make sure `fileUrl` is being saved:
   ```javascript
   await uploadDocument(req.user.id, documentTypeId, {
     fileName: req.file.originalname,
     fileUrl: `/uploads/documents/${req.file.filename}`, // Check this line
     fileSize: req.file.size,
     fileType: req.file.mimetype
   });
   ```

### Issue 2: 404 Error When Downloading
**Symptom:** Console shows `HTTP Error: 404`

**Root Cause:** File not created on server during upload

**Solution:**
1. Check: `server/uploads/documents/` folder exists?
2. Run: `node` terminal, then `ls server/uploads/documents/`
3. Should see PDF files there
4. If empty → upload isn't working properly

### Issue 3: View/Download Buttons Don't Appear
**Symptom:** Modal opens but no View/Download buttons shown

**Root Cause:** `fileUrl` is null, so the section doesn't render

**Look for:**
```jsx
{selectedSubmission.fileUrl && (
  // This section only shows if fileUrl exists
)}
```

---

## Next Debug Steps

After collecting console logs, share:

1. **Screenshot of console logs** showing the loaded submissions
2. **What you see in the modal** when clicking a submitted document
3. **Error messages** (if any)
4. **Check backend directory:**
   ```bash
   # In PowerShell:
   ls server/uploads/documents/
   ```
   Share what files are there (or "directory doesn't exist")

---

## File Upload Flow (How it Should Work)

```
1. Employee: Uploads PDF via DocumentsPage.jsx
   ↓
2. Frontend: FormData sent to POST /documents/upload
   ↓
3. Backend: Multer saves file to server/uploads/documents/file-xxx.pdf
   ↓
4. Backend: Saves metadata to MongoDB:
   - fileName: "DEVELOPER_INTERN_KRA_KPI.pdf"
   - fileUrl: "/uploads/documents/file-xxx.pdf"
   - fileSize: 354304
   - submittedAt: 2026-03-19T10:30:00Z
   ↓
5. HR: Loads submissions → fileUrl is returned from API
   ↓
6. HR: Clicks View → Opens http://localhost:5174/uploads/documents/file-xxx.pdf
   ↓
7. Backend: Serves file from server/uploads/documents/ directory
   ↓
8. File: Opens in browser or downloads
```

---

## Testing Checklist

After adding this console logging:

- [ ] Refresh page (F5)
- [ ] Check console for "✅ [DATA LOADED]" log
- [ ] Click a submitted document
- [ ] Check console for "📋 [MODAL OPENED]" log
- [ ] Click "View" button
- [ ] Check console for logs (success or error)
- [ ] Click "Download" button  
- [ ] Check console for logs (success or error)
- [ ] Share console output with developer

**Send Screenshot:** F12 → Console → Right-click → "Save as..." to export logs
