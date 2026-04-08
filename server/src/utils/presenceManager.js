import { User } from "../modules/users/User.model.js";

/**
 * Presence Manager - Tracks online status with multi-device support
 * Uses Map<userId, Set<socketId>> to support multiple tabs/devices
 */

class PresenceManager {
  constructor() {
    // Map<userId, Set<socketId>>
    this.userConnections = new Map();
    
    // Track user metadata: userId -> { name, email, image, lastActivityAt }
    this.userMetadata = new Map();
    
    // Socket.IO server reference (set via setIO after initialization)
    this._io = null;
    
    // Stale session timeout (15 minutes of inactivity)
    this.STALE_SESSION_TIMEOUT = 15 * 60 * 1000;
    
    // Activity timeout for "Away" status (5 minutes)
    this.AWAY_TIMEOUT = 5 * 60 * 1000;
    
    // Cleanup interval (every 2 minutes)
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 2 * 60 * 1000);
  }

  /**
   * Set the Socket.IO server reference so cleanup can broadcast
   */
  setIO(io) {
    this._io = io;
  }

  /**
   * Add a socket connection for a user
   */
  addConnection(userId, socketId, userData) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    
    this.userConnections.get(userId).add(socketId);
    
    // Store/update user metadata
    this.userMetadata.set(userId, {
      name: userData.name,
      email: userData.email,
      image: userData.image,
      role: userData.role,
      lastActivityAt: new Date(),
      // Map<socketId, lastActivityAt>
      socketActivity: this.userMetadata.get(userId)?.socketActivity || new Map()
    });
    
    // Track activity for this specific socket
    this.userMetadata.get(userId).socketActivity.set(socketId, new Date());
    
    console.log(`✅ Socket added for user ${userId}: ${socketId} (total: ${this.userConnections.get(userId).size})`);
    
    return this.isUserOnline(userId);
  }

  /**
   * Remove a socket connection for a user
   * Returns true if user still has active connections, false if completely offline
   */
  removeConnection(userId, socketId) {
    const sockets = this.userConnections.get(userId);
    if (!sockets) {
      console.warn(`⚠️ Attempting to remove socket from non-existent user: ${userId}`);
      return false;
    }
    
    sockets.delete(socketId);

    // Remove per-socket activity entry
    const metadata = this.userMetadata.get(userId);
    if (metadata?.socketActivity) {
      metadata.socketActivity.delete(socketId);
    }

    console.log(`❌ Socket removed for user ${userId}: ${socketId} (remaining: ${sockets.size})`);
    
    // If user has no more sockets, cleanup everything
    if (sockets.size === 0) {
      this.userConnections.delete(userId);
      this.userMetadata.delete(userId);
      console.log(`🚪 User ${userId} completely offline (no active sockets)`);
      return false;
    }
    
    return true;
  }

  /**
   * Update last activity for a user
   */
  updateActivity(userId, socketId) {
    const metadata = this.userMetadata.get(userId);
    if (metadata) {
      metadata.lastActivityAt = new Date();
      metadata.socketActivity.set(socketId, new Date());
    }
  }

  /**
   * Check if user is online (has at least one active socket)
   */
  isUserOnline(userId) {
    const sockets = this.userConnections.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  /**
   * Get all active socket IDs for a user
   */
  getUserSockets(userId) {
    const sockets = this.userConnections.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Get user metadata
   */
  getUserMetadata(userId) {
    return this.userMetadata.get(userId) || null;
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    const onlineUsers = [];
    for (const [userId, sockets] of this.userConnections.entries()) {
      if (sockets.size > 0) {
        const metadata = this.userMetadata.get(userId);
        onlineUsers.push({
          userId,
          name: metadata?.name || 'Unknown',
          email: metadata?.email || '',
          image: metadata?.image || '',
          isOnline: true,
          lastActivityAt: metadata?.lastActivityAt || new Date(),
          socketCount: sockets.size
        });
      }
    }
    return onlineUsers;
  }

  /**
   * Get connection count for a user (number of active tabs/devices)
   */
  getConnectionCount(userId) {
    const sockets = this.userConnections.get(userId);
    return sockets ? sockets.size : 0;
  }

  /**
   * Cleanup stale sessions.
   * Removes sockets for users who haven't had activity for STALE_SESSION_TIMEOUT.
   * Returns list of users who went fully offline so the caller can broadcast + update DB.
   */
  cleanupStaleSessions() {
    const now = new Date();
    const staleUsers = [];

    for (const [userId, metadata] of this.userMetadata.entries()) {
      const timeSinceLastActivity = now - metadata.lastActivityAt;
      
      if (timeSinceLastActivity > this.STALE_SESSION_TIMEOUT) {
        const sockets = this.userConnections.get(userId);
        if (sockets && sockets.size > 0) {
          console.warn(`⚠️ Evicting stale user ${metadata.name || userId} (inactive ${Math.round(timeSinceLastActivity / 1000)}s)`);
          staleUsers.push({
            userId,
            name: metadata.name,
            lastActivityAt: metadata.lastActivityAt
          });
          // Disconnect all sockets for this stale user
          if (this._io) {
            for (const sid of sockets) {
              const s = this._io.sockets.sockets.get(sid);
              if (s) s.disconnect(true);
            }
          }
          // Remove all sockets and metadata for this user
          this.userConnections.delete(userId);
          this.userMetadata.delete(userId);
        } else {
          // No sockets but stale metadata leftover — clean it up
          this.userMetadata.delete(userId);
        }
      }
    }

    // Broadcast offline + persist to DB for each evicted user
    for (const stale of staleUsers) {
      if (this._io) {
        this._io.emit("presence:update", {
          userId: stale.userId,
          isOnline: false,
          lastSeen: stale.lastActivityAt,
          lastActivityAt: stale.lastActivityAt,
        });
      }
      User.findByIdAndUpdate(stale.userId, {
        isOnline: false,
        lastSeen: stale.lastActivityAt,
        lastActivityAt: stale.lastActivityAt,
      }).catch((err) => console.error(`Failed to update stale user ${stale.userId}:`, err.message));
    }

    if (staleUsers.length > 0) {
      console.log(`🧹 Cleaned up ${staleUsers.length} stale session(s)`);
    }

    return staleUsers;
  }

  // ========== ALIASES (clean API) ==========

  /** Alias for addConnection */
  addUserSocket(userId, socketId, userData = {}) {
    return this.addConnection(userId, socketId, userData);
  }

  /** Alias for removeConnection */
  removeUserSocket(userId, socketId) {
    return this.removeConnection(userId, socketId);
  }

  /** Alias for getConnectionCount */
  getUserSocketCount(userId) {
    return this.getConnectionCount(userId);
  }

  /**
   * Clear all presence data (for testing or shutdown)
   */
  clear() {
    this.userConnections.clear();
    this.userMetadata.clear();
  }

  /**
   * Shutdown presence manager
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

export default new PresenceManager();
