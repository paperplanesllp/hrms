import { asyncHandler } from "../../utils/asyncHandler.js";
import * as chatService from "./chat.service.js";

export const getMyChats = asyncHandler(async (req, res) => {
  const chats = await chatService.getUserChats(req.user.id);
  res.json(chats);
});

export const createChat = asyncHandler(async (req, res) => {
  const { userId, isGroup, name, participants } = req.body;
  
  let chat;
  if (isGroup) {
    chat = await chatService.createGroupChat(req.user.id, name, participants);
  } else {
    chat = await chatService.createDirectChat(req.user.id, userId);
  }
  
  res.json(chat);
});

export const getGroupDetails = asyncHandler(async (req, res) => {
  const details = await chatService.getGroupDetails(req.params.chatId, req.user.id);
  res.json(details);
});

export const updateGroup = asyncHandler(async (req, res) => {
  const { name, action, userId } = req.body;
  const chat = await chatService.updateGroupChat(req.params.chatId, req.user.id, { name, action, userId });
  res.json(chat);
});

export const addMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await chatService.addGroupMember(req.params.chatId, req.user.id, userId);
  res.json(chat);
});

export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await chatService.removeGroupMember(req.params.chatId, req.user.id, userId);
  res.json(chat);
});

export const renameGroup = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const chat = await chatService.renameGroup(req.params.chatId, req.user.id, name);
  res.json(chat);
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const result = await chatService.leaveGroup(req.params.chatId, req.user.id);
  res.json(result);
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await chatService.getChatMessages(req.params.chatId, req.user.id);
  res.json(messages);
});

export const postMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  let fileData = null;
  
  // Handle both voice and image files
  const file = req.files?.voice?.[0] || req.files?.image?.[0] || req.file;
  
  if (file) {
    fileData = {
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      type: file.mimetype
    };
  }
  
  const message = await chatService.sendMessage(req.params.chatId, req.user.id, content || (file?.mimetype.startsWith('image/') ? "📷 Image" : "🎤 Voice message"), fileData);
  res.json(message);
});

export const markRead = asyncHandler(async (req, res) => {
  await chatService.markAsRead(req.params.chatId, req.user.id);
  res.json({ success: true });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const users = await chatService.searchUsers(req.query.q, req.user.id);
  res.json(users);
});

export const updateMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const message = await chatService.updateMessage(req.params.messageId, req.user.id, content);
  res.json(message);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { deleteForEveryone } = req.query;
  await chatService.deleteMessage(req.params.messageId, req.user.id, deleteForEveryone === 'true');
  res.json({ success: true });
});

export const clearChat = asyncHandler(async (req, res) => {
  await chatService.clearChatMessages(req.params.chatId, req.user.id);
  res.json({ success: true });
});

export const getMessageInfo = asyncHandler(async (req, res) => {
  const info = await chatService.getMessageInfo(req.params.messageId, req.user.id);
  res.json(info);
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await chatService.deleteConversation(req.params.chatId, req.user.id);
  res.json({ success: true });
});
