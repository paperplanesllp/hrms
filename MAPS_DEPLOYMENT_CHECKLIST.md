# ✅ Google Maps Deployment Checklist

## 🚀 Pre-Deployment (Local Testing)

### Step 1: Get Google Maps API Key
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project (name it "ERP" or similar)
- [ ] Search and enable "Maps JavaScript API"
- [ ] Search and enable "Geocoding API"
- [ ] Go to Credentials → Create API Key
- [ ] Copy the generated API key

### Step 2: Configure Local Environment
- [ ] Navigate to `erp-dashboard` directory
- [ ] Create `.env.local` file (NOT `.env`)
- [ ] Add: `VITE_GOOGLE_MAPS_API_KEY=your_api_key_here`
- [ ] **DO NOT** commit `.env.local` to git
- [ ] Verify `.gitignore` includes `*.local`

### Step 3: Restart Development Server
- [ ] Stop current dev server (Ctrl+C)
- [ ] Run `npm run dev` in `erp-dashboard` folder
- [ ] Verify no console errors
- [ ] Wait for "http://localhost:5173" message

### Step 4: Test Map Component
- [ ] Navigate to Admin Settings → Company Settings
- [ ] Verify map loads with interactive controls
- [ ] Test clicking on map
- [ ] Test dragging red marker
- [ ] Check coordinates update in input fields

### Step 5: Test Address Search
- [ ] Type address in search bar (e.g., "Times Square, NYC")
- [ ] Click Search button
- [ ] Verify map zooms to location
- [ ] Verify marker appears at address
- [ ] Test multiple addresses

### Step 6: Test GPS Button
- [ ] Click "Use Current Location" button
- [ ] Allow browser location permission
- [ ] Verify coordinates populate from GPS
- [ ] Verify marker moves to GPS location
- [ ] Verify map zooms to your location

### Step 7: Test Save Functionality
- [ ] Set location (any method: click, search, or GPS)
- [ ] Click "Save Location" button
- [ ] Verify success notification appears
- [ ] Verify "✓ Set" badge appears
- [ ] Refresh page
- [ ] Verify location persists (marker still there)

---

## 🔧 Troubleshooting Local Issues

### Map Not Loading?
- [ ] Check `.env.local` exists with correct API key
- [ ] Restart dev server: `npm run dev`
- [ ] Open browser Console (F12 → Console tab)
- [ ] Look for red errors about Google Maps
- [ ] Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- [ ] Clear browser cache
- [ ] Try incognito/private mode

### Address Search Not Working?
- [ ] Verify "Geocoding API" is enabled in Google Cloud Console
- [ ] Wait 5-10 minutes for changes to propagate
- [ ] Test with simple address like "New York"
- [ ] Check browser console for errors
- [ ] Verify API key has no restrictions

### GPS Button Not Working?
- [ ] Check browser allows location access
- [ ] Grant location permission when prompted
- [ ] Ensure HTTPS or localhost (dev)
- [ ] Verify location services enabled on device
- [ ] Check browser location permissions in settings

### Invalid API Key Error?
- [ ] Verify API key in `.env.local` is correct
- [ ] Check no extra spaces or quotes
- [ ] Regenerate new key in Google Cloud
- [ ] Verify key is not rotated/deleted
- [ ] Try demo key temporarily for testing

---

## 📊 Pre-Production Testing

### Functionality Testing
- [ ] All map controls work (zoom, pan, type)
- [ ] Marker placement accurate
- [ ] Address search returns correct address
- [ ] GPS accuracy within 5 meters
- [ ] Save functionality stores data correctly
- [ ] Load functionality retrieves saved data

### Error Handling
- [ ] Invalid coordinates show error message
- [ ] Missing coordinates prevent save
- [ ] Network errors handled gracefully
- [ ] Invalid addresses show error
- [ ] GPS permission denial handled

### Performance Testing
- [ ] Map loads in < 2 seconds
- [ ] Address search completes in < 1 second
- [ ] No console warnings or errors
- [ ] Memory usage stable (no leaks)
- [ ] Multiple interactions don't crash page

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Responsive design works on small screens

### Data Validation
- [ ] Latitude range: -90 to 90 ✓
- [ ] Longitude range: -180 to 180 ✓
- [ ] Coordinates save with correct precision
- [ ] Geofence radius calculations correct
- [ ] Historical data not lost during update

---

## 🌐 Production Deployment

### Google Cloud Configuration
- [ ] Create separate "Production" project
- [ ] Enable same APIs (Maps, Geocoding)
- [ ] Create production API key
- [ ] Add API key restrictions:
  - [ ] "HTTP referrers (web sites)"
  - [ ] Add your production domain
  - [ ] Example: `https://erp-system.com/*`
