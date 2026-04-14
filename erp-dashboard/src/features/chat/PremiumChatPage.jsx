import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { usePresenceStore } from "../../store/presenceStore.js";
import { getSocket } from "../../lib/socket.js";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { encryptMessage, decryptMessage, isEncrypted } from "../../lib/encryption.js";
import { getDerivedPresenceStatus, getAvatarDotStyle, sortItemsByPresence, formatExactTimestamp } from "../../lib/presenceUtils.js";
import { MessageCircle, Send, Search, Users, Plus, Smile, Mic, Phone, Video, Lock, Check, CheckCheck, Sun, Moon, MoreVertical, Edit2, Trash2, X, Settings, Copy, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import AudioPlayer from "./AudioPlayer.jsx";
import GroupCreationModal from "./GroupCreationModal.jsx";
import GroupManagementModal from "./GroupManagementModal.jsx";
import ClearChatConfirmationModal from "./ClearChatConfirmationModal.jsx";
import DeleteConversationModal from "./DeleteConversationModal.jsx";
import CallProvider from "./CallProvider.jsx";
import { useCallActions } from "./hooks/useCallActions.js";
import { useCallStore } from "./store/callStore.js";
import { showCallToast } from "./utils/callErrorMap.js";

export default function PremiumChatPage() {
  const user = useAuthStore((s) => s.user);
  const socket = getSocket();
  const { initiateCall } = useCallActions();
  const callStatus = useCallStore((s) => s.callStatus);
  const callBusy = callStatus !== "idle";
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [typing, setTyping] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voicePreview, setVoicePreview] = useState(null);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [voiceUiState, setVoiceUiState] = useState("idle");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const presenceUsers = usePresenceStore(s => s.users);
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
  const typingExpireRef = useRef(null);
  const activeChatRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const autoStopTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const fileInputRef = useRef(null);

  const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
  const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ]);

  const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".gif"
  ]);

  const formatVoiceDuration = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getExtension = (fileName = "") => {
    const dot = fileName.lastIndexOf(".");
    return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  };

  const isSupportedAttachment = (file) => {
    if (!file) return false;
    const typeOk = ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type);
    const extensionOk = ALLOWED_ATTACHMENT_EXTENSIONS.has(getExtension(file.name));
    return typeOk || extensionOk;
  };

  const attachmentIsImage = (file) => Boolean(file?.type?.startsWith("image/"));

  const clearVoicePreview = useCallback(() => {
    setVoicePreview((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  }, []);

  const clearAttachmentPreview = useCallback(() => {
    setSelectedAttachment(null);
    setAttachmentPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const cleanupRecorder = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    recordingStartedAtRef.current = null;
  }, []);

  // Keep ref in sync with state so socket handlers see current value
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    return () => {
      clearVoicePreview();
      clearAttachmentPreview();
      cleanupRecorder();
    };
  }, [clearVoicePreview, clearAttachmentPreview, cleanupRecorder]);

  useEffect(() => {
    if (!selectedAttachment || !attachmentIsImage(selectedAttachment)) {
      setAttachmentPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const objectUrl = URL.createObjectURL(selectedAttachment);
    setAttachmentPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedAttachment]);

  useEffect(() => {
    loadChats();
    
    if (socket) {
      const handleTyping = ({ userName, userId }) => {
        setTyping({ userName, userId });
        clearTimeout(typingExpireRef.current);
        typingExpireRef.current = setTimeout(() => setTyping(null), 3000);
      };
      const handleStopTyping = () => {
        clearTimeout(typingExpireRef.current);
        setTyping(null);
      };
      socket.on("new_message", handleNewMessage);
      socket.on("user_typing", handleTyping);
      socket.on("user_stop_typing", handleStopTyping);
      socket.on("group_updated", handleGroupUpdate);
      socket.on("group_member_added", handleGroupUpdate);
      socket.on("group_member_removed", handleGroupUpdate);
      socket.on("group_renamed", handleGroupUpdate);
      
      return () => {
        socket.off("new_message", handleNewMessage);
        socket.off("user_typing", handleTyping);
        socket.off("user_stop_typing", handleStopTyping);
        socket.off("group_updated", handleGroupUpdate);
        socket.off("group_member_added", handleGroupUpdate);
        socket.off("group_member_removed", handleGroupUpdate);
        socket.off("group_renamed", handleGroupUpdate);
        clearTimeout(typingExpireRef.current);
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const emojis = ["😀", "😂", "😍", "🥰", "😎", "🤔", "👍", "👏", "🙏", "❤️", "🔥", "✨", "🎉", "💯", "👌", "✅"];

  const getUserPresence = (userId) => getDerivedPresenceStatus(presenceUsers[userId]);
  const isUserOnline = (userId) => presenceUsers[userId]?.isOnline === true;

  // Sort chats by other participant's presence (online first)
  const sortedChats = useMemo(() =>
    sortItemsByPresence(chats, (chat) => {
      if (chat.isGroupChat) return null;
      const otherId = chat.participants?.find(p => p._id !== user.id)?._id;
      return presenceUsers[otherId];
    }),
    [chats, presenceUsers, user?.id]
  );

  const getPresenceDotClass = (userId) => {
    const { status } = getUserPresence(userId);
    const d = getAvatarDotStyle(status);
    return `${d.bg} ring-2 ${d.ring}${d.pulse ? ' animate-pulse' : ''}`;
  };
  const getPresenceLabel = (userId) => {
    const presence = getUserPresence(userId);
    const data = presenceUsers[userId];
    const rawDate = presence.status === 'offline' ? data?.lastSeen : presence.status === 'away' ? data?.lastActivityAt : null;
    const tooltip = rawDate ? `Last active on ${formatExactTimestamp(rawDate)}` : '';
    if (presence.status === 'offline') {
      const label = presence.lastSeen && presence.lastSeen !== 'never' ? `Last seen ${presence.lastSeen}` : 'Offline';
      return { label, tooltip };
    }
    return { label: presence.label, tooltip };
  };

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
    const currentChat = activeChatRef.current;
    if (message.chatId && currentChat && message.chatId.toString() === currentChat._id.toString()) {
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
    if (selectedAttachment) {
      await sendAttachmentMessage();
      return;
    }

    if (!newMessage.trim() || !activeChat) return;
    
    try {
      const res = await api.post(`/chat/${activeChat._id}/messages`, {
        content: newMessage,
        isEncrypted: false
      });
      
      setMessages(prev => [...prev, res.data]);
      
      setNewMessage("");
      socket?.emit("stop_typing", { chatId: activeChat._id, isGroupChat: activeChat.isGroupChat });
    } catch (err) {
      toast({ title: "Failed to send message", type: "error" });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!activeChat) return;

    if (!e.target.value.trim()) {
      clearTimeout(typingTimeoutRef.current);
      socket?.emit("stop_typing", { chatId: activeChat._id, isGroupChat: activeChat.isGroupChat });
      return;
    }
    
    socket?.emit("typing", { chatId: activeChat._id, userName: user.name, isGroupChat: activeChat.isGroupChat });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stop_typing", { chatId: activeChat._id, isGroupChat: activeChat.isGroupChat });
    }, 2000);
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

  const handleAttachmentSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast({ title: "File too large (max 10 MB)", type: "error" });
      event.target.value = "";
      return;
    }

    if (!isSupportedAttachment(file)) {
      toast({ title: "Unsupported file type. Use PDF, DOC/DOCX, XLS/XLSX, TXT, CSV, or images.", type: "error" });
      event.target.value = "";
      return;
    }

    clearVoicePreview();
    setSelectedAttachment(file);
  };

  const sendAttachmentMessage = async () => {
    if (!selectedAttachment || !activeChat || isSendingAttachment) return;

    const formData = new FormData();
    const fieldName = attachmentIsImage(selectedAttachment) ? "image" : "attachment";
    formData.append(fieldName, selectedAttachment, selectedAttachment.name);
    formData.append("content", newMessage.trim() || `📎 ${selectedAttachment.name}`);
    formData.append("isEncrypted", false);

    try {
      setIsSendingAttachment(true);
      const res = await api.post(`/chat/${activeChat._id}/messages`, formData);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      clearAttachmentPreview();
      socket?.emit("stop_typing", { chatId: activeChat._id, isGroupChat: activeChat.isGroupChat });
    } catch (err) {
      toast({ title: "Failed to upload file. You can retry.", type: "error" });
    } finally {
      setIsSendingAttachment(false);
    }
  };

  const startRecording = async () => {
    if (!activeChat) return;
    if (isSendingVoice) return;

    try {
      clearVoicePreview();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      recordingStartedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size > 0) {
          const elapsedSeconds = recordingStartedAtRef.current
            ? (Date.now() - recordingStartedAtRef.current) / 1000
            : 0;
          const previewUrl = URL.createObjectURL(blob);
          setVoicePreview({
            blob,
            url: previewUrl,
            duration: elapsedSeconds,
          });
          setVoiceUiState("recorded_preview");
        } else {
          setVoiceUiState("idle");
        }
        cleanupRecorder();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceUiState("recording");

      autoStopTimerRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 60000);
    } catch (err) {
      toast({ title: "Microphone access denied", type: "error" });
      cleanupRecorder();
      setVoiceUiState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const discardRecordedVoice = () => {
    clearVoicePreview();
    setVoiceUiState("cancelled");
    requestAnimationFrame(() => setVoiceUiState("idle"));
  };

  const sendRecordedVoice = async () => {
    if (!voicePreview?.blob || !activeChat || isSendingVoice) return;

    const formData = new FormData();
    formData.append("voice", voicePreview.blob, "voice.webm");
    formData.append("content", "Voice message");
    formData.append("isEncrypted", false);

    try {
      setIsSendingVoice(true);
      setVoiceUiState("sending");
      const res = await api.post(`/chat/${activeChat._id}/messages`, formData);
      setMessages((prev) => [...prev, res.data]);
      clearVoicePreview();
      setVoiceUiState("idle");
    } catch (err) {
      toast({ title: "Failed to send voice message. You can retry.", type: "error" });
      setVoiceUiState("recorded_preview");
    } finally {
      setIsSendingVoice(false);
    }
  };

  const getAttachmentIcon = (file) => {
    if (attachmentIsImage(file)) {
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-amber-500" />;
  };

  const handleContextMenu = (e, msg) => {
    if (msg.sender._id !== user.id) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const closeContextMenu = () => setContextMenu(null);

  const startEdit = () => {
    setEditingMessage(contextMenu.message);
    const content = contextMenu.message.content;
    setEditContent(isEncrypted(content) ? decryptMessage(content, activeChat._id) : content);
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
    setEditContent(isEncrypted(msg.content) ? decryptMessage(msg.content, activeChat._id) : msg.content);
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

  const startCall = async (callType) => {
    if (!activeChat || activeChat.isGroupChat) {
      return;
    }

    const targetUser = activeChat.participants?.find((p) => p._id !== user.id);
    if (!targetUser?._id) {
      toast({ title: "Unable to start call", message: "Recipient not found.", type: "error" });
      return;
    }

    const result = await initiateCall(targetUser, activeChat._id, callType);
    if (!result?.ok) {
      showCallToast({
        title: "Call",
        code: result.reason || "SERVER_ERROR",
        type: "info",
      });
    }
  };

  return (
    <CallProvider>
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
            sortedChats.map(chat => {
              const otherUser = chat.participants?.find(p => p._id !== user.id);
              
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
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2px] border-slate-50 dark:border-brand-card transition-colors duration-300 ${getPresenceDotClass(otherUser?._id)}`}></div>
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
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2px] border-slate-50 dark:border-brand-card transition-colors duration-300 ${getPresenceDotClass(activeChat.participants?.find(p => p._id !== user.id)?._id)}`}></div>
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
                        {typing.userName || 'Someone'} is typing...
                      </p>
                    )}
                    {!typing && !activeChat.isGroupChat && (() => {
                      const otherId = activeChat.participants?.find(p => p._id !== user.id)?._id;
                      const { label, tooltip } = getPresenceLabel(otherId);
                      return (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className={`inline-block w-2 h-2 rounded-full ${getPresenceDotClass(otherId)}`}></span>
                          <span className="cursor-default" title={tooltip}>{label}</span>
                        </div>
                      );
                    })()}
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
                    onClick={() => startCall("voice")}
                    disabled={callBusy || activeChat.isGroupChat}
                    className="p-3 text-white transition-all bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title={activeChat.isGroupChat ? "Group voice calls are not supported" : callBusy ? "Already in a call" : "Voice Call"}
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => startCall("video")}
                    disabled={callBusy || activeChat.isGroupChat}
                    className="p-3 text-white transition-all bg-green-500 rounded-full shadow-lg hover:bg-green-600 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title={activeChat.isGroupChat ? "Group video calls are not supported" : callBusy ? "Already in a call" : "Video Call"}
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
                            <AudioPlayer src={msg.fileUrl} isSender={msg.sender._id === user.id} audioId={msg._id || msg.fileUrl} />
                          ) : msg.fileUrl ? (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                msg.sender._id === user.id
                                  ? "border-white/30 bg-white/10 text-white"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100"
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-xs font-medium truncate max-w-[220px]">
                                {msg.fileName || "Attachment"}
                              </span>
                            </a>
                          ) : (
                            <p className="text-sm leading-relaxed break-words">
                              {isEncrypted(msg.content) 
                                ? decryptMessage(msg.content, activeChat._id) 
                                : msg.content}
                            </p>
                          )}
                          <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                            msg.sender._id === user.id ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                          }`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
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
                                  onClick={() => copyMessageText(isEncrypted(msg.content) ? decryptMessage(msg.content, activeChat._id) : msg.content)}
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

              {voicePreview && (
                <div className="mb-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/80 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Voice preview</p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatVoiceDuration(voicePreview.duration)}
                        </span>
                      </div>
                      <AudioPlayer src={voicePreview.url} isSender audioId={`preview-${activeChat?._id || "chat"}`} />
                    </div>
                    <button
                      onClick={discardRecordedVoice}
                      disabled={isSendingVoice}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                      title="Discard"
                    >
                      Discard
                    </button>
                    <button
                      onClick={startRecording}
                      disabled={isSendingVoice}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-60"
                      title="Re-record"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={sendRecordedVoice}
                      disabled={isSendingVoice}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      title="Send voice message"
                    >
                      {isSendingVoice ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {selectedAttachment && (
                <div className="mb-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/80 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    {attachmentPreviewUrl ? (
                      <img
                        src={attachmentPreviewUrl}
                        alt={selectedAttachment.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        {getAttachmentIcon(selectedAttachment)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {selectedAttachment.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatFileSize(selectedAttachment.size)}
                      </p>
                    </div>
                    <button
                      onClick={clearAttachmentPreview}
                      disabled={isSendingAttachment}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                    >
                      Remove
                    </button>
                    <button
                      onClick={sendAttachmentMessage}
                      disabled={isSendingAttachment}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {isSendingAttachment ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {(voiceUiState === "recording" || voiceUiState === "sending") && (
                <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {voiceUiState === "recording" ? "Recording voice note..." : "Sending voice note..."}
                </p>
              )}

              <div className="flex items-end gap-3">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-3 transition-all rounded-full hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleAttachmentSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 transition-all rounded-full hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
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
                  disabled={(Boolean(voicePreview) || Boolean(selectedAttachment)) && !isRecording}
                  className={`p-3 rounded-full transition-all ${
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse shadow-lg scale-110" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-110 disabled:opacity-60 disabled:hover:scale-100"
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
    </CallProvider>
  );
}
