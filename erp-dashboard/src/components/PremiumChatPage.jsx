import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { getSocket } from "../../lib/socket.js";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { encryptMessage, decryptMessage, isEncrypted } from "../../lib/encryption.js";
import { MessageCircle, Send, Search, Users, Plus, Smile, Mic, Phone, Video, Lock, Check, CheckCheck, Sun, Moon, MoreVertical, Edit2, Trash2, X } from "lucide-react";
import Input from "../../components/ui/Input.jsx";
import AudioPlayer from "./AudioPlayer.jsx";

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
      
      return () => {
        socket.off("new_message");
        socket.off("user_typing");
        socket.off("user_stop_typing");
        socket.off("user_online");
        socket.off("user_offline");
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const emojis = ["ðŸ˜€", "ðŸ˜‚", "ðŸ˜", "ðŸ¥°", "ðŸ˜Ž", "ðŸ¤”", "ðŸ‘", "ðŸ‘", "ðŸ™", "â¤ï¸", "ðŸ”¥", "âœ¨", "ðŸŽ‰", "ðŸ’¯", "ðŸ‘Œ", "âœ…"];

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
    if (message.chatId === activeChat?._id) {
      const decryptedMessage = {
        ...message,
        content: isEncrypted(message.content) ? decryptMessage(message.content, message.chatId) : message.content
      };
      setMessages(prev => [...prev, decryptedMessage]);
    }
    loadChats();
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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`h-[calc(100vh-120px)] flex ${isDarkMode ? 'dark' : ''}`}>
      {/* Security Badge */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg">
        <Lock className="w-4 h-4" />
        End-to-End Encrypted
      </div>

      {/* Sidebar */}
      <div className="w-80 flex flex-col bg-slate-50 dark:bg-brand-card border-r border-slate-200 dark:border-slate-800">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h2>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full transition-all hover:scale-110 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Button
                onClick={() => setShowNewChat(!showNewChat)}
                className="p-2.5 rounded-full transition-all hover:scale-110 bg-brand-accent text-white"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500 dark:text-slate-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 rounded-full border-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          
          {showNewChat && (
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="rounded-full border-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg p-2 bg-white dark:bg-slate-900">
                  {searchResults.map(u => (
                    <div
                      key={u._id}
                      onClick={() => startChat(u._id)}
                      className="p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80 bg-slate-100 dark:bg-slate-800"
                    >
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{u.name}</p>
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
                  onClick={() => selectChat(chat)}
                  className={`px-4 py-4 cursor-pointer transition-all hover:opacity-80 ${
                    activeChat?._id === chat._id ? 'border-l-4 bg-slate-100 dark:bg-slate-800 border-l-blue-500' : 'border-b border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {chat.isGroupChat ? (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                          <Users className="w-6 h-6" />
                        </div>
                      ) : (
                        otherUser?.profileImageUrl ? (
                          <img 
                            src={otherUser.profileImageUrl} 
                            alt="Profile" 
                            className="w-12 h-12 rounded-full object-cover shadow-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-semibold shadow-lg">
                            {otherUser?.name?.[0] || "?"}
                          </div>
                        )
                      )}
                      {!chat.isGroupChat && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-lg ${
                          isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        } border-slate-50 dark:border-brand-card`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                          {chat.isGroupChat ? chat.name : otherUser?.name || "Unknown"}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate text-slate-600 dark:text-slate-400">
                        {chat.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {activeChat ? (
          <>
            {/* Premium Header */}
            <div className="px-6 py-4 shadow-lg bg-slate-50 dark:bg-brand-card border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {activeChat.isGroupChat ? (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        <Users className="w-6 h-6" />
                      </div>
                    ) : (
                      activeChat.participants?.find(p => p._id !== user.id)?.profileImageUrl ? (
                        <img 
                          src={activeChat.participants.find(p => p._id !== user.id).profileImageUrl} 
                          alt="Profile" 
                          className="w-12 h-12 rounded-full object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold shadow-lg">
                          {activeChat.participants?.find(p => p._id !== user.id)?.name?.[0] || "?"}
                        </div>
                      )
                    )}
                    {!activeChat.isGroupChat && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-lg ${
                        isUserOnline(activeChat.participants?.find(p => p._id !== user.id)?._id)
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      } border-slate-50 dark:border-brand-card`}></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {activeChat.isGroupChat 
                        ? activeChat.name 
                        : activeChat.participants?.find(p => p._id !== user.id)?.name || "Unknown"}
                    </h3>
                    {typing && (
                      <p className="text-sm animate-pulse text-brand-accent">
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
                  <button
                    onClick={() => toast({ title: "Voice call feature coming soon", type: "info" })}
                    className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                    title="Voice Call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => toast({ title: "Video call feature coming soon", type: "info" })}
                    className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                    title="Video Call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4" onClick={closeContextMenu}>
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
                    <div className="max-w-[70%] flex gap-2 items-end">
                      <div>
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
                        {msg.sender._id === user.id && (
                          <button
                            onClick={(e) => handleContextMenu(e, msg)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-full transition-all ml-2 mt-1"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </button>
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
                <div className="mb-4 p-4 rounded-2xl shadow-lg bg-slate-100 dark:bg-slate-800">
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
              <div className="flex gap-3 items-end">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-3 rounded-full transition-all hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="w-full rounded-full px-5 py-3 border-0 focus:ring-2 focus:ring-blue-500 transition-all bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation to start</p>
              <p className="text-sm mt-1 opacity-70">Choose a chat from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div 
            className="fixed bg-white dark:bg-brand-card shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 py-2 z-50 min-w-[180px] overflow-hidden"
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y
            }}
          >
            <button
              onClick={startEdit}
              className="w-full px-4 py-3 text-left text-sm hover:opacity-80 flex items-center gap-3 transition-colors font-medium text-slate-900 dark:text-white"
            >
              <Edit2 className="w-4 h-4 text-blue-600" /> Edit
            </button>
            <button
              onClick={deleteMessage}
              className="w-full px-4 py-3 text-left text-sm hover:opacity-80 flex items-center gap-3 text-red-600 transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
