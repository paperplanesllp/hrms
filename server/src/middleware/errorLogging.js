/**
 * Enhanced Error Logging Middleware
 * Captures detailed error information for 502 debugging
 * Add to server/src/middleware/errorLogging.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'errors.log');

/**
 * Log detailed error information
 */
function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    message: error.message,
    stack: error.stack,
    type: error.constructor.name,
    statusCode: error.statusCode || 500,
    context,
  };

  // Console output
  console.error('\n🔴 ERROR CAPTURED:', errorLog);

  // File logging
  try {
    fs.appendFileSync(
      logFile,
      JSON.stringify(errorLog, null, 2) + '\n' + '---\n',
      { encoding: 'utf8' }
    );
  } catch (writeError) {
    console.error('Failed to write error log:', writeError.message);
  }
}

/**
 * Middleware to log auth-related errors
 */
export function authErrorLogger(err, req, res, next) {
  if (req.path.includes('/api/auth')) {
    logError(err, {
      route: req.path,
      method: req.method,
      body: { email: req.body?.email, password: '***' },
      timestamp: new Date().toISOString(),
    });
  }
  next(err);
}

/**
 * Database connection status check
 */
export async function checkDatabaseHealth() {
  try {
    const mongoose = await import('mongoose');
    const db = mongoose.connection;
    
    if (db.readyState === 1) {
      return { ok: true, status: 'connected', db: db.name };
    } else {
      return { ok: false, status: 'disconnected', code: db.readyState };
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export { logError, logFile, logsDir };
