# 502 Bad Gateway - Login Endpoint - Production Troubleshooting

## 📍 Error Details
- **Endpoint**: `POST https://thehrsaathi.com/api/auth/login`
- **Status Code**: 502 (Bad Gateway)
- **Error File**: `index-D4WY-yny.js:12`
- **Date**: Error is currently happening in production

---

## 🚨 What a 502 Error Means

A 502 Bad Gateway indicates that the upstream server (your Node.js backend) either:
1. Crashed unexpectedly
2. Is not responding within the timeout
3. Is unreachable/offline
4. Returned an invalid response

**It's NOT a network issue - it's a backend server problem.**

---

## ✅ Immediate Action Plan

### **Step 1: Verify Backend is Running** (5 minutes)
```bash
# SSH into your production server
ssh your-server-ip

# Check if Node process exists
ps aux | grep node

# Check if port 5000 is listening
lsof -i :5000
# or
netstat -tlnp | grep 5000
```

**Expected output:**
```
node     1234  1.5  2.3 512000 45000  ?  Sl  10:30  0:45 /usr/bin/node /app/server.js
```

**If no process:**
```bash
# Restart backend
pm2 restart all
# OR
npm start
# OR
systemctl restart hrms-backend
```

---

### **Step 2: Test Health Endpoint** (1 minute)
```bash
# This should work even if login fails
curl https://thehrsaathi.com/api/health

# Expected response:
{ "status": "OK", "timestamp": "...", "uptime": 1234 }
```

**If this fails:**
→ Backend is not responding at all
→ Check server logs: `tail -100 /var/log/hrms/server.log`

---

### **Step 3: Test Full Diagnostics** (1 minute)
```bash
curl https://thehrsaathi.com/api/health/full
```

**Response will show:**
```json
{
  "server": { "status": "running", "environment": "production" },
  "database": { "status": "connected|disconnected" },
  "environment": {
    "MONGO_URI": "✅ Set | ❌ Missing",
    "CLIENT_ORIGIN": "✅ Set | ❌ Missing"
  }
}
```

---

## 🔍 Common Root Causes

### **Cause #1: MongoDB Connection Failed** ⚠️ MOST COMMON
```
Symptoms:
- Health endpoint works
- Login returns 502
- Server logs show "ECONNREFUSED" or "connection timeout"
```

**Fix:**
```bash
# Check MongoDB is running
sudo systemctl status mongodb

# Start if stopped
sudo systemctl start mongodb

# Verify .env has correct MONGO_URI
cat server/.env | grep MONGO_URI

# For production, it should be:
# - If same server: mongodb://localhost:27017/hrms
# - If different server: mongodb://mongodb-server-ip:27017/hrms
```

---

### **Cause #2: Environment Variables Missing** ⚠️ COMMON
```
Symptoms:
- Auth endpoint returns 502 immediately
- No timeout delay
- Server logs show "undefined" errors
```

**Fix:**
```bash
# Verify all required env vars are set
grep -E "MONGO_URI|JWT_SECRET|CLIENT_ORIGIN" server/.env

# Should see all three set
# If any are missing, add them to server/.env
```

**Required .env for Production:**
```dotenv
# Database
MONGO_URI=mongodb://localhost:27017/hrms

# Frontend
CLIENT_URL=https://thehrsaathi.com
CLIENT_ORIGIN=https://thehrsaathi.com

# Security
JWT_SECRET=your-secret-key-minimum-32-chars
ACCESS_TOKEN_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-secret-key

# Server
NODE_ENV=production
PORT=5000
COOKIE_SECURE=true

# Email (optional but recommended)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
COMPANY_EMAIL=hello@paperplanesco.com
```

---

### **Cause #3: Memory or CPU Exhaustion**
```
Symptoms:
- Intermittent 502 errors
- Errors get more frequent over time
- Server stops responding
```

**Fix:**
```bash
# Check available memory
free -h
# If < 100MB free, you need to:
# 1. Increase server RAM
# 2. Kill unnecessary processes
# 3. Clear logs: rm -rf /var/log/hrms/*

# Check CPU usage
top -b -n 1 | head -20

# Check disk space
df -h
# If any partition > 95% full, clean up:
# rm -rf /tmp/*  # Or delete old logs
```

---

### **Cause #4: MongoDB Query Timeout**
```
Symptoms:
- Login works sometimes, 502 other times
- Happens after server runs for a while
- Server logs show long query times
```

**Fix:**
```javascript
// In auth.service.js, the login function does:
1. Find user by email: await User.findOne({ email })
2. Compare password: await user.comparePassword(password)
3. Create tokens
4. Log activity: await createActivityLog(...)

// If any query takes > 30 seconds, nginx returns 502

// Solutions:
// 1. Add indexes to User collection
// 2. Optimize activity logging (already non-blocking)
// 3. Increase database query timeout
```

---

## 🛠️ Detailed Troubleshooting

### **Check Server Logs**
```bash
# Real-time logs
tail -f /var/log/hrms/server.log

# Last 100 lines
tail -100 /var/log/hrms/server.log

# Search for errors
grep -i "error\|failed\|connection" /var/log/hrms/server.log

# With timestamps (last 50 lines)
tail -50 /var/log/hrms/server.log | grep -E "ERROR|502|Connection"

# If using PM2
pm2 logs
```

