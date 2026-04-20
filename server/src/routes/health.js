import express from 'express';
import os from 'os';

const router = express.Router();

/**
 * Basic health check
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Comprehensive diagnostics endpoint
 */
router.get('/full', async (req, res) => {
  try {
    const mongooseModule = await import('mongoose');
    const db = mongooseModule.default.connection;
    
    const dbStatus = db.readyState === 1 ? 'connected' : 'disconnected';
    
    const health = {
      server: {
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        memory: {
          total: (os.totalmem() / 1024 / 1024).toFixed(2) + ' MB',
          free: (os.freemem() / 1024 / 1024).toFixed(2) + ' MB',
          usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2) + '%',
        },
      },
      database: {
        status: dbStatus,
        connected: dbStatus === 'connected',
        name: db.name || 'unknown',
      },
      environment: {
        MONGO_URI: process.env.MONGO_URI ? '✅ Set' : '❌ Missing',
        CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ? '✅ Set' : '❌ Missing',
        JWT_SECRET: process.env.ACCESS_TOKEN_SECRET ? '✅ Set' : '❌ Missing',
        PORT: process.env.PORT || 5000,
      },
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      error: 'Health check failed',
      message: error.message 
    });
  }
});

export default router;