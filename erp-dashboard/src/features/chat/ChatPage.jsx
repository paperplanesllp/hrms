import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { getSocket } from "../../lib/socket.js";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { MessageCircle, Send, Search, Users, Plus, Paperclip, X, Smile, Mic, User, UserPlus, MoreVertical, Edit2, Trash2, Eye, Phone, Video, Lock, Check, Settings, Copy } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import AudioPlayer from "./AudioPlayer.jsx";
import GroupChatModal from "../../components/ui/GroupChatModal.jsx";
import ClearChatConfirmationModal from "./ClearChatConfirmationModal.jsx";
import DeleteConversationModal from "./DeleteConversationModal.jsx";
import "../../../styles/chat.css";

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const socket = getSocket();
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showGroupManageModal, setShowGroupManageModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showMessageInfoModal, setShowMessageInfoModal] = useState(false);
  const [messageInfo, setMessageInfo] = useState(null);
  const [userOnlineStatus, setUserOnlineStatus] = useState({});
  const [showChatMenu, setShowChatMenu] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null); // Track online/offline status
  const [showEncryptionSettings, setShowEncryptionSettings] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const [chatToClear, setChatToClear] = useState(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [deleteConversationModalOpen, setDeleteConversationModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fullImageView, setFullImageView] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChats();
    
    if (socket) {
      // Message events
      socket.on("new_message", handleNewMessage);
      socket.on("user_typing", () => setTyping(true));
      socket.on("user_stop_typing", () => setTyping(false));
      socket.on("group_updated", handleGroupUpdate);
      
      // User status events
      socket.on("user_online", (userData) => {
        setUserOnlineStatus(prev => ({
          ...prev,
          [userData.userId]: "online"
        }));
      });

      socket.on("user_offline", (userData) => {
        setUserOnlineStatus(prev => ({
          ...prev,
          [userData.userId]: "offline"
        }));
      });

      socket.on("online_users_list", (onlineUsersList) => {
        const statusMap = {};
        onlineUsersList.forEach(userData => {
          statusMap[userData.userId] = userData.status;
        });
        setUserOnlineStatus(statusMap);
      });
      
      return () => {
        socket.off("new_message");
        socket.off("user_typing");
        socket.off("user_stop_typing");
        socket.off("group_updated");
        socket.off("user_online");
        socket.off("user_offline");
        socket.off("online_users_list");
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const emojis = ["😀", "😂", "😍", "🥰", "😎", "🤔", "👍", "👏", "🙏", "❤️", "🔥", "✨", "🎉", "💯", "👌", "✅"];

  // Helper function to get user online status
  const getUserStatus = (userId) => {
    return userOnlineStatus[userId] === "online" ? "online" : "offline";
  };

  // Helper function to check if a user is online
  const isUserOnline = (userId) => {
    return userOnlineStatus[userId] === "online";
  };

  const loadChats = async () => {
    try {
      const res = await api.get("/chat");
      const chatsWithMessages = (res.data || []).filter(chat => chat.lastMessage);
      setChats(chatsWithMessages);
      
      // Clear invalid active chat
      if (activeChat && !chatsWithMessages.find(c => c._id === activeChat._id)) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
      if (err?.response?.status === 401) {
        // Clear all data on auth error
        setChats([]);
        setActiveChat(null);
        setMessages([]);
      }
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}/messages`);
      setMessages(res.data || []);
      socket?.emit("join_chat", chatId);
      await api.put(`/chat/${chatId}/read`);
    } catch (err) {
      console.error("Failed to load messages:", err);
      if (err?.response?.status === 404) {
        toast({ title: "Chat not found. Refreshing...", type: "error" });
        loadChats(); // Refresh chat list
        setActiveChat(null);
      } else if (err?.response?.status === 401) {
        toast({ title: "Session expired. Please login again.", type: "error" });
      }
    }
  };

  const handleNewMessage = (message) => {
    if (message.chatId === activeChat?._id) {
      // Display message as plain text
      setMessages(prev => [...prev, message]);
    }
    loadChats(); // Refresh chat list
  };

  const handleGroupUpdate = (updateData) => {
    if (updateData.chatId === activeChat?._id) {
      setActiveChat(prev => ({ ...prev, ...updateData }));
    }
    loadChats(); // Refresh chat list
    toast({ title: "Group updated", type: "success" });
  };

  const selectChat = (chat) => {
    if (activeChat) {
      const roomName = activeChat.isGroupChat ? `group_${activeChat._id}` : `chat_${activeChat._id}`;
      socket?.emit(activeChat.isGroupChat ? "leave_group" : "leave_chat", activeChat._id);
    }
    setActiveChat(chat);
    loadMessages(chat._id);
    
    // Join appropriate room
    const roomName = chat.isGroupChat ? "join_group" : "join_chat";
    socket?.emit(roomName, chat._id);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !activeChat) return;
    
    try {
      if (selectedImage) {
        // Send image
        const formData = new FormData();
        formData.append("image", selectedImage);
        formData.append("content", newMessage.trim() || "📷 Image");
        formData.append("isEncrypted", false);
        
        const res = await api.post(`/chat/${activeChat._id}/messages`, formData);
        setMessages(prev => [...prev, res.data]);
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        // Send plain text
        const res = await api.post(`/chat/${activeChat._id}/messages`, {
          content: newMessage,
          isEncrypted: false
        });
        setMessages(prev => [...prev, res.data]);
      }
      
      setNewMessage("");
      socket?.emit("stop_typing", { chatId: activeChat._id });
    } catch (err) {
      toast({ title: "Failed to send message", type: "error" });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!activeChat) return;
    
    socket?.emit("typing", { chatId: activeChat._id, userName: user.name });
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stop_typing", { chatId: activeChat._id });
    }, 1000);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await api.get(`/chat/search?q=${query}`);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const getExistingChat = (userId) => {
    return chats.find(chat => 
      !chat.isGroupChat && 
      chat.participants?.some(p => p._id === userId)
    );
  };

  const startChat = async (userId) => {
    try {
      const res = await api.post("/chat", { userId, isGroup: false });
      setChats(prev => [res.data, ...prev]);
      selectChat(res.data);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      toast({ title: "Failed to create chat", type: "error" });
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast({ title: "Group name and members required", type: "error" });
      return;
    }
    try {
      const res = await api.post("/chat", { 
        isGroup: true, 
        name: groupName, 
        participants: selectedUsers 
      });
      setChats(prev => [res.data, ...prev]);
      selectChat(res.data);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      toast({ title: "Failed to create group", type: "error" });
    }
  };

  const onGroupCreated = (newGroup) => {
    setChats(prev => [newGroup, ...prev]);
    selectChat(newGroup);
  };

  const updateGroup = async (action, data) => {
    if (!activeChat?.isGroupChat) return;
    
    try {
      const res = await api.put(`/chat/${activeChat._id}/group`, {
        action,
        ...data
      });
      setActiveChat(res.data);
      loadChats();
      toast({ title: "Group updated successfully", type: "success" });
    } catch (err) {
      toast({ title: "Failed to update group", type: "error" });
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({ title: "Please select a valid image file", type: "error" });
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("voice", blob, "voice.webm");
        formData.append("content", "🎤 Voice message");
        formData.append("isEncrypted", false);
        
        try {
          const res = await api.post(`/chat/${activeChat._id}/messages`, formData);
          setMessages(prev => [...prev, res.data]);
        } catch (err) {
          toast({ title: "Failed to send voice message", type: "error" });
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 60000); // Max 1 minute
      
      window.currentRecorder = mediaRecorder;
    } catch (err) {
      toast({ title: "Microphone access denied", type: "error" });
    }
  };

  const stopRecording = () => {
    if (window.currentRecorder && window.currentRecorder.state === "recording") {
      window.currentRecorder.stop();
      setIsRecording(false);
    }
  };

  const viewProfile = (userId) => {
    const userToView = activeChat.participants.find(p => p._id === userId);
    setProfileUser(userToView);
    setShowProfileModal(true);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
  };

  const copyMessageText = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Message copied to clipboard", type: "success" });
    setMessageMenuOpen(null);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setMessageMenuOpen(null);
  };

  const startEdit = () => {
    setEditingMessage(contextMenu.message);
    setEditContent(contextMenu.message.content);
    closeContextMenu();
  };

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await api.put(`/chat/messages/${editingMessage._id}`, { content: editContent });
      setMessages(prev => prev.map(m => m._id === editingMessage._id ? { ...m, content: editContent } : m));
      setEditingMessage(null);
      setEditContent("");
      toast({ title: "Message updated", type: "success" });
    } catch (err) {
      toast({ title: "Failed to update message", type: "error" });
    }
  };

  const openDeleteModal = (msg) => {
    setMessageToDelete(msg);
    setDeleteModalOpen(true);
    setMessageMenuOpen(null);
  };

  const deleteMessage = async (deleteForEveryone = false) => {
    try {
      await api.delete(`/chat/messages/${messageToDelete._id}?deleteForEveryone=${deleteForEveryone}`);
      setMessages(prev => prev.filter(m => m._id !== messageToDelete._id));
      setDeleteModalOpen(false);
      setMessageToDelete(null);
      toast({ title: deleteForEveryone ? "Message deleted for everyone" : "Message deleted for you", type: "success" });
    } catch (err) {
      toast({ title: "Failed to delete message", type: "error" });
    }
  };

  const clearChat = async (chatId) => {
    setIsClearingChat(true);
    try {
      await api.delete(`/chat/${chatId}/messages`);
      if (activeChat?._id === chatId) {
        setMessages([]);
      }
      setShowChatMenu(null);
      setClearChatModalOpen(false);
      setChatToClear(null);
      toast({ title: "Chat cleared successfully", type: "success" });
    } catch (err) {
      toast({ title: "Failed to clear chat", type: "error" });
    } finally {
      setIsClearingChat(false);
    }
  };

  const deleteConversation = async (chatId) => {
    if (!chatId) {
      toast({ title: "Invalid chat ID", type: "error" });
      return;
    }
    
    setIsDeletingConversation(true);
    try {
      await api.delete(`/chat/${chatId}`);
      
      // Update UI immediately
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      
      // Close modals
      setShowChatMenu(null);
      setDeleteConversationModalOpen(false);
      setConversationToDelete(null);
      
      toast({ title: "Conversation deleted successfully", type: "success" });
    } catch (err) {
      console.error("Delete error:", err);
      if (err?.response?.status === 404) {
        // Chat already deleted, just update UI
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (activeChat?._id === chatId) {
          setActiveChat(null);
          setMessages([]);
        }
        setShowChatMenu(null);
        setDeleteConversationModalOpen(false);
        setConversationToDelete(null);
        toast({ title: "Conversation removed", type: "success" });
      } else {
        toast({ title: "Failed to delete conversation", type: "error" });
      }
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const viewMessageDetails = async () => {
    const msg = contextMenu.message;
    try {
      const res = await api.get(`/chat/messages/${msg._id}/info`);
      setMessageInfo({
        content: msg.content,
        sentAt: msg.createdAt,
        readBy: res.data.readBy
      });
      setShowMessageInfoModal(true);
    } catch (err) {
      toast({ title: "Failed to load message info", type: "error" });
    }
    closeContextMenu();
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-0 bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="flex flex-col overflow-hidden bg-white border-r premium-chat-sidebar w-80 dark:bg-gray-800 border-slate-200 dark:border-gray-700">
        <div className="p-5 border-b border-slate-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNewChat(!showNewChat)}
                className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-full shadow-md transition-all"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => setShowGroupModal(true)}
                className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-full shadow-md transition-all"
                title="Create Group"
              >
                <Users className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {showNewChat && (
            <div className="space-y-3">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="text-sm border-0 bg-slate-100 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 dark:text-white"
              />
              {searchResults.length > 0 ? (
                <div className="p-2 space-y-1 overflow-y-auto rounded-lg max-h-48 bg-slate-50 dark:bg-gray-700">
                  {searchResults.map(u => {
                    const existingChat = getExistingChat(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => existingChat ? selectChat(existingChat) : startChat(u._id)}
                        className="p-3 transition-colors rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-gray-600"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-400">{u.email}</p>
                          </div>
                          <div className="text-xs">
                            {existingChat ? (
                              <span className="px-2 py-1 font-medium text-green-700 bg-green-100 rounded-full">
                                Chat exists
                              </span>
                            ) : (
                              <span className="px-2 py-1 font-medium rounded-full bg-slate-100 text-slate-600">
                                New chat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.trim() && (
                <div className="py-4 text-center text-slate-500 dark:text-gray-400">
                  <p className="text-sm">No members found</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto premium-chat-list">
          {chats.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat._id}
                className={`px-4 py-3 border-b border-slate-200 dark:border-gray-700 transition-all hover:bg-slate-100 dark:hover:bg-gray-700 group/chat ${
                  activeChat?._id === chat._id ? "bg-blue-50 dark:bg-gray-700 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative cursor-pointer" onClick={() => selectChat(chat)}>
                    {chat.isGroupChat ? (
                      <div className="flex items-center justify-center w-12 h-12 font-semibold text-white rounded-full shadow-md bg-gradient-to-br from-blue-600 to-blue-700">
                        <Users className="w-6 h-6" />
                      </div>
                    ) : (
                      chat.participants?.find(p => p._id !== user.id)?.profileImageUrl ? (
                        <img 
                          src={chat.participants.find(p => p._id !== user.id).profileImageUrl} 
                          alt="Profile" 
                          className="object-cover w-12 h-12 rounded-full ring-2 ring-slate-200"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-12 h-12 font-semibold text-white rounded-full bg-gradient-to-br from-slate-700 to-slate-900">
                          {chat.participants?.find(p => p._id !== user.id)?.name?.[0] || "?"}
                        </div>
                      )
                    )}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      isUserOnline(chat.participants?.find(p => p._id !== user.id)?._id)
                        ? "bg-green-500 animate-pulse"
                        : "bg-slate-400"
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => selectChat(chat)}>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[150px]">
                      {chat.isGroupChat 
                        ? chat.name 
                        : chat.participants?.find(p => p._id !== user.id)?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 max-w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">
                      {chat.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                  <div className="relative flex-shrink-0 transition-opacity opacity-0 group-hover/chat:opacity-100">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChatMenu(showChatMenu === chat._id ? null : chat._id);
                      }}
                      className="p-2 transition-all rounded-full hover:bg-slate-200 dark:hover:bg-gray-600"
                      title="Chat Options"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                    </Button>
                    {showChatMenu === chat._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(null)} />
                        <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-slate-200 dark:border-gray-600 py-2 z-50 min-w-[160px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatToClear(chat);
                              setClearChatModalOpen(true);
                              setShowChatMenu(null);
                            }}
                            className="flex items-center w-full gap-2 px-4 py-2 text-sm text-left text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:text-orange-400"
                          >
                            <Trash2 className="w-4 h-4" /> Clear Chat
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationToDelete(chat);
                              setDeleteConversationModalOpen(true);
                              setShowChatMenu(null);
                            }}
                            className="flex items-center w-full gap-2 px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Conversation
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="relative flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900">
        {activeChat ? (
          <>
            {/* Premium Header */}
            <div className="px-6 py-5 text-white shadow-lg premium-chat-header bg-gradient-to-r from-slate-900 to-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {activeChat.isGroupChat ? (
                      <div className="flex items-center justify-center font-bold text-white rounded-full shadow-lg w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600">
                        <Users className="w-7 h-7" />
                      </div>
                    ) : (
                      activeChat.participants?.find(p => p._id !== user.id)?.profileImageUrl ? (
                        <img 
                          src={activeChat.participants.find(p => p._id !== user.id).profileImageUrl} 
                          alt="Profile" 
                          className="object-cover transition-opacity rounded-full cursor-pointer w-14 h-14 ring-3 ring-blue-300 hover:opacity-90"
                          onClick={() => viewProfile(activeChat.participants.find(p => p._id !== user.id)._id)}
                        />
                      ) : (
                        <div 
                          className="flex items-center justify-center font-bold text-white transition-opacity rounded-full cursor-pointer w-14 h-14 bg-gradient-to-br from-blue-300 to-blue-500 ring-3 ring-blue-300 hover:opacity-90"
                          onClick={() => viewProfile(activeChat.participants.find(p => p._id !== user.id)._id)}
                        >
                          {activeChat.participants?.find(p => p._id !== user.id)?.name?.[0] || "?"}
                        </div>
                      )
                    )}
                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-3 border-slate-800 shadow-lg ${
                      isUserOnline(activeChat?.participants?.find(p => p._id !== user.id)?._id)
                        ? "bg-green-500 animate-pulse"
                        : "bg-slate-400"
                    }`}></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {activeChat.isGroupChat 
                        ? activeChat.name 
                        : activeChat.participants?.find(p => p._id !== user.id)?.name || "Unknown"}
                    </h3>
                    {typing && (
                      <p className="text-sm font-medium text-blue-200 animate-pulse">
                        ✓ typing...
                      </p>
                    )}
                    {!typing && activeChat && !activeChat.isGroupChat && (
                      <div className="flex items-center gap-2 text-sm text-blue-100">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          isUserOnline(activeChat.participants?.find(p => p._id !== user.id)?._id)
                            ? "bg-green-400 animate-pulse"
                            : "bg-slate-400"
                        }`}></span>
                        <span className="font-medium">
                          {isUserOnline(activeChat.participants?.find(p => p._id !== user.id)?._id)
                            ? "Online"
                            : "Offline"}
                        </span>
                      </div>
                    )}
                    {activeChat?.isGroupChat && (
                      <p className="text-sm font-medium text-blue-100">{activeChat.participants.length} members</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => toast({ title: "Voice call feature coming soon", type: "info" })}
                    className="p-3 text-white transition-all bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 hover:scale-110"
                    title="Voice Call"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => toast({ title: "Video call feature coming soon", type: "info" })}
                    className="p-3 text-white transition-all bg-green-500 rounded-full shadow-lg hover:bg-green-600 hover:scale-110"
                    title="Video Call"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => {
                      setChatToClear(activeChat);
                      setClearChatModalOpen(true);
                    }}
                    className="p-3 text-white transition-all rounded-full shadow-lg bg-slate-700 hover:bg-slate-600 hover:scale-110"
                    title="Clear Chat"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                  {activeChat.isGroupChat && (
                    <>
                      <Button
                        onClick={() => setShowGroupInfoModal(true)}
                        variant="ghost"
                        className="p-3 text-white transition-all rounded-full hover:bg-slate-700"
                      >
                        <Users className="w-5 h-5" />
                        <span className="ml-1.5 text-sm font-medium">{activeChat.participants.length}</span>
                      </Button>
                      {activeChat.groupAdmin === user.id && (
                        <Button
                          onClick={() => setShowGroupManageModal(true)}
                          className="p-3 text-white transition-all bg-orange-500 rounded-full shadow-lg hover:bg-orange-600 hover:scale-110"
                          title="Manage Group"
                        >
                          <Settings className="w-5 h-5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto premium-chat-messages bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-800" onClick={closeContextMenu} style={{scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent'}}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No messages yet</p>
                    <p className="mt-1 text-xs">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender._id === user.id ? "justify-end" : "justify-start"} group`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                >
                  {editingMessage?._id === msg._id ? (
                    <div className="max-w-[60%] bg-white border-2 border-blue-500 rounded-2xl p-4 shadow-lg">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                        className="mb-3 border-0 bg-slate-100"
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveEdit} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5">Save</Button>
                        <Button onClick={() => setEditingMessage(null)} variant="ghost" className="text-xs">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[60%] flex gap-2 items-end relative group/msg">
                      {msg.sender._id !== user.id && activeChat.isGroupChat && (
                        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-xs font-semibold text-white rounded-full bg-slate-300">
                          {msg.sender.name?.[0] || "?"}
                        </div>
                      )}
                      <div className="flex-1">
                        <div
                          className={`premium-message-bubble relative ${
                            msg.sender._id === user.id
                              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-br-md shadow-lg hover:shadow-xl"
                              : "bg-slate-200 text-slate-900 rounded-3xl rounded-bl-md shadow-md hover:shadow-lg"
                          } px-5 py-3 transition-all`}
                        >
                          {msg.sender._id !== user.id && activeChat.isGroupChat && (
                            <p className="mb-1 text-xs font-semibold opacity-80">{msg.sender.name}</p>
                          )}
                          {msg.fileUrl && msg.fileType?.startsWith("audio") ? (
                            <AudioPlayer src={msg.fileUrl} isSender={msg.sender._id === user.id} />
                          ) : msg.fileUrl && msg.fileType?.startsWith("image") ? (
                            <div className="space-y-2">
                              <img 
                                src={msg.fileUrl} 
                                alt="Shared image" 
                                className="max-w-xs transition-opacity shadow-md cursor-pointer rounded-xl hover:opacity-90"
                                onClick={() => setFullImageView(msg.fileUrl)}
                              />
                              {msg.content !== "📷 Image" && (
                                <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-1.5 mt-2 text-xs ${msg.sender._id === user.id ? "text-blue-100" : "text-slate-500"}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                            {msg.sender._id === user.id && (
                              <span className="flex gap-0.5">
                                <Check className="w-3.5 h-3.5" />
                                <Check className="w-3.5 h-3.5 -ml-1.5" />
                              </span>
                            )}
                            {msg.updatedAt !== msg.createdAt && <span className="opacity-70">(edited)</span>}
                          </div>
                        </div>
                      </div>
                      {/* Hover Menu */}
                      <div className="relative flex-shrink-0 transition-opacity duration-300 opacity-0 group-hover/msg:opacity-100">
                        <button
                          onClick={() => setMessageMenuOpen(messageMenuOpen === msg._id ? null : msg._id)}
                          className="flex items-center justify-center p-2 transition-all duration-200 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Message options"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                        </button>
                        {messageMenuOpen === msg._id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMessageMenuOpen(null)} />
                            <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-600 py-2 z-50 min-w-[160px] animate-in fade-in duration-200">
                              <button
                                onClick={() => copyMessageText(msg.content)}
                                className="flex items-center w-full gap-3 px-4 py-2 text-sm text-left transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-900 dark:text-white"
                                title="Copy message text"
                              >
                                <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium">Copy</span>
                              </button>
                              {msg.sender._id === user.id && (
                                <button
                                  onClick={() => openDeleteModal(msg)}
                                  className="flex items-center w-full gap-3 px-4 py-2 text-sm text-left text-red-600 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="font-medium">Delete</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-5 bg-white border-t shadow-lg premium-chat-input dark:bg-gray-800 border-slate-200 dark:border-gray-700">
              {showEmojiPicker && (
                <div className="p-4 mb-4 border shadow-lg bg-slate-50 dark:bg-gray-700 border-slate-200 dark:border-gray-600 rounded-2xl">
                  <div className="flex flex-wrap gap-2">
                    {emojis.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => addEmoji(emoji)}
                        className="text-2xl hover:scale-125 transition-transform p-1.5 hover:bg-white rounded-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {imagePreview && (
                <div className="relative inline-block mb-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="border-2 border-blue-500 shadow-lg max-h-32 rounded-xl"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all flex-shrink-0"
                  title="Attach Image"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all flex-shrink-0"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="w-full px-5 py-3 transition-all border-0 rounded-full bg-slate-100 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 placeholder-slate-400 dark:placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse shadow-lg hover:bg-red-600 scale-110" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={sendMessage}
                  className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex-shrink-0 transform hover:scale-110"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-slate-400 dark:text-gray-500 bg-gradient-to-br from-white to-slate-50 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation to start</p>
              <p className="mt-1 text-sm text-slate-300">Choose a chat from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {/* Group Modal */}
      <GroupChatModal 
        isOpen={showGroupModal} 
        onClose={() => setShowGroupModal(false)}
        onGroupCreated={onGroupCreated}
      />

      {/* Profile Modal */}
      {showProfileModal && profileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="p-8 bg-white border shadow-2xl premium-modal w-96 rounded-2xl border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Profile</h3>
              <Button onClick={() => setShowProfileModal(false)} variant="ghost" className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4 text-center">
              {profileUser.profileImageUrl ? (
                <img 
                  src={profileUser.profileImageUrl} 
                  alt={profileUser.name} 
                  className="object-cover w-32 h-32 mx-auto rounded-full shadow-lg ring-4 ring-blue-200"
                />
              ) : (
                <div className="flex items-center justify-center w-32 h-32 mx-auto text-5xl font-bold text-white rounded-full shadow-lg bg-gradient-to-br from-slate-700 to-slate-900 ring-4 ring-slate-200">
                  {profileUser.name?.[0] || "?"}
                </div>
              )}
              <div>
                <h4 className="text-2xl font-bold text-slate-900">{profileUser.name}</h4>
                <p className="mt-1 text-sm text-slate-600">{profileUser.email}</p>
                <div className="inline-block px-3 py-1 mt-3 text-xs font-semibold tracking-wider text-blue-700 uppercase bg-blue-100 rounded-full">
                  {profileUser.role}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => toast({ title: "Call feature coming soon", type: "info" })}
                  className="flex items-center justify-center flex-1 gap-2 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </Button>
                <Button
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfoModal && activeChat?.isGroupChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="premium-modal w-96 max-h-[80vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Group Info</h3>
              <Button onClick={() => setShowGroupInfoModal(false)} variant="ghost" className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="text-center">
                <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 text-3xl font-bold text-white rounded-full bg-gradient-to-br from-blue-500 to-blue-700 ring-4 ring-blue-100">
                  <Users className="w-12 h-12" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">{activeChat.name}</h4>
                <p className="inline-block px-3 py-1 mt-2 text-sm rounded-full text-slate-600 bg-slate-100">{activeChat.participants.length} members</p>
              </div>
              <div className="pt-5 border-t border-slate-200">
                <h5 className="mb-4 text-sm font-bold tracking-wide uppercase text-slate-900">Members</h5>
                <div className="space-y-3 overflow-y-auto max-h-64">
                  {activeChat.participants.map(member => (
                    <div key={member._id} className="flex items-center gap-3 p-3 transition-colors border border-transparent rounded-lg hover:bg-slate-50 hover:border-slate-200">
                      {member.profileImageUrl ? (
                        <img 
                          src={member.profileImageUrl} 
                          alt={member.name} 
                          className="object-cover rounded-full w-11 h-11 ring-2 ring-slate-200"
                        />
                      ) : (
                        <div className="flex items-center justify-center text-sm font-bold text-white rounded-full w-11 h-11 bg-gradient-to-br from-slate-700 to-slate-900 ring-2 ring-slate-200">
                          {member.name?.[0] || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {member.name}
                          {member._id === user.id && <span className="ml-2 text-xs font-medium text-blue-600">(You)</span>}
                        </p>
                        <p className="text-xs truncate text-slate-500">{member.email}</p>
                      </div>
                      <span className="text-xs text-blue-600 font-bold uppercase bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Message Info Modal */}
      {showMessageInfoModal && messageInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="p-6 bg-white border shadow-2xl premium-modal w-96 rounded-2xl border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Message Info</h3>
              <Button onClick={() => setShowMessageInfoModal(false)} variant="ghost" className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-5">
              <div className="p-4 border bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 rounded-xl">
                <p className="text-sm leading-relaxed text-slate-700">{messageInfo.content}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-slate-50">
                  <span className="font-bold text-slate-700">Sent:</span>
                  <span className="text-slate-600">{new Date(messageInfo.sentAt).toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-slate-300">
                  <p className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700">
                    <Check className="w-4 h-4 text-green-600" />
                    Read by {messageInfo.readBy.length} member(s)
                  </p>
                  <div className="space-y-2 overflow-y-auto max-h-48">
                    {messageInfo.readBy.map(user => (
                      <div key={user._id} className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-slate-50 border-slate-200">
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt={user.name} className="object-cover rounded-full w-9 h-9 ring-2 ring-slate-200" />
                        ) : (
                          <div className="flex items-center justify-center text-xs font-bold text-white rounded-full w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 ring-2 ring-slate-200">
                            {user.name?.[0] || "?"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                          <p className="text-xs truncate text-slate-500">{user.email}</p>
                        </div>
                        <div className="flex gap-0.5 text-green-600 flex-shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <Check className="w-3.5 h-3.5 -ml-1.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encryption Settings Modal */}

      {/* Delete Message Modal */}
      {deleteModalOpen && messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="p-6 bg-white border shadow-2xl rounded-2xl border-slate-200 w-96">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Delete Message</h3>
            <p className="mb-6 text-sm text-slate-600">Choose how you want to delete this message:</p>
            <div className="space-y-3">
              <Button
                onClick={() => deleteMessage(false)}
                className="flex items-center justify-center w-full gap-2 py-3 text-white rounded-lg bg-slate-600 hover:bg-slate-700"
              >
                <Trash2 className="w-4 h-4" /> Delete for Me
              </Button>
              <Button
                onClick={() => deleteMessage(true)}
                className="flex items-center justify-center w-full gap-2 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" /> Delete for Everyone
              </Button>
              <Button
                onClick={() => setDeleteModalOpen(false)}
                variant="ghost"
                className="w-full py-3 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      <ClearChatConfirmationModal
        isOpen={clearChatModalOpen}
        onClose={() => {
          setClearChatModalOpen(false);
          setChatToClear(null);
        }}
        onConfirm={() => chatToClear && clearChat(chatToClear._id)}
        chatName={chatToClear?.isGroupChat ? chatToClear?.name : chatToClear?.participants?.find(p => p._id !== user.id)?.name || "Unknown"}
        isLoading={isClearingChat}
      />

      {/* Delete Conversation Modal */}
      <DeleteConversationModal
        isOpen={deleteConversationModalOpen}
        onClose={() => {
          setDeleteConversationModalOpen(false);
          setConversationToDelete(null);
        }}
        onConfirm={() => conversationToDelete && deleteConversation(conversationToDelete._id)}
        chatName={conversationToDelete?.isGroupChat ? conversationToDelete?.name : conversationToDelete?.participants?.find(p => p._id !== user.id)?.name || "Unknown"}
        isLoading={isDeletingConversation}
      />

      {/* Full Image View Modal */}
      {fullImageView && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setFullImageView(null)}
        >
          <button
            onClick={() => setFullImageView(null)}
            className="absolute p-3 text-white transition-all rounded-full top-4 right-4 bg-white/10 hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullImageView} 
            alt="Full view" 
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupManageModal && activeChat?.isGroupChat && activeChat.groupAdmin === user.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="p-6 bg-white border shadow-2xl premium-modal w-96 rounded-2xl border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900">Manage Group</h3>
              <Button onClick={() => setShowGroupManageModal(false)} variant="ghost" className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Group Name</label>
                <div className="flex gap-2">
                  <Input
                    value={groupName || activeChat?.name || ''}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="flex-1 border-0 bg-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={() => updateGroup('rename', { name: groupName || activeChat?.name })}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Update
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Add Members</label>
                <Input
                  placeholder="Search users to add..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="border-0 bg-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                {searchResults.length > 0 && (
                  <div className="p-2 mt-2 space-y-1 overflow-y-auto rounded-lg max-h-32 bg-slate-50">
                    {searchResults.filter(u => !activeChat?.participants?.find(p => p._id === u._id)).map(u => (
                      <div
                        key={u._id}
                        onClick={() => updateGroup('add', { userId: u._id })}
                        className="flex items-center justify-between p-2 transition-colors rounded-lg cursor-pointer hover:bg-slate-200"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <Plus className="w-4 h-4 text-blue-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
