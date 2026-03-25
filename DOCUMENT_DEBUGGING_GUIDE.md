# COMPREHENSIVE DOCUMENT UPLOAD DEBUGGING GUIDE

## 🔧 Added Console Logging

I've added **extensive logging to both frontend and backend** to track exactly where the issue is.

---

## 📋 DEBUGGING STEPS

### STEP 1: Check Backend Console (Server Terminal)

When an employee uploads a file, you should see in the terminal running `npm run dev`:

```
📦 [UPLOAD] Request received
📦 [UPLOAD] File: { fieldname: 'file', originalname: 'DEVELOPER_INTERN_KRA_KPI.pdf', ... }
📦 [UPLOAD] Body: { documentTypeId: '...' }
📦 [UPLOAD] File details - name: DEVELOPER_INTERN_KRA_KPI.pdf size: 354304 mime: application/pdf
📦 [UPLOAD] FileData prepared: {
  fileName: 'DEVELOPER_INTERN_KRA_KPI.pdf',
  fileUrl: '/uploads/documents/DEVELOPER_INTERN_KRA_KPI-5910282949.pdf',
  fileSize: 354304,
  fileType: 'application/pdf'
}
✅ [UPLOAD] Document saved to DB: {
  _id: '65a2b3c4d5e6f7...',
  fileName: 'DEVELOPER_INTERN_KRA_KPI.pdf',
  fileUrl: '/uploads/documents/DEVELOPER_INTERN_KRA_KPI-5910282949.pdf',
  fileSize: 354304,
  submissionStatus: 'submitted',
  submittedAt: '2026-03-19T10:30:00.000Z'
}
```

**If you see ✅ [UPLOAD] success:** File is being saved correctly to database

**If you DON'T see it:** Upload failed - check error messages

---

### STEP 2: Check Frontend Console (Browser F12)

When HR page loads, look in browser Console (F12):

```
✅ [DATA LOADED] Document Submissions:
[ { fileUrl: '/uploads/documents/DEVELOPER_INTERN_KRA_KPI-5910282949.pdf', fileName: '...', fileSize: 354304, ... } ]
📊 Each submission should have: fileUrl, fileName, fileSize, submittedAt
```

