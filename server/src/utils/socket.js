import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { corsOptions } from "../config/cors.js";
import { User } from "../modules/users/User.model.js";
import presenceManager from "./presenceManager.js";
import { registerUserSocket, unregisterUserSocket } from "./callManager.js";

let io;

const normalizeSocketPath = (value) => {
  const raw = (value || "").trim();
  if (!raw) return "/socket.io/";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

export const initializeSocket = (server) => {
  if (io) {
    return io;
  }

  const socketPath = normalizeSocketPath(env.SOCKET_IO_PATH);

  io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket"],
    allowEIO3: false,
    pingInterval: 25000,
    pingTimeout: 60000,
    path: socketPath,
  });

  console.log("[Socket.IO] Server initialized", {
    path: socketPath,
    transports: ["websocket"],
  });

  io.engine.on("connection_error", (err) => {
    console.error("[Socket.IO] Engine connection error", {
      code: err.code,
      message: err.message,
      context: err.context,
      requestUrl: err.req?.url,
      origin: err.req?.headers?.origin,
      upgrade: err.req?.headers?.upgrade,
      transport: err.req?._query?.transport,
    });
  });

  io.engine.on("headers", (headers, req) => {
    console.log("[Socket.IO] Engine handshake headers", {
      requestUrl: req.url,
      origin: req.headers.origin,
      upgrade: req.headers.upgrade,
      transport: req._query?.transport,
    });
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const origin = socket.handshake.headers.origin;
      console.log("[Socket.IO] Auth attempt", {
        socketId: socket.id,
        origin,
        transport: socket.conn?.transport?.name,
        path: socketPath,
        hasToken: Boolean(token),
      });
      
      if (!token) {
        console.error("❌ Socket auth failed: Missing token", {
          origin,
          hasAuth: !!socket.handshake.auth,
          authKeys: Object.keys(socket.handshake.auth || {})
        });
        return next(new Error("AUTH_REQUIRED"));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      } catch (err) {
        console.error("❌ Socket auth failed: Invalid token verification", {
          error: err.message,
          tokenLength: token ? token.length : 0,
          tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
          secret: env.JWT_ACCESS_SECRET ? 'configured' : 'MISSING!',
          origin
        });
        return next(new Error("AUTH_INVALID"));
      }

      const user = await User.findById(decoded.id).select("-passwordHash -refreshTokenHash");
      
      if (!user) {
        console.error("❌ Socket auth failed: User not found", {
          userId: decoded.id,
          origin
        });
        return next(new Error("AUTH_USER_NOT_FOUND"));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;
      socket.userEmail = user.email;
      socket.userImage = user.profileImageUrl;
      
      console.log("[Socket.IO] Auth succeeded", {
        userName: user.name,
        userRole: user.role,
        userId: user._id,
        origin,
        socketId: socket.id,
      });
      next();
    } catch (err) {
      console.error("❌ Socket auth error:", {
        message: err.message,
        stack: err.stack,
        hasJwtSecret: !!env.JWT_ACCESS_SECRET
      });
      next(new Error("AUTH_ERROR"));
    }
  });

  // Give presence manager access to io for stale-session cleanup broadcasts
  presenceManager.setIO(io);

  io.on("connection", async (socket) => {
    console.log("[Socket.IO] User connected", {
      userId: socket.userId,
      userName: socket.userName,
      socketId: socket.id,
      transport: socket.conn?.transport?.name,
    });

    socket.conn.on("upgrade", (transport) => {
      console.log("[Socket.IO] Transport upgraded", {
        userId: socket.userId,
        socketId: socket.id,
        transport: transport.name,
      });
    });
    
    try {
      // Add connection to presence manager
      const wasOffline = !presenceManager.isUserOnline(socket.userId);
      
      presenceManager.addConnection(socket.userId, socket.id, {
        name: socket.userName,
        email: socket.userEmail,
        image: socket.userImage,
        role: socket.userRole
      });

      registerUserSocket(socket.userId, socket.id);
      console.log("[SocketMap] Registered authenticated socket", {
        userId: socket.userId,
        socketId: socket.id,
      });

      // Update user in database
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastActivityAt: new Date()
      });

      // If user was offline, broadcast to all that they're now online
      if (wasOffline) {
        console.log(`✅ User ${socket.userName} is now ONLINE`);
        io.emit("presence:update", {
          userId: socket.userId,
          isOnline: true,
          lastActivityAt: new Date(),
          userName: socket.userName,
          userEmail: socket.userEmail,
          userImage: socket.userImage,
          statusChangedAt: new Date()
        });

        io.emit("user:online", {
          userId: socket.userId,
          userName: socket.userName,
          userEmail: socket.userEmail,
          at: new Date().toISOString(),
        });
      }

      // Send current online users list to the newly connected socket
      const onlineUsers = presenceManager.getOnlineUsers();
      socket.emit("presence:init", {
        onlineUsers
      });

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      console.log("[SocketMap] Joined personal room", {
        userId: socket.userId,
        room: `user_${socket.userId}`,
      });
      
      // Join HR/Admin to management room
      if (socket.userRole === "HR" || socket.userRole === "ADMIN") {
        socket.join("hr_management");
      }

      // Register voice/video call signaling handlers for this connected socket.
      const { registerCallHandlers } = await import("./callHandlers.js");
      registerCallHandlers(io, socket);

      // ============ HEARTBEAT EVENT ============
      socket.on("heartbeat", async () => {
        presenceManager.updateActivity(socket.userId, socket.id);
        
        await User.findByIdAndUpdate(socket.userId, {
          lastActivityAt: new Date()
        }).catch(err => {
          console.error(`Error updating heartbeat for user ${socket.userId}:`, err.message);
        });
      });

      // ============ ACTIVITY EVENT ============
      // Lightweight — only updates in-memory presence (heartbeat handles DB writes)
      socket.on("user:activity", () => {
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      // Chat events - unified handler for both 1-on-1 and group chats
      socket.on("join_chat", (chatId) => {
        socket.join(`chat_${chatId}`);
      });

      socket.on("leave_chat", (chatId) => {
        socket.leave(`chat_${chatId}`);
      });

      socket.on("join_group", (groupId) => {
        socket.join(`group_${groupId}`);
      });

      socket.on("leave_group", (groupId) => {
        socket.leave(`group_${groupId}`);
      });

      // Typing indicators - works for both direct and group chats
      socket.on("typing", ({ chatId, userName, isGroupChat }) => {
        const roomName = isGroupChat ? `group_${chatId}` : `chat_${chatId}`;
        socket.to(roomName).emit("user_typing", { 
          userName, 
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });

        // Update activity on typing
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("stop_typing", ({ chatId, isGroupChat }) => {
        const roomName = isGroupChat ? `group_${chatId}` : `chat_${chatId}`;
        socket.to(roomName).emit("user_stop_typing", { userId: socket.userId });
      });

      // Member typing status for groups
      socket.on("group_member_typing", ({ groupId, memberName }) => {
        socket.to(`group_${groupId}`).emit("group_member_typing", { 
          memberId: socket.userId,
          memberName,
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("group_member_stop_typing", ({ groupId }) => {
        socket.to(`group_${groupId}`).emit("group_member_stop_typing", { 
          memberId: socket.userId
        });
      });

      // HR Team Events
      socket.on("hr_member_status_change", ({ status }) => {
        io.to("hr_management").emit("hr_member_status_updated", {
          userId: socket.userId,
          userName: socket.userName,
          status,
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("hr_discussion_created", (discussion) => {
        io.to("hr_management").emit("new_hr_discussion", {
          ...discussion,
          createdBy: {
            _id: socket.userId,
            name: socket.userName,
            email: socket.userEmail
          },
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("hr_discussion_replied", ({ discussionId, reply }) => {
        io.to("hr_management").emit("new_hr_reply", {
          ...reply,
          discussionId,
          author: {
            _id: socket.userId,
            name: socket.userName,
            email: socket.userEmail
          },
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("hr_meeting_created", (meeting) => {
        io.to("hr_management").emit("new_hr_meeting", {
          ...meeting,
          organizer: {
            _id: socket.userId,
            name: socket.userName,
            email: socket.userEmail
          },
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("hr_meeting_updated", ({ meetingId, status }) => {
        io.to("hr_management").emit("hr_meeting_status_changed", {
          meetingId,
          status,
          updatedBy: socket.userName,
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      // News/Updates events
      socket.on("news_created", (newsItem) => {
        io.emit("news_created", {
          ...newsItem,
          createdBy: {
            _id: socket.userId,
            name: socket.userName,
            email: socket.userEmail
          },
          timestamp: new Date().toISOString()
        });
        presenceManager.updateActivity(socket.userId, socket.id);
      });

      socket.on("news_deleted", (newsId) => {
        io.emit("news_deleted", newsId);
      });

      socket.on("error", (err) => {
        console.error("[Socket.IO] Socket error", {
          userId: socket.userId,
          socketId: socket.id,
          message: err?.message,
          transport: socket.conn?.transport?.name,
        });
      });

      socket.on("disconnect", async (reason) => {
        const userId = socket.userId;
        const userName = socket.userName;

        if (!userId) return;

        console.log("[Socket.IO] Socket disconnected", {
          userId,
          userName,
          socketId: socket.id,
          reason,
          transport: socket.conn?.transport?.name,
        });

        unregisterUserSocket(userId, socket.id);
        console.log("[SocketMap] Unregistered socket", {
          userId,
          socketId: socket.id,
        });
        
        // Remove only this socket from the user's active set
        const stillOnline = presenceManager.removeConnection(userId, socket.id);

        if (stillOnline) {
          console.log(`ℹ️ User ${userName} still has ${presenceManager.getConnectionCount(userId)} active socket(s)`);
          return;
        }

        // No sockets remain — user is truly offline
        const now = new Date();
        console.log(`📴 User ${userName} is now OFFLINE (all sockets closed)`);

        // Atomically update DB to prevent race conditions
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: now,
          lastActivityAt: now
        }).catch(err => {
          console.error(`Error marking user ${userId} offline:`, err.message);
        });

        // Broadcast offline status to all connected clients
        io.emit("presence:update", {
          userId,
          isOnline: false,
          lastSeen: now,
          lastActivityAt: now,
          userName,
          statusChangedAt: now
        });

        io.emit("user:offline", {
          userId,
          userName,
          at: now.toISOString(),
        });
      });

    } catch (err) {
      console.error(`❌ Error in socket connection:`, err.message);
      socket.disconnect(true);
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// ============ CHAT NOTIFICATION HELPERS ============
export const notifyNewMessage = (chatId, message, excludeUserId) => {
  if (io) {
    const roomName = message.isGroupChat ? `group_${chatId}` : `chat_${chatId}`;
    io.to(roomName).except(`user_${excludeUserId}`).emit("new_message", {
      ...message,
      isGroupChat: message.isGroupChat || false
    });
  }
};

export const notifyGroupUpdate = (chatId, updateData) => {
  if (io) {
    io.to(`group_${chatId}`).emit("group_updated", {
      ...updateData,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyGroupMemberAdded = (chatId, newMember, addedBy) => {
  if (io) {
    io.to(`group_${chatId}`).emit("group_member_added", {
      chatId,
      newMember: {
        _id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        profileImageUrl: newMember.profileImageUrl
      },
      addedBy: addedBy.name,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyGroupMemberRemoved = (chatId, removedMemberId, removedMemberName, removedBy) => {
  if (io) {
    io.to(`group_${chatId}`).emit("group_member_removed", {
      chatId,
      removedMemberId,
      removedMemberName,
      removedBy: removedBy.name,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyGroupRenamed = (chatId, newName, renamedBy) => {
  if (io) {
    io.to(`group_${chatId}`).emit("group_renamed", {
      chatId,
      newName,
      renamedBy: renamedBy.name,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyMessageRead = (chatId, userId, isGroupChat) => {
  if (io) {
    const roomName = isGroupChat ? `group_${chatId}` : `chat_${chatId}`;
    io.to(roomName).emit("messages_read", { userId, chatId });
  }
};

// ============ LEAVE & HR NOTIFICATIONS ============
export const notifyHRNewLeaveRequest = (employeeName, leaveId, startDate, endDate, reason) => {
  if (io) {
    io.to("hr_management").emit("new_leave_request", {
      type: "leave_request",
      title: "New Leave Request",
      message: `New Leave Request from ${employeeName}`,
      details: `${startDate} to ${endDate} (${reason})`,
      leaveId,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyUserLeaveStatus = (userId, status, startDate, endDate, rejectionReason = null) => {
  if (io) {
    const isApproved = status === "APPROVED";
    const message = isApproved 
      ? `Update: Your leave for ${startDate} to ${endDate} has been Approved. ✅`
      : `Update: Your leave for ${startDate} to ${endDate} was Rejected. Reason: ${rejectionReason || 'No reason provided'} ❌`;

    io.to(`user_${userId}`).emit("leave_status_update", {
      type: "leave_status",
      title: isApproved ? "Leave Approved" : "Leave Rejected",
      message,
      status,
      timestamp: new Date().toISOString()
    });
  }
};

// ============ HR TEAM BROADCASTERS ============

export const notifyNewHRDiscussion = (discussion) => {
  if (io) {
    io.to("hr_management").emit("new_hr_discussion", {
      ...discussion,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyNewHRReply = (discussionId, reply) => {
  if (io) {
    io.to("hr_management").emit("new_hr_reply", {
      ...reply,
      discussionId,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyNewHRMeeting = (meeting) => {
  if (io) {
    io.to("hr_management").emit("new_hr_meeting", {
      ...meeting,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyHRMeetingStatusChanged = (meetingId, oldStatus, newStatus, updatedBy) => {
  if (io) {
    io.to("hr_management").emit("hr_meeting_status_changed", {
      meetingId,
      oldStatus,
      newStatus,
      updatedBy,
      timestamp: new Date().toISOString()
    });
  }
};

// ============ NEWS/UPDATES BROADCASTERS ============
export const notifyNewsCreated = (newsItem) => {
  if (io) {
    io.emit("news_created", {
      ...newsItem,
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyNewsDeleted = (newsId) => {
  if (io) {
    io.emit("news_deleted", newsId);
  }
};

export const notifyNewsPolicyUpdate = (newsItem, policyTitle) => {
  if (io) {
    io.emit("new_policy_update", {
      ...newsItem,
      type: "policy_update",
      title: "📋 New Policy Update",
      message: `Important: ${policyTitle}`,
      timestamp: new Date().toISOString()
    });
  }
};

// ============ TASK EVENT BROADCASTERS ============

/**
 * Collect all unique user IDs (assignees + creator/assignedBy) for a task.
 * Handles both populated objects and raw ObjectId strings.
 */
const getTaskUserIds = (task) => {
  const ids = new Set();

  // All assignees (array)
  if (Array.isArray(task.assignedTo)) {
    task.assignedTo.forEach(a => {
      const id = a?._id?.toString() || a?.toString();
      if (id) ids.add(id);
    });
  } else if (task.assignedTo) {
    const id = task.assignedTo?._id?.toString() || task.assignedTo?.toString();
    if (id) ids.add(id);
  }

  // Creator / assigner
  const creatorId = task.assignedBy?._id?.toString() || task.assignedBy?.toString()
    || task.createdBy?._id?.toString() || task.createdBy?.toString();
  if (creatorId) ids.add(creatorId);

  return ids;
};

export const notifyTaskCreated = (task, createdBy) => {
  if (!io) return;

  const payload = {
    task,
    message: `New task assigned: ${task.title}`,
    createdBy,
    timestamp: new Date().toISOString()
  };

  // Notify all assignees AND the creator
  getTaskUserIds(task).forEach(uid => {
    io.to(`user_${uid}`).emit("task:created", payload);
  });

  // Broadcast to HR/Admin management room
  io.to("hr_management").emit("task:created", {
    ...payload,
    message: `New task created: ${task.title}`
  });
};

export const notifyTaskUpdated = (task, changedBy) => {
  if (!io) return;

  const payload = {
    task,
    message: `Task updated: ${task.title}`,
    changedBy,
    timestamp: new Date().toISOString()
  };

  // Notify all assignees AND the creator
  getTaskUserIds(task).forEach(uid => {
    io.to(`user_${uid}`).emit("task:updated", payload);
  });

  io.to("hr_management").emit("task:updated", payload);
};

export const notifyTaskStatusChanged = (task, changedBy) => {
  if (!io) return;

  const payload = {
    task,
    message: `Task "${task.title}" status changed to ${task.status}`,
    changedBy,
    timestamp: new Date().toISOString()
  };

  // Notify all assignees AND the creator so everyone's UI stays in sync
  getTaskUserIds(task).forEach(uid => {
    io.to(`user_${uid}`).emit("task:status-changed", payload);
  });

  io.to("hr_management").emit("task:status-changed", payload);
};

export const notifyTaskDeleted = (taskId, taskTitle, deletedBy, assignedToIds = []) => {
  if (!io) return;

  const payload = {
    taskId,
    message: `Task "${taskTitle}" has been deleted`,
    deletedBy,
    timestamp: new Date().toISOString()
  };

  // Notify assignees so they see it removed from their list
  if (Array.isArray(assignedToIds)) {
    assignedToIds.forEach(uid => {
      const id = uid?._id?.toString() || uid?.toString();
      if (id) io.to(`user_${id}`).emit("task:deleted", payload);
    });
  }

  io.to("hr_management").emit("task:deleted", payload);
};
