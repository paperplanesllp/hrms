import { Chat } from "./Chat.model.js";
import { Message } from "./Message.model.js";
import { User } from "../users/User.model.js";
import { notifyNewMessage, notifyGroupUpdate, notifyGroupMemberAdded, notifyGroupMemberRemoved, notifyGroupRenamed } from "../../utils/socket.js";

async function assertSameCompanyUsers(userIds, companyId) {
  if (!companyId) {
    throw new Error("Company context is required");
  }

  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  const users = await User.find({ _id: { $in: uniqueIds }, companyId }).select("_id name email");

  if (users.length !== uniqueIds.length) {
    throw new Error("Cannot chat with users from another company");
  }

  return users;
}

function requireCompanyContext(companyId) {
  if (!companyId) {
    throw new Error("Company context is required");
  }
}

function chatScope(chatId, companyId) {
  requireCompanyContext(companyId);
  return { _id: chatId, companyId };
}

// Get all chats for current user
export async function getUserChats(userId, companyId) {
  requireCompanyContext(companyId);
  return Chat.find({ participants: userId, companyId })
    .populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } })
    .populate("lastMessage")
    .sort({ updatedAt: -1 });
}

// Create 1-on-1 chat
export async function createDirectChat(userId, otherUserId, companyId) {
  await assertSameCompanyUsers([userId, otherUserId], companyId);

  // Check if chat already exists
  const existing = await Chat.findOne({
    companyId,
    isGroupChat: false,
    participants: { $all: [userId, otherUserId], $size: 2 }
  }).populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
  
  if (existing) return existing;
  
  const chat = await Chat.create({
    companyId,
    isGroupChat: false,
    participants: [userId, otherUserId]
  });
  return chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
}

// Create group chat
export async function createGroupChat(userId, name, participantIds, companyId) {
  await assertSameCompanyUsers([userId, ...(participantIds || [])], companyId);

  const chat = await Chat.create({
    companyId,
    name,
    isGroupChat: true,
    participants: [userId, ...participantIds],
    groupAdmin: userId,
    createdBy: userId
  });
  return chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
}

// Update group chat (rename, add/remove members)
export async function updateGroupChat(chatId, userId, { name, action, userId: targetUserId }, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized");
  }

  await assertSameCompanyUsers([userId, ...chat.participants.map(String)], companyId);
  
  const admin = await User.findById(userId).select("name");
  
  if (name) {
    chat.name = name;
    await chat.save();
    const updatedChat = await chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
    notifyGroupRenamed(chatId, name, admin);
    return updatedChat;
  }
  
  if (action === 'add' && targetUserId) {
    await assertSameCompanyUsers([targetUserId], companyId);

    if (!chat.participants.includes(targetUserId)) {
      chat.participants.push(targetUserId);
      await chat.save();
      
      const newMember = await User.findOne({ _id: targetUserId, companyId });
      const updatedChat = await chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
      notifyGroupMemberAdded(chatId, newMember, admin);
      return updatedChat;
    }
  } else if (action === 'remove' && targetUserId) {
    chat.participants = chat.participants.filter(p => p.toString() !== targetUserId);
    await chat.save();
    
    const removedMember = await User.findOne({ _id: targetUserId, companyId }).select("name");
    const updatedChat = await chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
    notifyGroupMemberRemoved(chatId, targetUserId, removedMember.name, admin);
    return updatedChat;
  }
  
  const updatedChat = await chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
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
export async function getChatMessages(chatId, userId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  return Message.find({ chatId, companyId })
    .populate({ path: "sender", select: "name email profileImageUrl", match: { companyId } })
    .sort({ createdAt: 1 })
    .limit(100);
}

// Send message
export async function sendMessage(chatId, userId, content, fileData = null, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  const message = await Message.create({
    chatId,
    companyId,
    sender: userId,
    content,
    fileUrl: fileData?.url,
    fileName: fileData?.name,
    fileType: fileData?.type,
    readBy: [userId]
  });
  
  await Chat.findOneAndUpdate({ _id: chatId, companyId }, { lastMessage: message._id });
  
  const populatedMessage = await message.populate({ path: "sender", select: "name email profileImageUrl", match: { companyId } });
  
  // Emit real-time event
  notifyNewMessage(chatId, populatedMessage, userId);
  
  return populatedMessage;
}

