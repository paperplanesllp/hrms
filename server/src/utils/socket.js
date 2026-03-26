import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../modules/users/User.model.js";

let io;
const onlineUsers = new Map(); // Track online users: userId -> { socketId, userName, userRole, connectedAt }

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5173", "http://localhost:5174"],
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingInterval: 25000,
    pingTimeout: 60000
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error("❌ Socket auth failed: Missing token");
        return next(new Error("Authentication error: Missing token"));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      } catch (err) {
        console.error("❌ Socket auth failed: Invalid token -", err.message);
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await User.findById(decoded.id).select("-passwordHash -refreshTokenHash");
      
      if (!user) {
        console.error("❌ Socket auth failed: User not found -", decoded.id);
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;
      socket.userEmail = user.email;
      socket.userImage = user.profileImageUrl;
      
      console.log(`✅ Socket auth succeeded: ${user.name} (${user.role})`);
      next();
    } catch (err) {
      console.error("❌ Socket auth error:", err.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User ${socket.userName} connected (${socket.userRole})`);
    
    // Track online user
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      userName: socket.userName,
      userRole: socket.userRole,
      userEmail: socket.userEmail,
      userImage: socket.userImage,
      connectedAt: new Date()
    });

    // Broadcast user online status to all connected clients
    io.emit("user_online", {
      userId: socket.userId,
      userName: socket.userName,
      userEmail: socket.userEmail,
      userImage: socket.userImage,
      status: "online"
    });

    // Send list of all online users to newly connected user
    socket.emit("online_users_list", Array.from(onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      userEmail: data.userEmail,
      userImage: data.userImage,
      status: "online"
    })));

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Join HR/Admin to management room
    if (socket.userRole === "HR" || socket.userRole === "ADMIN") {
      socket.join("hr_management");
    }

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
      socket.to(roomName).emit("user_typing", { userName, userId: socket.userId });
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
        status, // meeting, busy, available, offline
        timestamp: new Date().toISOString()
      });
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
    });

    socket.on("hr_meeting_updated", ({ meetingId, status }) => {
      io.to("hr_management").emit("hr_meeting_status_changed", {
        meetingId,
        status,
        updatedBy: socket.userName,
        timestamp: new Date().toISOString()
      });
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
    });

    socket.on("news_deleted", (newsId) => {
      io.emit("news_deleted", newsId);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User ${socket.userName} disconnected`);
      
      // Remove user from online list
      onlineUsers.delete(socket.userId);
      
      // Broadcast user offline status to all connected clients
      io.emit("user_offline", {
        userId: socket.userId,
        userName: socket.userName,
        status: "offline"
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Notification helpers
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

// Chat helpers
export const notifyNewMessage = (chatId, message, excludeUserId) => {
  if (io) {
    // For group chats, emit to group room; for direct chats, emit to chat room
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

// HR Team Event Broadcasters
export const notifyHRTeamMemberOnline = (userId, userName, userEmail, userImage) => {
  if (io) {
    io.to("hr_management").emit("hr_member_online", {
      userId,
      userName,
      userEmail,
      userImage,
      status: "online",
      timestamp: new Date().toISOString()
    });
  }
};

export const notifyHRTeamMemberOffline = (userId, userName) => {
  if (io) {
    io.to("hr_management").emit("hr_member_offline", {
      userId,
      userName,
      status: "offline",
      timestamp: new Date().toISOString()
    });
  }
};

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

// News/Updates Event Broadcasters
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

// ==================== TASK EVENT BROADCASTERS ====================

/**
 * Notify when a new task is created
 * @param {Object} task - The newly created task
 * @param {string} createdBy - User ID of the creator
 */
export const notifyTaskCreated = (task, createdBy) => {
  if (io) {
    // If task has assignedTo, notify the assigned user
    if (task.assignedTo && task.assignedTo._id) {
      io.to(`user_${task.assignedTo._id}`).emit("task:created", {
        task,
        message: `New task assigned: ${task.title}`,
        createdBy,
        timestamp: new Date().toISOString()
      });
    }
    
    // Broadcast to HR/Admin room for administrative visibility
    io.to("hr_management").emit("task:created", {
      task,
      message: `New task created: ${task.title}`,
      createdBy,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Notify when a task is updated
 * @param {Object} task - The updated task
 * @param {string} changedBy - User ID who made the change
 */
export const notifyTaskUpdated = (task, changedBy) => {
  if (io) {
    // Notify the assigned user
    if (task.assignedTo && task.assignedTo._id) {
      io.to(`user_${task.assignedTo._id}`).emit("task:updated", {
        task,
        message: `Task updated: ${task.title}`,
        changedBy,
        timestamp: new Date().toISOString()
      });
    }
    
    // Broadcast to HR/Admin room
    io.to("hr_management").emit("task:updated", {
      task,
      message: `Task updated: ${task.title}`,
      changedBy,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Notify when a task status changes
 * @param {Object} task - The task with updated status
 * @param {string} changedBy - User ID who changed the status
 */
export const notifyTaskStatusChanged = (task, changedBy) => {
  if (io) {
    // Notify the task creator (if they assigned it)
    if (task.createdBy && task.createdBy._id) {
      io.to(`user_${task.createdBy._id}`).emit("task:status-changed", {
        task,
        message: `Task "${task.title}" status changed to ${task.status}`,
        changedBy,
        timestamp: new Date().toISOString()
      });
    }
    
    // Broadcast to HR/Admin room
    io.to("hr_management").emit("task:status-changed", {
      task,
      message: `Task "${task.title}" status changed to ${task.status}`,
      changedBy,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Notify when a task is deleted
 * @param {string} taskId - The ID of the deleted task
 * @param {string} taskTitle - The title of the deleted task
 * @param {string} deletedBy - User ID who deleted the task
 */
export const notifyTaskDeleted = (taskId, taskTitle, deletedBy) => {
  if (io) {
    // Broadcast to all HR/Admin users
    io.to("hr_management").emit("task:deleted", {
      taskId,
      message: `Task "${taskTitle}" has been deleted`,
      deletedBy,
      timestamp: new Date().toISOString()
    });
  }
};