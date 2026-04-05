import { Chat } from "./Chat.model.js";
import { Message } from "./Message.model.js";
import { User } from "../users/User.model.js";
import { notifyNewMessage, notifyGroupUpdate, notifyGroupMemberAdded, notifyGroupMemberRemoved, notifyGroupRenamed } from "../../utils/socket.js";

// Get all chats for current user
export async function getUserChats(userId) {
  return Chat.find({ participants: userId })
    .populate("participants", "name email role profileImageUrl")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });
}

// Create 1-on-1 chat
export async function createDirectChat(userId, otherUserId) {
  // Check if chat already exists
  const existing = await Chat.findOne({
    isGroupChat: false,
    participants: { $all: [userId, otherUserId], $size: 2 }
  }).populate("participants", "name email role profileImageUrl");
  
  if (existing) return existing;
  
  const chat = await Chat.create({
    isGroupChat: false,
    participants: [userId, otherUserId]
  });
  return chat.populate("participants", "name email role profileImageUrl");
}

// Create group chat
export async function createGroupChat(userId, name, participantIds) {
  const chat = await Chat.create({
    name,
    isGroupChat: true,
    participants: [userId, ...participantIds],
    groupAdmin: userId,
    createdBy: userId
  });
  return chat.populate("participants", "name email role profileImageUrl");
}

// Update group chat (rename, add/remove members)
export async function updateGroupChat(chatId, userId, { name, action, userId: targetUserId }) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  
  const admin = await User.findById(userId).select("name");
  
  if (name) {
    chat.name = name;
    await chat.save();
    const updatedChat = await chat.populate("participants", "name email role profileImageUrl");
    notifyGroupRenamed(chatId, name, admin);
    return updatedChat;
  }
  
  if (action === 'add' && targetUserId) {
    if (!chat.participants.includes(targetUserId)) {
      chat.participants.push(targetUserId);
      await chat.save();
      
      const newMember = await User.findById(targetUserId);
      const updatedChat = await chat.populate("participants", "name email role profileImageUrl");
      notifyGroupMemberAdded(chatId, newMember, admin);
      return updatedChat;
    }
  } else if (action === 'remove' && targetUserId) {
    chat.participants = chat.participants.filter(p => p.toString() !== targetUserId);
    await chat.save();
    
    const removedMember = await User.findById(targetUserId).select("name");
    const updatedChat = await chat.populate("participants", "name email role profileImageUrl");
    notifyGroupMemberRemoved(chatId, targetUserId, removedMember.name, admin);
    return updatedChat;
  }
  
  const updatedChat = await chat.populate("participants", "name email role profileImageUrl");
  notifyGroupUpdate(chatId, {
    chatId,
    name: updatedChat.name,
    participants: updatedChat.participants,
    action,
    targetUserId
  });
  
  return updatedChat;
}

// Get messages for a chat (with security check)
export async function getChatMessages(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  return Message.find({ chatId })
    .populate("sender", "name email profileImageUrl")
    .sort({ createdAt: 1 })
    .limit(100);
}

// Send message
export async function sendMessage(chatId, userId, content, fileData = null) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  const message = await Message.create({
    chatId,
    sender: userId,
    content,
    fileUrl: fileData?.url,
    fileName: fileData?.name,
    fileType: fileData?.type,
    readBy: [userId]
  });
  
  await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });
  
  const populatedMessage = await message.populate("sender", "name email profileImageUrl");
  
  // Emit real-time event
  notifyNewMessage(chatId, populatedMessage, userId);
  
  return populatedMessage;
}

// Mark messages as read
export async function markAsRead(chatId, userId) {
  await Message.updateMany(
    { chatId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
}

// Search users
export async function searchUsers(query, currentUserId) {
  return User.find({
    _id: { $ne: currentUserId },
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } }
    ]
  })
  .select("name email role")
  .limit(10);
}

