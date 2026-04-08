# Attendance Geofence Fix - Testing & Verification Guide

## Overview
This document provides step-by-step testing procedures to verify the attendance geofence fix is working correctly.

## Prerequisites
1. Backend server running on port 5000
2. Frontend accessible on port 5174 (or configured port)
3. Test user with EMPLOYEE role (not admin)
4. Admin user configured with office location in Settings
5. Browser with GPS capabilities (Chrome/Firefox recommended)
6. GPS permission granted to browser on first test

## Test Setup

### 1. Configure Office Location (Admin Only)
1. Log in as Admin
2. Go to Settings → Company Location
3. Set office coordinates:
   - **Example for testing:** Latitude: 23.1815, Longitude: 79.9864 (Indore, India)
   - This will be the office center point
4. Save settings
5. Verify geofence radius is 50m (hardcoded, not visible to users)

### 2. Prepare Test Environment
1. Log out as Admin
2. Log in as regular Employee user
3. Open browser DevTools (F12) → Console tab
4. You'll see geolocation logs here for debugging

---

## Test Case 1: Check-In Inside Office (SHOULD SUCCEED)
**Objective:** Verify employee can check in when inside office geofence

### Steps:
1. Open Attendance Page (for employee) or Attendance Monitoring (if admin checking own)
2. Navigate to office location (use GPS simulator if testing)
3. Click "Check In" button
4. Wait for geolocation request (permission dialog may appear)
5. Click "Allow" or "Allow Once" for GPS permission

### Expected Result:
✅ Success toast message: "Checked in successfully"
✅ Distance shown: "Distance from office: 5m" (or similar, within 50m)
✅ Check In button becomes disabled
✅ Check Out button becomes enabled
✅ Console shows: "✅ Location captured" and "✅ Check-in successful"
✅ Database stores: checkInLatitude, checkInLongitude, checkInAccuracy, checkInDistanceFromOffice, checkInWithinGeofence: true

### Verification:
1. Refresh page
2. Today's section shows: Check In time in 12-hour format (e.g., "09:32 AM")
3. Go to Attendance Records
4. Today's row shows: 
   - Check-in time in 12-hour format
   - Distance: "5m away" with map pin icon
   - Status: PRESENT (if after shift start) or SHORT_HOURS (if before)

---

## Test Case 2: Check-In Outside Office (SHOULD FAIL)
**Objective:** Verify employee CANNOT check in when outside office geofence

### Steps:
1. Open Attendance Page
2. Navigate OUTSIDE office location (50m+ away):
   - Use GPS simulator to set wrong coordinates
   - Or physically move away from office
3. Click "Check In" button
4. Wait for geolocation request
5. Click "Allow" for GPS permission

### Expected Result:
❌ Error toast message: "You are 125m away from office (50m allowed). You must be inside the office location to check in."
❌ Check In button remains ENABLED
❌ No attendance record created
❌ Console shows: "❌ Check-in failed: You are 125m away..."
❌ Database: No new record created

### Verification:
1. Refresh page
2. Check In button still shows "Check In" (not disabled)
3. Today's section is empty (no check-in time)
4. No new record in Attendance History

---

## Test Case 3: Check-Out Inside Office (SHOULD SUCCEED)
**Objective:** Verify employee can check out when inside office geofence

### Steps:
1. Ensure you have already checked in today (from Test Case 1)
2. Navigate back to office location
3. Click "Check Out" button
4. Wait for geolocation request
5. Click "Allow" for GPS permission

### Expected Result:
✅ Success toast message: "Checked out successfully"
✅ Distance shown: "Distance from office: 8m" (or similar, within 50m)
✅ Check Out button becomes disabled
✅ Both Check In and Check Out buttons disabled
✅ Console shows: "✅ Location captured: {long...}" and "✅ Check-out successful"
✅ Database stores: checkOutLatitude, checkOutLongitude, checkOutAccuracy, checkOutDistanceFromOffice, checkOutWithinGeofence: true

### Verification:
1. Refresh page
2. Today's section shows both Check In and Check Out times in 12-hour format
3. Time Worked shows calculated hours (e.g., "4h 35m 23s")
4. Both buttons disabled with checkmarks
5. In Attendance Records:
   - Today's row shows both times
   - Status updated (PRESENT, SHORT_HOURS, HALF_DAY based on shift)
   - Both distances shown

---

## Test Case 4: Check-Out Outside Office (SHOULD FAIL)
**Objective:** Verify employee CANNOT check out when outside office geofence

### Prerequisites:
- Must have checked in already (from Test Case 1 or 3)

### Steps:
1. Navigate OUTSIDE office location (50m+ away)
2. Use GPS simulator to set wrong coordinates
3. Click "Check Out" button
4. Wait for geolocation request
5. Click "Allow" for GPS permission

### Expected Result:
❌ Error toast message: "You are 152m away from office (50m allowed). You must be inside the office location to check out."
❌ Check Out button remains ENABLED
❌ Checkout is NOT recorded
❌ Previous check-in is still in database
❌ Console shows: "❌ Check-out failed: You are 152m away..."

