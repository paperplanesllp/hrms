# 502 Bad Gateway - Login Endpoint Debugging Guide

## Error Location
```
POST https://thehrsaathi.com/api/auth/login
Response: 502 (Bad Gateway)
File: index-D4WY-yny.js:12
```

---

## **Immediate Fixes to Try**

### **1. Check Backend Server Status**
```bash
# SSH into production server
ssh your-server

# Check if Node process is running
ps aux | grep node

# Check if port 5000 is listening
netstat -tlnp | grep 5000
# or
lsof -i :5000

# If not running, restart:
npm start
# or
pm2 start server.js
# or
systemctl restart hrms-backend
```

### **2. Check MongoDB Connection in Production**
```bash
# On your production server, verify MongoDB is running
sudo systemctl status mongodb
# or
sudo service mongod status

# Test connection with mongo client
mongo mongodb://187.127.141.75:27017/hrms

# If connection fails, the IP might not be accessible from production server
# MongoDB might only be listening on localhost (127.0.0.1)
```

### **3. Verify Production .env Configuration**
```bash
# Production server .env should have:
MONGO_URI=mongodb://187.127.141.75:27017/hrms
# ⚠️ CRITICAL: If MongoDB is on the same server, this should be:
# MONGO_URI=mongodb://localhost:27017/hrms
# OR
# MONGO_URI=mongodb://127.0.0.1:27017/hrms

CLIENT_URL=https://thehrsaathi.com
CLIENT_ORIGIN=https://thehrsaathi.com

# Check current env
cat server/.env
```

### **4. Check Server Logs**
```bash
# View Node server logs (tail last 50 lines)
tail -50 /var/log/hrms/server.log
# or check PM2 logs
pm2 logs

# Look for:
# ❌ "MongoDB connection failed"
# ❌ "ECONNREFUSED"
# ❌ "ENOTFOUND"
# ❌ Stack traces
```

---

## **ROOT CAUSE ANALYSIS**

### **Scenario 1: MongoDB Connection Failed**
```
Error: ECONNREFUSED 187.127.141.75:27017
Reason: MongoDB server not running OR firewall blocking access
```

**Solution:**
- Start MongoDB: `sudo systemctl start mongodb`
- Check firewall rules: `sudo ufw allow 27017`
- Verify IP: MongoDB might only listen on localhost, not the public IP

### **Scenario 2: Missing Environment Variables**
```
MONGO_URI is undefined
→ Cannot connect to database
→ Query hangs or fails
→ Response timeout = 502
```

**Solution:**
```bash
# Ensure .env exists in production
ls -la server/.env

# Has required values
grep MONGO_URI server/.env
grep CLIENT_ORIGIN server/.env
```

### **Scenario 3: Unhandled Error in Login Function**
Check if any middleware or the login service is crashing:

**Common culprits in auth.service.js:**
- Line 117-124: `user.comparePassword()` - could fail if User model not loaded
- Line 135-142: `createActivityLog()` - designed not to throw, but double-check
- Line 143-145: Token generation - ensure JWT secrets are set

---

## **Quick Diagnostic Commands**

```bash
# 1. Test health endpoint (should return { "ok": true })
curl https://thehrsaathi.com/api/health

# 2. Check MongoDB connection
mongo --host 187.127.141.75:27017 --eval "db.adminCommand('ping')"

# 3. Check if Node server is running
ps aux | grep "node\|npm"

# 4. Check server port
netstat -tlnp | grep 5000

# 5. View real-time logs
tail -f /var/log/hrms/server.log

# 6. Check free memory (502 can also mean out of memory)
free -h

# 7. Check disk space
df -h
```

---

## **Environment Configuration Checklist**

- [ ] `.env` file exists in `server/` directory
- [ ] `MONGO_URI` is set and correct
  - [ ] If MongoDB is on same server: `mongodb://localhost:27017/hrms`
  - [ ] If MongoDB is on different server: `mongodb://[ip]:27017/hrms`
- [ ] `CLIENT_ORIGIN` is set to production domain: `https://thehrsaathi.com`
- [ ] `JWT_SECRET` / `ACCESS_TOKEN_SECRET` are set
- [ ] `REFRESH_TOKEN_SECRET` is set
- [ ] All required env vars are defined (check [config/env.js](../config/env.js#L1-L30))

---

## **Proposed Fix for Production Deployment**

### **Step 1: SSH into Production Server**
```bash
ssh your-production-server
cd /path/to/hrms/server
```

### **Step 2: Update .env**
```bash
nano server/.env
# Or use your editor
```

**Recommended Production .env:**
```dotenv
MONGO_URI=mongodb://localhost:27017/hrms
# If MongoDB is remote: mongodb://mongodb-server.com:27017/hrms

CLIENT_URL=https://thehrsaathi.com
CLIENT_ORIGIN=https://thehrsaathi.com

JWT_SECRET=your-secret-here
ACCESS_TOKEN_SECRET=your-secret-here
REFRESH_TOKEN_SECRET=your-secret-here

NODE_ENV=production
COOKIE_SECURE=true

PORT=5000
```

### **Step 3: Restart Backend**
```bash
# If using PM2
pm2 restart all

# If using systemctl
sudo systemctl restart hrms-backend

# If running manually
npm start
```

### **Step 4: Verify**
```bash
# Test health endpoint
curl https://thehrsaathi.com/api/health
# Should return: { "ok": true }

# Try login (use valid credentials)
curl -X POST https://thehrsaathi.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"your-password"}'
```

---

## **If Still Getting 502 After These Steps**

### Check for Common Issues:

1. **Node Version Mismatch**
   ```bash
   node --version
   # Expected: v18+ (check package.json)
   ```

2. **Missing Dependencies**
   ```bash
   npm list
   # Should show no errors
   ```

3. **Port Already in Use**
   ```bash
   lsof -i :5000
   # Kill if needed: kill -9 <PID>
   ```

4. **Out of Memory**
   ```bash
   free -h
   # If < 100MB available, you may have issues
   ```

5. **Slow MongoDB Response**
   - Check MongoDB indexes
   - Run: `db.users.getIndexes()` to verify

---

## **Next Steps**

1. Check server logs for actual error
2. Verify MongoDB connectivity
3. Test health endpoint
4. Restart backend service
5. Try login again

**Expected Result After Fix:**
```json
POST /api/auth/login → 200 OK
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "name": "...", "role": "..." },
  "rememberMe": false
}
```

---

## **Contact Production Support If:**
- MongoDB is down/unreachable
- Server has no disk space
- Server has no memory
- Port 5000 is blocked by firewall
- Different hosting environment (Vercel/Heroku/etc)