**If fileUrl shows as `null` or `undefined`:**
→ Backend API isn't returning file information
→ Problem in Step 1 (file wasn't saved)

**If fileUrl shows correctly:**
→ Go to Step 3

---

### STEP 3: Click on a Submitted Document in HR Panel

Look in browser console for:

```
📋 [MODAL OPENED] Submission selected
📋 Full submission object: {
  _id: '...',
  fileUrl: '/uploads/documents/...',
  fileName: 'DEVELOPER_INTERN_KRA_KPI.pdf',
  fileSize: 354304,
  submittedAt: '2026-03-19T10:30:00.000Z'
}
```

**If fileUrl is null:**
→ Problem from Step 2 (not returned from API)

**If fileUrl appears correctly:**
→ Continue to Step 4

---

### STEP 4: Click "View" Button

Look in browser console:

```
👁️ [VIEW BUTTON] Clicked
📂 [VIEW DOCUMENT] Called
📂 fileUrl: /uploads/documents/DEVELOPER_INTERN_KRA_KPI-5910282949.pdf
📂 window.location.origin: http://localhost:5174
📂 Full URL: http://localhost:5174/uploads/documents/DEVELOPER_INTERN_KRA_KPI-5910282949.pdf
✅ [VIEW DOCUMENT] Opening file in new window...
✅ [VIEW DOCUMENT] Window opened successfully
```

**Error: "No fileUrl provided"**
→ fileUrl is null - refer to Step 2

**Error: "Failed to open new window (popup blocked?)"**
→ Allow popups for this site in browser settings

**Window opens but shows blank/error:**
→ File doesn't exist on server
→ Check: `server/uploads/documents/` has the file

---

### STEP 5: Click "Download" Button

Look in browser console:

```
⬇️ [DOWNLOAD BUTTON] Clicked
⬇️ [DOWNLOAD DOCUMENT] Called
⬇️ fileUrl: /uploads/documents/DEVELOPER_INTERN_KRA_KPI-5910282949.pdf
⬇️ [DOWNLOAD DOCUMENT] Starting download...
⬇️ [DOWNLOAD DOCUMENT] Fetching from local API: /uploads/documents/...
⬇️ [DOWNLOAD DOCUMENT] API response received, blob size: 354304
✅ [DOWNLOAD DOCUMENT] Download completed successfully
```

**Error: "404 Not Found"**
→ File doesn't exist in `server/uploads/documents/`
→ Verify file was saved in Step 1

**Error: "CORS or network error"**
→ Backend not responding or wrong port

---

## 🎯 DECISION TREE

### Issue: Can't Open File

**Question 1:** Backend console shows `✅ [UPLOAD] Document saved`?
- **NO** → File upload failed
  - Check employee can upload from DocumentsPage.jsx
  - Check multer configuration
  
- **YES** → Go to Question 2

**Question 2:** Browser console shows `fileUrl` != null when page loads?
- **NO** → Backend API isn't returning file data
  - Check: `getSubmissionStatus` returning fileUrl in database
  - Database might not have fileUrl saved
  
- **YES** → Go to Question 3

**Question 3:** Modal shows file info when you click document?
- **NO** → React/UI issue
  - Check for console errors
  
- **YES** → Go to Question 4

**Question 4:** View button logs show success?
- **NO** → Check error logs from Step 4
  - 404 = file not on disk
  - Popup blocked = allow popups
  
- **YES** → Check if file opened/downloaded

---

## 📁 FILE STRUCTURE CHECK

```powershell
# In PowerShell terminal, verify files are being saved:

ls server/uploads/documents/

# Should show files like:
# DEVELOPER_INTERN_KRA_KPI-1234567890.pdf
# bank-details-9876543210.pdf
# etc.
```

**If directory is empty:**
→ Files not being saved to disk
→ Check multer configuration in `server/src/middleware/upload.js`

**If directory doesn't exist:**
→ Hasn't been created yet
→ Should auto-create on server startup
→ Check `server/src/middleware/upload.js` line 64

---

## 🔍 HOW TO COLLECT DEBUG INFO

**For Frontend:**
1. Press F12 → Console
2. Right-click in console → "Save as..." → choose location
3. This will save all console logs

**For Backend:**
1. Look at terminal running `npm run dev`
2. Screenshot or copy the 📦 and 📋 logs

**Share both logs + answer these:**
- Did employee successfully upload?
- What error appears when clicking View?
- What shows in `server/uploads/documents/`?

---

## 🧪 QUICK TEST FLOW

1. **Refresh HR page** (F5)
2. **Trigger console logs** by doing this sequence:
   - Employee uploads a file (watch backend console)
   - Wait 2 seconds
   - HR reloads Document Management page (watch browser console)
   - Click a submitted document (watch browser console)
   - Click View button (watch browser console)
   - Click Download button (watch browser console)

3. **Collect console output** from both terminals
4. **Share with developer** along with which step failed

---

## ⚠️ COMMON ISSUES

| Issue | Sign | Solution |
|-------|------|----------|
| Popup blocked | Console: "Failed to open window" | Browser settings → Allow popups |
| File not on disk | Console: "404 Not Found" | Check `server/uploads/documents/` |
| No fileUrl in DB | Console: `fileUrl: null` | Review backend upload logs |
| API not returning data | fileUrl null in browser | Check `getSubmissionStatus` returns file fields |
| Directory doesn't exist | Error creating files | Server restart or manual mkdir |

---

## 📚 FILES TO CHECK

- **Frontend logs:** Browser Console (F12)
- **Backend logs:** Node terminal where `npm run dev` is running  
- **Uploaded files:** `server/uploads/documents/`
- **Upload middleware:** `server/src/middleware/upload.js`
- **Upload controller:** `server/src/modules/documents/document.controller.js`
- **HR page:** `erp-dashboard/src/features/hr/HRDocumentsManagementPage.jsx`

---

## ✅ SUCCESS INDICATORS

- Backend console: ✅ [UPLOAD] saved
- Browser console: fileUrl in data
- Modal shows: File name, size, date
- View button: Opens file
- Download button: File downloads

**If all these work → Issue is resolved! ✅**