### Verification:
1. Refresh page
2. Check Out button still shows "Check Out" (not disabled)
3. Check In time is still there, but Check Out is empty
4. Time Worked shows only check-in time, not checkout
5. Status shows ABSENT or PRESENT (depending on time of day)
6. In Attendance Records:
   - Check Out column is empty
   - Status is ABSENT (for past dates) or PRESENT (for today)

---

## Test Case 5: Check-Out Without Check-In (SHOULD FAIL)
**Objective:** Verify employee CANNOT check out without first checking in

### Steps:
1. Clear data or log in as fresh user with no check-in today
2. Go to Attendance Page
3. Click "Check Out" button directly (without checking in first)
4. Note result

### Expected Result:
❌ Error message: "Check-in required before checkout"
❌ Check Out button remains ENABLED
❌ No checkout record created
❌ Or "You have already checked out today" error if trying with another date

### Verification:
1. Check Out button still enabled
2. No changes to database

---

## Test Case 6: Duplicate Check-Out (SHOULD FAIL)
**Objective:** Verify employee CANNOT check out twice on same day

### Prerequisites:
- Must have successfully checked out (from Test Case 3)

### Steps:
1. Go to Attendance Page
2. Try to click "Check Out" again
3. Note result

### Expected Result:
❌ Check Out button is DISABLED (greyed out with "Checked Out ✓")
- User cannot click it

OR if somehow clicked (via API):
❌ Error message: "You have already checked out today."

### Verification:
Check Out button remains disabled with checkmark

---

## Test Case 7: Location Permission Denied (SHOULD FAIL)
**Objective:** Verify proper error handling when GPS permission denied

### Steps:
1. Have browser GPS permission set to "Block" for the domain
2. Go to Attendance Page
3. Click "Check In" button
4. Deny GPS permission in browser dialog (if appears)

### Expected Result:
❌ Geolocation error caught and displayed
❌ Toast message appears (varies by browser): 
   - "User denied geolocation" or
   - "Geolocation permission denied" or
   - "Location is required..."
❌ Check In remains ENABLED
❌ No record created

### Verification:
1. Check DevTools → Console for error details
2. Check In button still shows "Check In"
3. No attendance record created

### Fix:
1. Go to browser Settings → Privacy → Site settings → Location
2. Find your domain
3. Change from "Block" to "Allow"
4. Retry Test Case 1

---

## Test Case 8: Invalid Coordinates (SHOULD FAIL)
**Objective:** Verify system rejects malformed coordinate data

### Scenario: Frontend sends undefined/null coordinates

### Expected Result:
❌ Error: "Check-in location coordinates are incomplete"
❌ No record created
❌ Backend logs show validation error

### Testing Method:
Use browser DevTools → Network → Intercept request and modify coordinates to null/undefined
OR modify frontend code temporarily to send bad data

---

## Test Case 9: Admin Geofence Exemption
**Objective:** Verify admins can check-in/out from ANYWHERE without geofence restriction

### Steps:
1. Log in as ADMIN user
2. Navigate OUTSIDE office location (100m+ away)
3. Click "Check In" button
4. Wait for geolocation
5. Click "Allow"

### Expected Result:
✅ Success: "Checked in successfully"
❌ NOT blocked by geofence even though outside office
✅ Distance will show: "0m away" or actual distance (recorded for audit)
✅ Location recorded: checkInLatitude, checkInLongitude, checkInWithinGeofence: true (always true for admin)

### Verification:
1. Admin can check-in/out from anywhere
2. Both check-in and check-out succeed regardless of location
3. No "outside office" error messages for admins
4. Audit fields still populated for tracking

---

## Test Case 10: Table Display Formatting
**Objective:** Verify table shows dates and times in correct format

### Verification Checklist:
- [ ] Date column shows: "07-Apr-2026" (DD-MMM-YYYY format)
- [ ] Check In column shows: "09:32 AM" (12-hour format with AM/PM)
- [ ] Check Out column shows: "05:15 PM" (12-hour format with AM/PM)
- [ ] Distance shown: "5m away" with map pin icon (when recorded)
- [ ] Status badge shows correct color:
  - [ ] PRESENT = Green
  - [ ] SHORT_HOURS = Orange
  - [ ] HALF_DAY = Amber
  - [ ] ABSENT = Red (especially "Forgot Check-out")
  - [ ] HOLIDAY = Blue
- [ ] "Out of range" warning appears if distance > 50m

---

## Test Case 11: Timezone/Date Edge Case - Midnight Crossover
**Objective:** Verify system handles cross-midnight checkout correctly

### Scenario: Night shift employee

### Setup:
1. Admin configures shift: 22:00 - 06:00 (10 PM to 6 AM)
2. Employee works night shift
3. Checks in: 22:15 (today)
4. Checks out: 05:45 (tomorrow morning)

