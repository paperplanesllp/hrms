import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { getSocket } from "../../lib/socket.js";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { encryptMessage, decryptMessage, isEncrypted } from "../../lib/encryption.js";
import { MessageCircle, Send, Search, Users, Plus, Smile, Mic, Phone, Video, Lock, Check, CheckCheck, Sun, Moon, MoreVertical, Edit2, Trash2, X, Settings, Copy } from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import AudioPlayer from "./AudioPlayer.jsx";
import GroupCreationModal from "./GroupCreationModal.jsx";
import GroupManagementModal from "./GroupManagementModal.jsx";
import ClearChatConfirmationModal from "./ClearChatConfirmationModal.jsx";
import DeleteConversationModal from "./DeleteConversationModal.jsx";

export default function PremiumChatPage() {
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
  const [userOnlineStatus, setUserOnlineStatus] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const [chatToClear, setChatToClear] = useState(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(null);
  const [deleteConversationModalOpen, setDeleteConversationModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadChats();
    
    if (socket) {
      socket.on("new_message", handleNewMessage);
      socket.on("user_typing", () => setTyping(true));
      socket.on("user_stop_typing", () => setTyping(false));
      socket.on("user_online", (userData) => {
        setUserOnlineStatus(prev => ({ ...prev, [userData.userId]: "online" }));
      });
      socket.on("user_offline", (userData) => {
        setUserOnlineStatus(prev => ({ ...prev, [userData.userId]: "offline" }));
      });
      socket.on("group_updated", handleGroupUpdate);
      socket.on("group_member_added", handleGroupUpdate);
      socket.on("group_member_removed", handleGroupUpdate);
      socket.on("group_renamed", handleGroupUpdate);
      
      return () => {
        socket.off("new_message");
        socket.off("user_typing");
        socket.off("user_stop_typing");
        socket.off("user_online");
        socket.off("user_offline");
        socket.off("group_updated");
        socket.off("group_member_added");
        socket.off("group_member_removed");
        socket.off("group_renamed");
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const emojis = ["😀", "😂", "😍", "🥰", "😎", "🤔", "👍", "👏", "🙏", "❤️", "🔥", "✨", "🎉", "💯", "👌", "✅"];

  const isUserOnline = (userId) => userOnlineStatus[userId] === "online";

  const loadChats = async () => {
    try {
      const res = await api.get("/chat");
      setChats(res.data || []);
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}/messages`);
      const decryptedMessages = (res.data || []).map(msg => ({
        ...msg,
        content: isEncrypted(msg.content) ? decryptMessage(msg.content, chatId) : msg.content
      }));
      setMessages(decryptedMessages);
      socket?.emit("join_chat", chatId);
      await api.put(`/chat/${chatId}/read`);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleNewMessage = (message) => {
    if (message.chatId && activeChat && message.chatId.toString() === activeChat._id.toString()) {
      const decryptedMessage = {
        ...message,
        content: isEncrypted(message.content) ? decryptMessage(message.content, message.chatId) : message.content
      };
      setMessages(prev => [...prev, decryptedMessage]);
    }
    loadChats();
  };

  const handleGroupUpdate = (updateData) => {
    // Refresh chats to get updated group info
    loadChats();
    toast({ title: "Group updated", type: "info" });
  };

  const selectChat = (chat) => {
    if (activeChat) socket?.emit("leave_chat", activeChat._id);
    setActiveChat(chat);
    loadMessages(chat._id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    
    try {
      const encryptedContent = encryptMessage(newMessage, activeChat._id);
      const res = await api.post(`/chat/${activeChat._id}/messages`, {
        content: encryptedContent,
        isEncrypted: true
      });
      
      setMessages(prev => [...prev, {
        ...res.data,
        content: decryptMessage(res.data.content, activeChat._id)
      }]);
      
      setNewMessage("");
      socket?.emit("stop_typing", { chatId: activeChat._id, isGroupChat: activeChat.isGroupChat });
    } catch (err) {
      toast({ title: "Failed to send message", type: "error" });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!activeChat) return;
    
    socket?.emit("typing", { chatId: activeChat._id, userName: user.name, isGroupChat: activeChat.isGroupChat });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stop_typing", { chatId: activeChat._id, isGroupChat: activeChat.isGroupChat });
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

  const handleGroupCreated = (newGroup) => {
    setChats(prev => [newGroup, ...prev]);
    selectChat(newGroup);
    socket?.emit("join_group", newGroup._id);
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
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
        const encryptedContent = encryptMessage("Voice message", activeChat._id);
        formData.append("content", encryptedContent);
        formData.append("isEncrypted", true);
        
        try {
          const res = await api.post(`/chat/${activeChat._id}/messages`, formData);
          setMessages(prev => [...prev, {
            ...res.data,
            content: decryptMessage(res.data.content, activeChat._id)
          }]);
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
      }, 60000);
      
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

  const handleContextMenu = (e, msg) => {
    if (msg.sender._id !== user.id) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const closeContextMenu = () => setContextMenu(null);

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

  const deleteMessage = async () => {
    try {
      await api.delete(`/chat/messages/${contextMenu.message._id}`);
      setMessages(prev => prev.filter(m => m._id !== contextMenu.message._id));
      closeContextMenu();
      toast({ title: "Message deleted", type: "success" });
    } catch (err) {
      toast({ title: "Failed to delete message", type: "error" });
    }
  };

  const copyMessageText = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Message copied to clipboard", type: "success" });
    setMessageMenuOpen(null);
  };

  const openDeleteModal = (msg) => {
    setMessageToDelete(msg);
    setDeleteModalOpen(true);
    setMessageMenuOpen(null);
  };

  const deleteMessageFromModal = async (forEveryone = false) => {
    try {
      await api.delete(`/chat/messages/${messageToDelete._id}?forEveryone=${forEveryone}`);
      setMessages(prev => prev.filter(m => m._id !== messageToDelete._id));
      setDeleteModalOpen(false);
      setMessageToDelete(null);
      setDeleteType(null);
      toast({ title: forEveryone ? "Message deleted for everyone" : "Message deleted for you", type: "success" });
    } catch (err) {
      toast({ title: "Failed to delete message", type: "error" });
    }
  };

  const canDeleteForEveryone = (msg) => {
    const oneHourInMs = 60 * 60 * 1000;
    const messageTime = new Date(msg.createdAt).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - messageTime) < oneHourInMs;
  };

  const startEditMessage = (msg) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
    setMessageMenuOpen(null);
  };

  const clearChat = async (chatId) => {
    setIsClearingChat(true);
    try {
      await api.delete(`/chat/${chatId}/messages`);
      if (activeChat?._id === chatId) {
        setMessages([]);
      }
      setClearChatModalOpen(false);
      setChatToClear(null);
      setShowChatMenu(null);
      toast({ title: "Chat cleared successfully", type: "success" });
    } catch (err) {
      toast({ title: "Failed to clear chat", type: "error" });
    } finally {
      setIsClearingChat(false);
    }
  };

  const deleteConversation = async (chatId) => {
    setIsDeletingConversation(true);
    try {
      await api.delete(`/chat/${chatId}`);
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      setShowChatMenu(null);
      setDeleteConversationModalOpen(false);
      setConversationToDelete(null);
      toast({ title: "Conversation deleted successfully", type: "success" });
    } catch (err) {
      toast({ title: "Failed to delete conversation", type: "error" });
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`h-[calc(100vh-120px)] flex ${isDarkMode ? 'dark' : ''}`}>
      {/* Security Badge */}
      <div className="fixed z-50 flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white transform -translate-x-1/2 bg-green-500 rounded-full shadow-lg top-4 left-1/2">
        <Lock className="w-4 h-4" />
        End-to-End Encrypted
      </div>

      {/* Sidebar */}
      <div className="flex flex-col w-80 bg-slate-50 dark:bg-brand-card border-r border-slate-200 dark:border-slate-800">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h2>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full transition-all hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {showNewChat ? (
                <>
                  <Button
                    onClick={() => setShowGroupCreation(true)}
                    className="p-2.5 rounded-full transition-all hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    title="Create Group"
                  >
                    <Users className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => setShowNewChat(false)}
                    className="p-2.5 rounded-full transition-all hover:scale-110 bg-blue-500 text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowNewChat(!showNewChat)}
                  className="p-2.5 rounded-full transition-all hover:scale-110 bg-blue-500 text-white"
                  title="New Chat"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-5 h-5 left-3 top-3 text-slate-600 dark:text-slate-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 border-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          
          {showNewChat && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">START 1-ON-1 CHAT</p>
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="border-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              {searchResults.length > 0 && (
                <div className="p-2 space-y-1 overflow-y-auto rounded-lg max-h-48 bg-white dark:bg-slate-900">
                  {searchResults.map(u => (
                    <div
                      key={u._id}
                      onClick={() => startChat(u._id)}
                      className="p-3 transition-colors rounded-lg cursor-pointer hover:opacity-80 bg-slate-100 dark:bg-slate-800"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{u.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 dark:text-slate-400">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            </div>
          ) : (
            chats.map(chat => {
              const otherUser = chat.participants?.find(p => p._id !== user.id);
              const isOnline = isUserOnline(otherUser?._id);
              
              return (
                <div
                  key={chat._id}
                  className={`px-4 py-4 cursor-pointer transition-all hover:opacity-80 group/chat ${
                    activeChat?._id === chat._id ? 'border-l-4 bg-slate-100 dark:bg-slate-800 border-l-blue-500' : 'border-b border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative" onClick={() => selectChat(chat)}>
                      {chat.isGroupChat ? (
                        <div className="flex items-center justify-center w-12 h-12 font-semibold text-white rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-600">
                          <Users className="w-6 h-6" />
                        </div>
                      ) : (
                        otherUser?.profileImageUrl ? (
                          <img 
                            src={otherUser.profileImageUrl} 
                            alt="Profile" 
                            className="object-cover w-12 h-12 rounded-full shadow-lg"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-12 h-12 font-semibold text-white rounded-full shadow-lg bg-gradient-to-br from-slate-600 to-slate-800">
                            {otherUser?.name?.[0] || "?"}
                          </div>
                        )
                      )}
                      {!chat.isGroupChat && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-lg border-slate-50 dark:border-brand-card ${
                          isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        }`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => selectChat(chat)}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm max-w-[150px] truncate text-slate-900 dark:text-white">
                          {chat.isGroupChat ? chat.name : otherUser?.name || "Unknown"}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs max-w-[150px] whitespace-nowrap overflow-hidden text-ellipsis text-slate-600 dark:text-slate-400">
                        {chat.lastMessage?.content 
                          ? (isEncrypted(chat.lastMessage.content) 
                              ? decryptMessage(chat.lastMessage.content, chat._id)
                              : chat.lastMessage.content)
                          : "No messages yet"}
                      </p>
                    </div>
                    <div className="relative flex-shrink-0 transition-opacity opacity-0 group-hover/chat:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowChatMenu(showChatMenu === chat._id ? null : chat._id);
                        }}
                        className="p-2 transition-all rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        title="Chat Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {showChatMenu === chat._id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(null)} />
                          <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-slate-200 dark:border-gray-600 py-2 z-50 min-w-[160px] bg-slate-50 dark:bg-brand-card border-slate-200 dark:border-slate-800">
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
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex flex-col flex-1 bg-white dark:bg-slate-900">
        {activeChat ? (
          <>
            {/* Premium Header */}
            <div className="px-6 py-4 shadow-lg bg-slate-50 dark:bg-brand-card border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {activeChat.isGroupChat ? (
                      <div className="flex items-center justify-center w-12 h-12 font-bold text-white rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-600">
                        <Users className="w-6 h-6" />
                      </div>
                    ) : (
                      activeChat.participants?.find(p => p._id !== user.id)?.profileImageUrl ? (
                        <img 
                          src={activeChat.participants.find(p => p._id !== user.id).profileImageUrl} 
                          alt="Profile" 
                          className="object-cover w-12 h-12 rounded-full shadow-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-12 h-12 font-bold text-white rounded-full shadow-lg bg-gradient-to-br from-slate-600 to-slate-800">
                          {activeChat.participants?.find(p => p._id !== user.id)?.name?.[0] || "?"}
                        </div>
                      )
                    )}
                    {!activeChat.isGroupChat && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-lg border-slate-50 dark:border-brand-card ${
                        isUserOnline(activeChat.participants?.find(p => p._id !== user.id)?._id)
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      }`}></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeChat.isGroupChat 
                        ? activeChat.name 
                        : activeChat.participants?.find(p => p._id !== user.id)?.name || "Unknown"}
                    </h3>
                    {typing && (
                      <p className="text-sm animate-pulse text-blue-500 dark:text-blue-400">
                        typing...
                      </p>
                    )}
                    {!typing && !activeChat.isGroupChat && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          isUserOnline(activeChat.participants?.find(p => p._id !== user.id)?._id)
                            ? "bg-green-500 animate-pulse"
                            : "bg-gray-400"
                        }`}></span>
                        <span>
                          {isUserOnline(activeChat.participants?.find(p => p._id !== user.id)?._id)
                            ? "Online"
                            : "Offline"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activeChat.isGroupChat && (
                    <button
                      onClick={() => setShowGroupManagement(true)}
                      className="p-3 text-white transition-all bg-purple-500 rounded-full shadow-lg hover:bg-purple-600 hover:scale-110"
                      title="Group Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => toast({ title: "Voice call feature coming soon", type: "info" })}
                    className="p-3 text-white transition-all bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 hover:scale-110"
                    title="Voice Call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => toast({ title: "Video call feature coming soon", type: "info" })}
                    className="p-3 text-white transition-all bg-green-500 rounded-full shadow-lg hover:bg-green-600 hover:scale-110"
                    title="Video Call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setChatToClear(activeChat);
                      setClearChatModalOpen(true);
                    }}
                    className="p-3 text-white transition-all rounded-full shadow-lg bg-slate-700 hover:bg-slate-600 hover:scale-110"
                    title="Clear Chat"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto" onClick={closeContextMenu}>
              {messages.map(msg => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender._id === user.id ? "justify-end" : "justify-start"} group`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                >
                  {editingMessage?._id === msg._id ? (
                    <div className="max-w-[70%] bg-white border-2 border-blue-500 rounded-2xl p-4 shadow-lg">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                        className="mb-3"
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveEdit} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5">Save</Button>
                        <Button onClick={() => setEditingMessage(null)} variant="ghost" className="text-xs">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[70%] flex gap-2 items-end group/msg relative">
                      <div className="flex-1">
                        <div
                          className={`relative group/message transition-all shadow-lg hover:shadow-xl ${
                            msg.sender._id === user.id
                              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl rounded-br-lg"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-3xl rounded-bl-lg"
                          } px-5 py-3`}
                        >
                          {msg.fileUrl && msg.fileType?.startsWith("audio") ? (
                            <AudioPlayer src={msg.fileUrl} isSender={msg.sender._id === user.id} />
                          ) : (
                            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                            msg.sender._id === user.id ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                          }`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {msg.sender._id === user.id && (
                              <CheckCheck className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Hover Menu */}
                      <div className="flex-shrink-0 transition-opacity duration-300 opacity-0 group-hover/msg:opacity-100">
                        <button
                          onClick={() => setMessageMenuOpen(messageMenuOpen === msg._id ? null : msg._id)}
                          className="flex items-center justify-center p-2 transition-all duration-200 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          title="Message options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {messageMenuOpen === msg._id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMessageMenuOpen(null)} />
                            <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-600 py-2 z-50 min-w-[160px] animate-in fade-in duration-200 bg-slate-50 dark:bg-brand-card border-slate-200 dark:border-slate-800">
                              {!msg.fileUrl && (
                                <button
                                  onClick={() => copyMessageText(msg.content)}
                                  className="flex items-center w-full gap-3 px-4 py-2 text-sm font-medium text-left transition-colors duration-150 hover:opacity-80 text-slate-900 dark:text-white"
                                  title="Copy message text"
                                >
                                  <Copy className="w-4 h-4 text-blue-500" />
                                  <span>Copy</span>
                                </button>
                              )}
                              {msg.sender._id === user.id && (
                                <>
                                  {!msg.fileUrl && (
                                    <button
                                      onClick={() => startEditMessage(msg)}
                                      className="flex items-center w-full gap-3 px-4 py-2 text-sm font-medium text-left transition-colors duration-150 hover:opacity-80 text-slate-900 dark:text-white"
                                      title="Edit message"
                                    >
                                      <Edit2 className="w-4 h-4 text-green-500" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openDeleteModal(msg)}
                                    className="flex items-center w-full gap-3 px-4 py-2 text-sm font-medium text-left text-red-600 transition-colors duration-150 hover:opacity-80"
                                    title="Delete message"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                  </button>
                                </>
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

            {/* Input Area */}
            <div className="px-6 py-4 shadow-lg bg-slate-50 dark:bg-brand-card border-t border-slate-200 dark:border-slate-800">
              {showEmojiPicker && (
                <div className="p-4 mb-4 shadow-lg rounded-2xl bg-slate-100 dark:bg-slate-800">
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
              <div className="flex items-end gap-3">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-3 transition-all rounded-full hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="w-full px-5 py-3 transition-all border-0 rounded-full focus:ring-2 focus:ring-blue-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 rounded-full transition-all ${
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse shadow-lg scale-110" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-110"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={sendMessage}
                  className="p-3 text-white transition-all transform rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 hover:shadow-xl hover:scale-110"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-slate-600 dark:text-slate-400">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation to start</p>
              <p className="mt-1 text-sm opacity-70">Choose a chat from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Message Modal */}
      {deleteModalOpen && messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="p-6 bg-white border shadow-2xl rounded-2xl border-slate-200 w-96 bg-slate-50 dark:bg-brand-card border-slate-200 dark:border-slate-800">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Delete Message</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Choose how you want to delete this message:</p>
            <div className="space-y-3">
              <Button
                onClick={() => deleteMessageFromModal(false)}
                className="flex items-center justify-center w-full gap-2 py-3 text-white rounded-lg bg-slate-600 hover:bg-slate-700"
              >
                <Trash2 className="w-4 h-4" /> Delete for Me
              </Button>
              {canDeleteForEveryone(messageToDelete) ? (
                <Button
                  onClick={() => deleteMessageFromModal(true)}
                  className="flex items-center justify-center w-full gap-2 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" /> Delete for Everyone
                </Button>
              ) : (
                <div className="flex items-center justify-center w-full gap-2 py-3 text-gray-500 bg-gray-300 rounded-lg cursor-not-allowed" title="Can only delete for everyone within 1 hour">
                  <Trash2 className="w-4 h-4" /> Delete for Everyone (Expired)
                </div>
              )}
              <Button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setMessageToDelete(null);
                }}
                className="w-full py-3 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                variant="ghost"
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

      {/* Group Creation Modal */}
      <GroupCreationModal
        isOpen={showGroupCreation}
        onClose={() => setShowGroupCreation(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Group Management Modal */}
      {activeChat?.isGroupChat && (
        <GroupManagementModal
          isOpen={showGroupManagement}
          onClose={() => setShowGroupManagement(false)}
          group={activeChat}
          isAdmin={activeChat?.groupAdmin?._id === user.id}
          onGroupUpdated={(updatedGroup) => {
            setActiveChat(updatedGroup);
            loadChats();
          }}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