// Update message
export async function updateMessage(messageId, userId, content) {
  const message = await Message.findById(messageId);
  if (!message || message.sender.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  message.content = content;
  await message.save();
  return message.populate("sender", "name email profileImageUrl");
}

// Delete message
export async function deleteMessage(messageId, userId, deleteForEveryone = false) {
  const message = await Message.findById(messageId);
  if (!message || message.sender.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  
  if (deleteForEveryone) {
    await message.deleteOne();
  } else {
    // For "delete for me", just mark it as deleted for this user
    // In a real app, you'd add a deletedFor array field
    await message.deleteOne();
  }
}

// Clear chat messages
export async function clearChatMessages(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  await Message.deleteMany({ chatId, sender: userId });
}

// Get message info with read receipts
export async function getMessageInfo(messageId, userId) {
  const message = await Message.findById(messageId)
    .populate("readBy", "name email profileImageUrl")
    .populate("sender", "name email");
  
  if (!message) {
    throw new Error("Message not found");
  }
  
  const chat = await Chat.findById(message.chatId);
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  return {
    _id: message._id,
    content: message.content,
    sender: message.sender,
    createdAt: message.createdAt,
    readBy: message.readBy
  };
}

// Get group details
export async function getGroupDetails(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  const populated = await chat.populate([
    { path: "participants", select: "name email role profileImageUrl _id" },
    { path: "groupAdmin", select: "name email _id" },
    { path: "createdBy", select: "name email _id" }
  ]);
  
  return {
    _id: populated._id,
    name: populated.name,
    isGroupChat: populated.isGroupChat,
    participants: populated.participants,
    groupAdmin: populated.groupAdmin,
    createdBy: populated.createdBy,
    createdAt: populated.createdAt,
    updatedAt: populated.updatedAt
  };
}

// Add member to group
export async function addGroupMember(chatId, userId, newMemberId) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized - Only group admin can add members");
  }
  
  if (chat.participants.includes(newMemberId)) {
    throw new Error("User already in group");
  }
  
  const newMember = await User.findById(newMemberId);
  if (!newMember) {
    throw new Error("User not found");
  }
  
  chat.participants.push(newMemberId);
  await chat.save();
  
  const admin = await User.findById(userId).select("name");
  notifyGroupMemberAdded(chatId, newMember, admin);
  
  return chat.populate("participants", "name email role profileImageUrl");
}

// Remove member from group
export async function removeGroupMember(chatId, userId, memberIdToRemove) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized - Only group admin can remove members");
  }
  
  chat.participants = chat.participants.filter(p => p.toString() !== memberIdToRemove);
  await chat.save();
  
  const admin = await User.findById(userId).select("name");
  const removedMember = await User.findById(memberIdToRemove).select("name");
  notifyGroupMemberRemoved(chatId, memberIdToRemove, removedMember.name, admin);
  
  return chat.populate("participants", "name email role profileImageUrl");
}

// Rename group
export async function renameGroup(chatId, userId, newName) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized - Only group admin can rename group");
  }
  
  if (!newName || newName.trim().length === 0) {
    throw new Error("Group name cannot be empty");
  }
  
  chat.name = newName.trim();
  await chat.save();
  
  const admin = await User.findById(userId).select("name");
  notifyGroupRenamed(chatId, newName, admin);
  
  return chat.populate("participants", "name email role profileImageUrl");
}

// Leave group
export async function leaveGroup(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    throw new Error("Invalid group");
  }
  
  if (!chat.participants.includes(userId)) {
    throw new Error("Not a member of this group");
  }
  
  // If user is admin, transfer admin rights to another member or delete group if empty
  if (chat.groupAdmin.toString() === userId) {
    const remainingMembers = chat.participants.filter(p => p.toString() !== userId);
    if (remainingMembers.length === 0) {
      // Delete empty group
      await Chat.deleteOne({ _id: chatId });
      return { deleted: true };
    } else {
      // Transfer admin to first remaining member
      chat.groupAdmin = remainingMembers[0];
      chat.participants = remainingMembers;
    }
  } else {
    chat.participants = chat.participants.filter(p => p.toString() !== userId);
  }
  
  await chat.save();
  const user = await User.findById(userId).select("name");
  notifyGroupMemberRemoved(chatId, userId, user.name, { name: "System" });
  
  return chat.populate("participants", "name email role profileImageUrl");
}

// Delete conversation
export async function deleteConversation(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  // Delete all messages in the chat
  await Message.deleteMany({ chatId });
  
  // Delete the chat
  await Chat.deleteOne({ _id: chatId });
}