- [ ] Enable billing alerts
- [ ] Set up budget limit ($50/month recommended)

### Environment Setup
- [ ] Add `VITE_GOOGLE_MAPS_API_KEY` to production secrets
- [ ] GitHub Secrets (if using GitHub Actions)
- [ ] Vercel/Netlify environment variables
- [ ] Docker `.env` file (if containerized)
- [ ] CI/CD pipeline configured

### Build & Deployment
- [ ] Test build locally: `npm run build`
- [ ] Verify `.env.local` NOT included in build
- [ ] Verify API key injected correctly at runtime
- [ ] Deploy to staging environment first
- [ ] Test all features on staging
- [ ] Deploy to production

### Post-Deployment Verification
- [ ] Map loads in production
- [ ] Address search works
- [ ] GPS functionality works
- [ ] Data saves correctly
- [ ] No console errors in production
- [ ] API quota usage monitoring active

---

## 📈 Monitoring & Maintenance

### Daily Tasks
- [ ] Check Google Cloud Console for quota usage
- [ ] Verify no API errors in logs
- [ ] Monitor billing charges
- [ ] Test map functionality periodically

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check for any error patterns
- [ ] Verify geofencing calculations accuracy
- [ ] Test with real employee data

### Monthly Tasks
- [ ] Review API usage trends
- [ ] Optimize if quota approaching limit
- [ ] Update documentation if needed
- [ ] Review security settings
- [ ] Backup configuration

### Quarterly Tasks
- [ ] Audit API key access logs
- [ ] Rotate API key (optional but recommended)
- [ ] Review and optimize costs
- [ ] Plan for growth (more employees = more API calls)
- [ ] Test disaster recovery

---

## 💰 Cost Management

### Monitor Spending
- [ ] Set up billing alerts in Google Cloud
- [ ] Review charges daily for first month
- [ ] Track API call volumes
- [ ] Estimate annual costs

### Optimize Costs
- [ ] Remove unused APIs
- [ ] Reduce tracking frequency if possible (currently 10 sec)
- [ ] Use caching where applicable
- [ ] Set quotas to prevent runaway costs

### Example Monthly Costs
```
Small company (50 employees):
- Maps JS API: Free (within quota)
- Geocoding API: Free (within quota)
- Monthly cost: $0-5

Medium company (500 employees):
- Maps JS API: Free (within quota)
- Geocoding API: Free (within quota)
- Monthly cost: $5-15

Large company (5000 employees):
- Maps JS API: $0.50-2 per 1000 requests
- Geocoding API: $0.50 per 100 requests
- Monthly cost: $50-150
- (With $300 Google credit = often free)
```

---

## 🔒 Security Checklist

### API Key Security
- [ ] API key stored in environment variables
- [ ] API key NOT hardcoded anywhere
- [ ] API key NOT committed to git
- [ ] API key restricted to domain
- [ ] API key monitored for unauthorized use
- [ ] Separate keys for dev/test/production

### Data Security
- [ ] Coordinates stored securely in DB
- [ ] HTTPS used for all requests
- [ ] User permissions validated
- [ ] Geolocation data not shared externally
- [ ] Audit logs maintained

### Access Control
- [ ] Only admin can view all locations
- [ ] Only HR can manage company location
- [ ] Employees can only see own location
- [ ] Proper role-based access implemented
- [ ] API endpoints secured with auth

---

## 📞 Rollback Procedure

If issues occur in production:

1. **Disable Map Feature** (Quick Fix)
   - [ ] Comment out GoogleMapSelector import
   - [ ] Fall back to manual coordinate input
   - [ ] Deploy hotfix
   - [ ] Users can still set location manually

2. **Revert to Previous Version**
   - [ ] Checkout previous git commit
   - [ ] Remove API key from build
   - [ ] Roll back to version without maps
   - [ ] Verify rollback successful

3. **Restore from Backup**
   - [ ] If database corrupted, restore backup
   - [ ] Verify data integrity
   - [ ] Test all operations
   - [ ] Post-incident review

---

## ✅ Final Verification

- [ ] Map component displays correctly
- [ ] Address search functional
- [ ] GPS tracking working
- [ ] Data saves to database
- [ ] Geofencing calculations correct
- [ ] No console errors
- [ ] Performance acceptable
- [ ] All documentation reviewed
- [ ] Team trained on new feature
- [ ] Monitoring dashboards active

---

## 🎉 Deployment Complete!

Once all items checked:
- ✅ Feature is production-ready
- ✅ Monitor for first 48 hours
- ✅ Collect user feedback
- ✅ Make improvements as needed
- ✅ Update documentation if needed

**Success! Your Google Maps integration is live! 🗺️**