### Expected Result:
✅ Both check-in and check-out recorded on SAME attendance date (today's date)
✅ Total hours calculated correctly: ~7.5 hours
✅ Status: PRESENT (full shift worked)
✅ Database: date field shows TODAY, not tomorrow
✅ IST timezone ensures no confusion

### Verification:
1. Go to Attendance Records → Today
2. Record shows:
   - Check In: "10:15 PM" (22:15)
   - Check Out: "05:45 AM" (05:45)
   - Total Hours: "7h 30m" (approximately)
   - Status: PRESENT
   - NOT split into two days

---

## Test Case 12: Table Distance Display - Out of Range Warning
**Objective:** Verify visual warning when distance exceeds geofence

### Setup:
1. Create a test record with checkInDistanceFromOffice > 50
2. View in Attendance Records table

### Expected Result:
- Date cell shows warning: "Out of range" with map pin icon in orange/warning color
- Check In cell shows distance: "75m away" (highlighted)
- Status may show: INVALID_LOCATION (if that status is implemented)

---

## Debugging Tips

### Console Logs
Open DevTools → Console (F12) to see:
- `📍 Attempting check-in with geolocation...` - Check-in started
- `✅ Location captured: {lat, lng, accuracy}` - GPS acquired
- `✅ Check-in successful: {...}` - Backend accepted
- `❌ Check-in failed: ...` - Error message

### Network Monitoring
1. Open DevTools → Network tab
2. Filter: XHR
3. Check requests to:
   - `POST /attendance/checkin` - Check-in API
   - `POST /attendance/checkout` - Check-out API
4. View request payload to see if coordinates included:
   ```json
   {
     "checkIn": "09:32",
     "checkInLatitude": 23.1815,
     "checkInLongitude": 79.9864,
     "checkInAccuracy": 5.23
   }
   ```
5. View response to see stored distance

### Database Verification
```bash
# Connect to MongoDB
mongo

# Use the database
use erp_db

# Check latest attendance record
db.attendances.findOne({ userId: "<test_user_id>" }, { sort: { createdAt: -1 } })

# Verify checkout fields present:
{
  checkOutLatitude: 23.1820,
  checkOutLongitude: 79.9868,
  checkOutAccuracy: 4.51,
  checkOutDistanceFromOffice: 12,
  checkOutWithinGeofence: true
}
```

---

## Common Issues & Solutions

### Issue: "Location permission denied"
**Solution:** 
1. Grant permission in browser GPS settings
2. Or use GPS simulator (Chrome DevTools → Sensors)

### Issue: "Invalid coordinates" error
**Solution:**
1. Ensure GPS is enabled on device/browser
2. Wait for GPS to lock (may take 5-10 seconds)
3. Check if browser has GPS access permission

### Issue: Checkout distance shows 0m or unrealistic value
**Solution:**
1. Ensure client browser has accurate GPS
2. For testing, use GPS simulator in DevTools
3. Check if GPS accuracy is within 50m

### Issue: Time shows in wrong format (24-hour instead of 12-hour)
**Solution:**
1. Verify `convertTo12HourFormat()` is called in table
2. Check if attendance record uses correct time field (checkIn/checkOut)
3. Verify IST datetime utility is imported

### Issue: Date shows as YYYY-MM-DD instead of DD-MMM-YYYY
**Solution:**
1. Verify `formatDateForDisplay()` function is called
2. Check if date field is properly passed
3. Verify date utility import

---

## Success Criteria Checklist

After running all tests, verify:

- [ ] Test 1: Check-in inside office succeeds
- [ ] Test 2: Check-in outside office fails
- [ ] Test 3: Check-out inside office succeeds
- [ ] Test 4: Check-out outside office fails
- [ ] Test 5: Check-out without check-in fails
- [ ] Test 6: Duplicate check-out blocked
- [ ] Test 7: Permission denied handled gracefully
- [ ] Test 8: Invalid coordinates rejected
- [ ] Test 9: Admin exemption works
- [ ] Test 10: Table formatting correct (dates & times)
- [ ] Test 11: Midnight crossover handled correctly
- [ ] Test 12: Out-of-range warning displays

**Status:** ✅ PRODUCTION READY (when all tests pass)

---

## Rollback Plan (If Issues Found)

If serious issues discovered:

1. **Database:** Old `isWithinGeofence` and `distanceFromOffice` fields remain for backward compatibility
2. **Code:** New checkout validation can be disabled by:
   - Commenting out geofence check in `postCheckOut()`
   - Or setting admin geofence exemption globally
3. **Frontend:** Can revert to previous checkout function without GPS capture
4. **Version Control:** Use git to revert specific commits if needed

---

## Performance Notes

- Geolocation acquisition: 1-5 seconds (depends on device/weather)
- Distance calculation: <1ms (Haversine formula is fast)
- API response time: <100ms (typical)
- Database update: <50ms
- Total Check-in/Check-out time: ~2-6 seconds (acceptable)

---

## Future Test Cases (Optional)

1. Multiple employees checking in/out simultaneously
2. Rapid check-in/check-out (spam clicking)
3. Mobile app GPS accuracy vs web browser
4. Offline mode (pending implementation)
5. WiFi + Geofence dual validation
6. Fingerprint verification alongside geofence
7. Historical data geofence audit trail
