#!/bin/bash
# Production Diagnostics Script
# Run this on your production server to diagnose 502 errors
# Usage: bash diagnose-502.sh

echo "═══════════════════════════════════════════════════════"
echo "    HRMS 502 ERROR DIAGNOSTICS"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if Node process is running
echo "1️⃣ Checking if Backend Process is Running..."
if ps aux | grep -q "[n]ode"; then
    echo -e "${GREEN}✅ Node process found${NC}"
    ps aux | grep node | grep -v grep
else
    echo -e "${RED}❌ No Node process running${NC}"
    echo "   → Run: npm start"
fi
echo ""

# 2. Check if port 5000 is listening
echo "2️⃣ Checking if Port 5000 is Listening..."
if lsof -i :5000 &>/dev/null; then
    echo -e "${GREEN}✅ Port 5000 is listening${NC}"
    lsof -i :5000
else
    echo -e "${RED}❌ Port 5000 is not listening${NC}"
    echo "   → Run: npm start"
fi
echo ""

# 3. Check MongoDB
echo "3️⃣ Checking MongoDB Connection..."
if command -v mongo &> /dev/null; then
    MONGO_STATUS=$(mongo --eval "db.adminCommand('ping')" 2>/dev/null | grep -c "ok")
    if [ "$MONGO_STATUS" -gt 0 ]; then
        echo -e "${GREEN}✅ MongoDB is running and responding${NC}"
    else
        echo -e "${RED}❌ MongoDB connection failed${NC}"
        echo "   → Run: sudo systemctl start mongodb"
    fi
else
    echo -e "${YELLOW}⚠️  mongo CLI not found, checking service status${NC}"
    sudo systemctl status mongodb | grep -E "active|inactive"
fi
echo ""

# 4. Check Environment Variables
echo "4️⃣ Checking Environment Variables..."
if [ -f "server/.env" ]; then
    echo -e "${GREEN}✅ server/.env exists${NC}"
    echo "   Checking required variables:"
    for var in MONGO_URI ACCESS_TOKEN_SECRET CLIENT_ORIGIN; do
        if grep -q "^$var=" server/.env; then
            echo -e "   ${GREEN}✅ $var is set${NC}"
        else
            echo -e "   ${RED}❌ $var is missing${NC}"
        fi
    done
else
    echo -e "${RED}❌ server/.env not found${NC}"
fi
echo ""

# 5. Check Memory
echo "5️⃣ Checking System Memory..."
FREE_MEMORY=$(free | grep Mem | awk '{print int($7/$2 * 100)}')
if [ "$FREE_MEMORY" -gt 10 ]; then
    echo -e "${GREEN}✅ Sufficient memory available (${FREE_MEMORY}% free)${NC}"
else
    echo -e "${RED}❌ Low memory (${FREE_MEMORY}% free) - may cause 502${NC}"
fi
free -h | grep Mem
echo ""

# 6. Check Disk Space
echo "6️⃣ Checking Disk Space..."
DISK_USAGE=$(df / | awk 'NR==2 {print int($5)}')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${GREEN}✅ Disk space OK (${DISK_USAGE}% used)${NC}"
else
    echo -e "${RED}❌ Low disk space (${DISK_USAGE}% used)${NC}"
fi
df -h / | tail -1
echo ""

# 7. Test Health Endpoint
echo "7️⃣ Testing Health Endpoint..."
HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null | grep -c "OK")
if [ "$HEALTH" -gt 0 ]; then
    echo -e "${GREEN}✅ Health endpoint responds${NC}"
    curl -s http://localhost:5000/api/health | jq '.'
else
    echo -e "${RED}❌ Health endpoint not responding${NC}"
fi
echo ""

# 8. Check Recent Logs
echo "8️⃣ Recent Server Logs (Last 20 lines)..."
if [ -f "/var/log/hrms/server.log" ]; then
    echo "Last 20 lines:"
    tail -20 /var/log/hrms/server.log
elif [ -f "~/.pm2/logs/server-error.log" ]; then
    echo "PM2 error logs (last 20 lines):"
    tail -20 ~/.pm2/logs/server-error.log
else
    echo -e "${YELLOW}⚠️  No log file found${NC}"
fi
echo ""

# 9. Network Connections
echo "9️⃣ Network Connections on Port 5000..."
netstat -tlnp 2>/dev/null | grep 5000 || echo "No connections on port 5000"
echo ""

# 10. Summary
echo "═══════════════════════════════════════════════════════"
echo "    DIAGNOSTIC SUMMARY"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✅ Items to check:"
echo "  • Is Node process running? (check 1)"
echo "  • Is port 5000 listening? (check 2)"
echo "  • Can MongoDB connect? (check 3)"
echo "  • Are all env vars set? (check 4)"
echo "  • Is there enough memory? (check 5)"
echo "  • Is disk space available? (check 6)"
echo "  • Does /api/health respond? (check 7)"
echo ""
echo "🔧 Most Common Fixes:"
echo "  1. npm start                          # Start backend"
echo "  2. sudo systemctl restart mongodb     # Restart MongoDB"
echo "  3. nano server/.env                   # Check env variables"
echo "  4. tail -f /var/log/hrms/server.log   # Watch logs"
echo ""
echo "═══════════════════════════════════════════════════════"