**Look for patterns like:**
```
❌ MongoDB connection failed
❌ ECONNREFUSED
❌ Cannot GET /api/auth/login
❌ Gateway timeout
❌ Process crashed
```

---

### **Test Login Directly on Server**
```bash
# SSH into server
ssh your-server-ip

# Test backend locally
curl http://localhost:5000/api/health

# Try login locally
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "your-password"
  }'

# Expected: 200 OK with accessToken
# Actual: Should reveal the actual error
```

---

### **Verify MongoDB Connection**
```bash
# SSH into MongoDB server
ssh mongo-server-ip

# Connect to MongoDB
mongo mongodb://localhost:27017

# Once connected, run:
> db.adminCommand('ping')
# Should return: { ok: 1 }

> show databases
# Should list databases including "hrms"

> use hrms
> db.users.findOne()
# Should return a user or empty if no users
```

**If connection fails:**
```bash
# MongoDB service status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check if listening on port
sudo lsof -i :27017
# Should show: mongod ... LISTEN
```

---

### **Check Firewall Rules**
```bash
# If MongoDB is on different server
# Verify port 27017 is open FROM backend server

# On MongoDB server:
sudo ufw allow 27017

# On backend server, test connection:
nc -zv mongodb-server-ip 27017
# Should show: Connection to mongodb-server-ip 27017 port [tcp/*] succeeded
```

---

## 📋 Production Deployment Checklist

- [ ] **Backend Server**
  - [ ] Node.js v18+ installed
  - [ ] npm dependencies installed: `npm install`
  - [ ] Backend process is running
  - [ ] Port 5000 is listening

- [ ] **Environment Variables** (.env in server/)
  - [ ] `MONGO_URI` set and correct
  - [ ] `CLIENT_ORIGIN` set to `https://thehrsaathi.com`
  - [ ] `JWT_SECRET` / `ACCESS_TOKEN_SECRET` defined
  - [ ] `NODE_ENV=production`
  - [ ] `COOKIE_SECURE=true`

- [ ] **MongoDB**
  - [ ] Service is running
  - [ ] Database `hrms` exists
  - [ ] Connection string in .env matches actual MongoDB setup
  - [ ] Firewall allows connections (if on different server)

- [ ] **Reverse Proxy (Nginx/Apache)**
  - [ ] Configured to forward `/api/*` to `http://localhost:5000`
  - [ ] Timeout settings are adequate (min 30s for slow queries)
  - [ ] CORS headers properly configured

- [ ] **SSL/HTTPS**
  - [ ] Certificate valid for `thehrsaathi.com`
  - [ ] `COOKIE_SECURE=true` is set

---

## 🔧 Recovery Steps

### **If Login Still Returns 502 After All Checks:**

**Step 1: Restart Services in Order**
```bash
# 1. Stop backend
pm2 stop all
# or
sudo systemctl stop hrms-backend

# 2. Restart MongoDB
sudo systemctl restart mongodb

# Wait 10 seconds

# 3. Start backend
pm2 start ecosystem.config.js
# or
npm start

# Wait for "Server running on port 5000"
```

**Step 2: Clear Cache & Session**
```bash
# Restart nginx if used
sudo systemctl restart nginx

# Clear any cache
sudo systemctl restart redis  # if using Redis

# Clear logs
rm -rf /var/log/hrms/*.log
```

**Step 3: Verify**
```bash
# Health check
curl https://thehrsaathi.com/api/health/full

# Try login
curl -X POST https://thehrsaathi.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"your-password"}'

# Should get 200 OK with accessToken
```

---

## 📞 If Still Stuck

### **Collect Diagnostic Information:**
```bash
# 1. Backend version
npm list | head -20

# 2. Server info
uname -a

# 3. MongoDB version
mongo --version

# 4. Node process info
ps aux | grep node

# 5. Memory/disk status
free -h && df -h

# 6. Recent errors
tail -50 /var/log/hrms/server.log
tail -50 /var/log/nginx/error.log  # if using nginx

# 7. Network connections
netstat -tlnp | grep -E "5000|27017|80|443"
```

**Send these outputs to your DevOps/hosting team:**
- Backend logs
- MongoDB connection status
- Environment variables (mask secrets)
- Network connectivity results

---

## ✨ Prevention Tips

1. **Monitor Backend Health**
   - Set up monitoring to check `/api/health` every 5 minutes
   - Alert if response is not 200 OK

2. **Set Up Process Manager**
   ```bash
   # Use PM2 to auto-restart on crash
   pm2 start server.js
   pm2 startup
   pm2 save
   ```

3. **Enable Logging**
   - Check logs weekly: `tail -100 /var/log/hrms/server.log`
   - Archive old logs to save disk space

4. **Database Backups**
   - Backup MongoDB daily
   - Test restore procedures

5. **Load Testing**
   - Test with multiple concurrent logins
   - Identify bottlenecks before production

---

## 📚 Related Documentation
- [Debug Script Location](./DEBUG_502_LOGIN.md)
- [Error Logging Setup](./server/src/middleware/errorLogging.js)
- [Health Check Endpoint](./server/src/routes/health.js)
- [Environment Configuration](./server/src/config/env.js)

---

**Last Updated**: 2026-04-20
**Created For**: HRMS Production Support