// Mark messages as read
export async function markAsRead(chatId, userId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId)).select("_id participants");
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  await Message.updateMany(
    { chatId, companyId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
}

// Search users
export async function searchUsers(query, currentUserId, companyId) {
  if (!companyId) {
    throw new Error("Company context is required");
  }

  return User.find({
    _id: { $ne: currentUserId },
    companyId,
    role: { $ne: "SUPERADMIN" },
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } }
    ]
  })
  .select("name email role")
  .limit(10);
}

// Update message
export async function updateMessage(messageId, userId, content, companyId) {
  requireCompanyContext(companyId);
  const message = await Message.findOne({ _id: messageId, companyId });
  if (!message || message.sender.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  message.content = content;
  await message.save();
  return message.populate({ path: "sender", select: "name email profileImageUrl", match: { companyId } });
}

// Delete message
export async function deleteMessage(messageId, userId, deleteForEveryone = false, companyId) {
  requireCompanyContext(companyId);
  const message = await Message.findOne({ _id: messageId, companyId });
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
export async function clearChatMessages(chatId, userId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  await Message.deleteMany({ chatId, companyId, sender: userId });
}

// Get message info with read receipts
export async function getMessageInfo(messageId, userId, companyId) {
  requireCompanyContext(companyId);
  const message = await Message.findOne({ _id: messageId, companyId })
    .populate({ path: "readBy", select: "name email profileImageUrl", match: { companyId } })
    .populate({ path: "sender", select: "name email", match: { companyId } });
  
  if (!message) {
    throw new Error("Message not found");
  }
  
  const chat = await Chat.findOne({ _id: message.chatId, companyId });
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
export async function getGroupDetails(chatId, userId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  const populated = await chat.populate([
    { path: "participants", select: "name email role profileImageUrl _id", match: { companyId } },
    { path: "groupAdmin", select: "name email _id", match: { companyId } },
    { path: "createdBy", select: "name email _id", match: { companyId } }
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
export async function addGroupMember(chatId, userId, newMemberId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized - Only group admin can add members");
  }

  await assertSameCompanyUsers([userId, newMemberId, ...chat.participants.map(String)], companyId);
  
  if (chat.participants.includes(newMemberId)) {
    throw new Error("User already in group");
  }
  
  const newMember = await User.findOne({ _id: newMemberId, companyId });
  if (!newMember) {
    throw new Error("User not found");
  }
  
  chat.participants.push(newMemberId);
  await chat.save();
  
  const admin = await User.findById(userId).select("name");
  notifyGroupMemberAdded(chatId, newMember, admin);
  
  return chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
}

// Remove member from group
export async function removeGroupMember(chatId, userId, memberIdToRemove, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.isGroupChat || chat.groupAdmin.toString() !== userId) {
    throw new Error("Unauthorized - Only group admin can remove members");
  }
  
  chat.participants = chat.participants.filter(p => p.toString() !== memberIdToRemove);
  await chat.save();
  
  const admin = await User.findById(userId).select("name");
  const removedMember = await User.findOne({ _id: memberIdToRemove, companyId }).select("name");
  notifyGroupMemberRemoved(chatId, memberIdToRemove, removedMember.name, admin);
  
  return chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
}

// Rename group
export async function renameGroup(chatId, userId, newName, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
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
  
  return chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
}

// Leave group
export async function leaveGroup(chatId, userId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
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
      await Chat.deleteOne({ _id: chatId, companyId });
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
  
  return chat.populate({ path: "participants", select: "name email role profileImageUrl", match: { companyId } });
}

// Delete conversation
export async function deleteConversation(chatId, userId, companyId) {
  const chat = await Chat.findOne(chatScope(chatId, companyId));
  if (!chat || !chat.participants.includes(userId)) {
    throw new Error("Unauthorized");
  }
  
  // Delete all messages in the chat
  await Message.deleteMany({ chatId, companyId });
  
  // Delete the chat
  await Chat.deleteOne({ _id: chatId, companyId });
}
