# 502 Error - Quick Reference Card

## 🚨 Error: `POST https://thehrsaathi.com/api/auth/login → 502 (Bad Gateway)`

---

## ⚡ Quick Fix (30 seconds)

```bash
# SSH to production server
ssh your-server

# 1. Check if backend is running
ps aux | grep node

# 2. If not running, start it
npm start

# 3. Test
curl https://thehrsaathi.com/api/health
# Should return: { "status": "OK", ... }
```

If still returning 502 after this, continue below.

---

## 🔍 What's Causing It?

| Issue | Check | Fix |
|-------|-------|-----|
| **Backend not running** | `ps aux \| grep node` | `npm start` |
| **Port 5000 in use** | `lsof -i :5000` | `kill -9 <PID>` then `npm start` |
| **MongoDB offline** | `sudo systemctl status mongodb` | `sudo systemctl start mongodb` |
| **Missing .env vars** | `cat server/.env` | Add missing: `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` |
| **Low disk space** | `df -h` | Delete old logs: `rm -rf /var/log/hrms/*` |
| **Low memory** | `free -h` | Restart server or increase RAM |

---

## 📋 Diagnostic Commands

```bash
# Test health
curl https://thehrsaathi.com/api/health

# Test full diagnostics
curl https://thehrsaathi.com/api/health/full

# Watch logs in real-time
tail -f /var/log/hrms/server.log

# Check Node process
ps aux | grep node

# Check database
sudo systemctl status mongodb

# Check listening ports
netstat -tlnp | grep -E "5000|27017"
```

---

## 🛠️ Most Common Fixes (In Order)

### **Fix #1: Restart Backend** (90% of the time)
```bash
pm2 restart all
# OR
npm start
```

### **Fix #2: Restart MongoDB**
```bash
sudo systemctl restart mongodb

# Verify
sudo systemctl status mongodb
```

### **Fix #3: Check/Update .env**
```bash
cat server/.env

# Should have:
MONGO_URI=mongodb://localhost:27017/hrms
CLIENT_ORIGIN=https://thehrsaathi.com
ACCESS_TOKEN_SECRET=your-secret
NODE_ENV=production
```

### **Fix #4: Run Diagnostics Script**
```bash
bash diagnose-502.sh
```

---

## 📞 Escalation Checklist

If none of the above work, collect this info:

```bash
# 1. Server info
uname -a

# 2. Node and npm versions
node --version
npm --version

# 3. Backend logs (last 100 lines)
tail -100 /var/log/hrms/server.log

# 4. MongoDB logs
tail -100 /var/log/mongodb/mongodb.log

# 5. Network info
netstat -tlnp | head -20

# 6. Memory and disk
free -h && df -h

# 7. Environment check
cat server/.env | head -10
```

Share this info with your DevOps team.

---

## 🚀 Prevention

1. **Monitor backend health every 5 minutes**
   ```bash
   # Add to cron
   */5 * * * * curl https://thehrsaathi.com/api/health || alert
   ```

2. **Use PM2 for auto-restart**
   ```bash
   pm2 start server.js
   pm2 startup
   pm2 save
   ```

3. **Check logs weekly**
   ```bash
   tail -100 /var/log/hrms/server.log
   ```

4. **Monitor disk space**
   ```bash
   df -h
   # Clean old logs if > 90% full
   ```

---

## 📚 Documentation

- **Full Guide**: [PRODUCTION_502_TROUBLESHOOTING.md](./PRODUCTION_502_TROUBLESHOOTING.md)
- **Diagnostics Script**: [diagnose-502.sh](./diagnose-502.sh)
- **Error Logging**: [server/src/middleware/errorLogging.js](./server/src/middleware/errorLogging.js)
- **Health Endpoints**: [server/src/routes/health.js](./server/src/routes/health.js)

---

## ⏱️ Response Time

- **Restart backend**: 2-3 seconds
- **Restart MongoDB**: 5-10 seconds
- **Full diagnostics**: < 1 minute
- **Identify root cause**: 5-15 minutes

---

**Generated**: 2026-04-20  
**For**: HRMS Production Support Team
