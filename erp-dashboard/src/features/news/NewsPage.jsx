import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { getSocket } from "../../lib/socket.js";
import { Megaphone, Calendar, User, Shield, Newspaper, Edit2, Trash2, Plus, Clock, Eye, Send, AlertCircle } from "lucide-react";

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // 1. If it's already a full URL, return it
  if (imagePath.startsWith('http')) return imagePath;

  // 2. Convert Windows backslashes (\) to URL forward slashes (/)
  let cleanPath = imagePath.replace(/\\/g, '/');

  // 3. Handle absolute Windows paths (C:\Users\...) 
  // Extract everything from "uploads" onwards
  if (cleanPath.includes('uploads')) {
    const uploadsIndex = cleanPath.indexOf('uploads');
    cleanPath = cleanPath.substring(uploadsIndex);
  }

  // 4. Ensure path starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Return relative path so Vite proxy can intercept it
  // /uploads/news/filename.jpg → proxied to http://localhost:5000/uploads/news/filename.jpg
  return cleanPath;
};

export default function NewsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHR = user?.role === ROLES.HR;
  const socket = getSocket();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unviewedPolicies, setUnviewedPolicies] = useState(new Set());
  const [liveNotifications, setLiveNotifications] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/news");
      setItems(res.data || []);
      
      // Check which policy updates user hasn't viewed
      if (res.data) {
        const unviewed = new Set();
        res.data.forEach(item => {
          if (item.isPolicyUpdate && !item.viewedBy?.includes(user?.id)) {
            unviewed.add(item._id);
          }
        });
        setUnviewedPolicies(unviewed);
      }
    } catch (err) {
      console.error("Error loading news:", err);
      toast({ title: "Failed to load news", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Socket listener for live news updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNews = (newsItem) => {
      console.log("📢 Live news update received:", newsItem);
      setItems((prev) => [newsItem, ...prev]);
      setLiveNotifications((prev) => [
        {
          id: newsItem._id,
          title: "📢 New Update",
          message: `${newsItem.title}`,
          timestamp: Date.now(),
          author: newsItem.createdBy?.name || "HR Team"
        },
        ...prev
      ]);
    };

    const handleNewsDeleted = (newsId) => {
      setItems((prev) => prev.filter((item) => item._id !== newsId));
    };

    socket.on("news_created", handleNewNews);
    socket.on("news_deleted", handleNewsDeleted);

    return () => {
      socket.off("news_created", handleNewNews);
      socket.off("news_deleted", handleNewsDeleted);
    };
  }, [socket]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (liveNotifications.length === 0) return;
    const timer = setTimeout(() => {
      setLiveNotifications((prev) => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [liveNotifications]);

  const markPolicyViewed = async (id) => {
    try {
      await api.post(`/news/${id}/viewed`);
      setUnviewedPolicies(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Error marking policy viewed:", err);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this news?")) return;
    try {
      await api.delete(`/news/${id}`);
      toast({ title: "News deleted", type: "success" });
      
      // Emit socket event for live deletion update
      if (socket) {
        socket.emit("news_deleted", id);
      }
      
      load();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Delete failed", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Separate hero (latest) from grid items (older)
  const heroNews = items.length > 0 ? items[0] : null;
  const gridNews = items.slice(1);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Live Notifications */}
      {liveNotifications.length > 0 && (
        <div className="fixed top-6 right-6 z-50 space-y-3 max-w-sm">
          {liveNotifications.map((notif) => (
            <Card
              key={notif.id}
              className="p-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500/50 shadow-lg animate-slideDown"
            >
              <div className="flex items-start gap-3">
                <Send className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-100">{notif.title}</p>
                  <p className="text-sm text-emerald-200 truncate">{notif.message}</p>
                  <p className="text-xs text-emerald-300/70 mt-1">from {notif.author}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-main)] mb-2">News & Updates</h1>
          <p className="text-[var(--text-muted)] text-lg">Stay connected with the latest company announcements</p>
        </div>
        {isHR && (
          <Button
            onClick={() => navigate("/news-studio")}
            className="bg-[var(--eucalyptus)] hover:bg-[var(--clay)] text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Create News
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-20 text-center bg-gradient-to-br from-[var(--pistachio)] to-[var(--peach)] border-0">
          <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 rounded-full bg-white/20">
            <Newspaper className="w-12 h-12 text-[var(--text-main)] opacity-60" />
          </div>
          <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">No Updates Yet</h3>
          <p className="text-[var(--text-muted)] text-lg">Check back soon for the latest company news!</p>
        </Card>
      ) : (
        <>
          {/* Featured News - Latest */}
          {heroNews && (
            <div className="relative overflow-hidden rounded-[3rem] aspect-video lg:aspect-auto lg:h-[500px]">
              {heroNews.imageUrl ? (
                <>
                  <img
                    src={getImageUrl(heroNews.imageUrl)}
                    alt={heroNews.title}
                    className="relative z-10 object-cover w-full h-full"
                    onError={(e) => {
                      // Fallback when image fails to load (404 or other error)
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement?.querySelector('.image-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  <div 
                    className="image-fallback absolute inset-0 z-10 items-center justify-center bg-[#242B1E]" 
                    style={{ display: 'none' }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Megaphone className="w-24 h-24 text-white/60" />
                      <p className="text-sm text-white/50">Image unavailable</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-[#242B1E] flex items-center justify-center">
                  <Megaphone className="w-24 h-24 text-white/60" />
                </div>
              )}
              
              <div className="absolute inset-0 z-30 flex flex-col justify-end p-8 lg:p-12">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl">
                      <Megaphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <Badge className="mb-2 text-white bg-white/20 border-white/30">
                        Featured News
                      </Badge>
                      {heroNews.isPolicyUpdate && (
                        <Badge className="text-red-200 bg-red-500/20 border-red-400/30">
                          <Shield className="w-3 h-3 mr-1" />
                          Policy Update
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isHR && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/news-studio?edit=${heroNews._id}`)}
                        className="p-2 text-white bg-white/10 hover:bg-white/20 border-white/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => remove(heroNews._id)}
                        className="p-2 text-red-200 bg-red-500/20 hover:bg-red-500/30 border-red-400/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <h1 className="mb-4 text-4xl font-bold leading-tight text-white lg:text-5xl">{heroNews.title}</h1>
                <p className="mb-6 text-xl leading-relaxed text-gray-200">{heroNews.body}</p>
                
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {new Date(heroNews.publishDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{heroNews.createdBy?.name || "HR Team"}</span>
                  </div>
                </div>
                
                {heroNews.isPolicyUpdate && unviewedPolicies.has(heroNews._id) && (
                  <div className="mt-6">
                    <Button
                      onClick={() => markPolicyViewed(heroNews._id)}
                      className="bg-white text-[var(--eucalyptus)] hover:bg-white/90 font-semibold px-6 py-3 rounded-xl"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Mark as Viewed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Updates Grid */}
          {gridNews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-[var(--text-main)]">Recent Updates</h2>
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{gridNews.length} updates</span>
                </div>
              </div>
              
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {gridNews.map((item) => (
                  <Card
                    key={item._id}
                    className="overflow-hidden transition-all duration-500 bg-white border-0 shadow-lg group hover:shadow-2xl hover:-translate-y-2"
                  >
                    {/* Header with Image/Icon */}
                    <div className="relative h-48 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={getImageUrl(item.imageUrl)}
                          alt={item.title}
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--pistachio)] to-[var(--peach)] flex items-center justify-center">
                          <Megaphone className="w-16 h-16 text-white/80" />
                        </div>
                      )}
                      
                      {/* Overlay Badges */}
                      <div className="absolute top-4 left-4">
                        {item.isPolicyUpdate && (
                          <Badge className="text-white bg-red-500 border-0 shadow-lg">
                            <Shield className="w-3 h-3 mr-1" />
                            Policy
                          </Badge>
                        )}
                      </div>
                      
                      {/* Action Buttons Overlay */}
                      {isHR && (
                        <div className="absolute flex gap-2 transition-opacity duration-300 opacity-0 top-4 right-4 group-hover:opacity-100">
                          <Button
                            onClick={() => navigate(`/news-studio?edit=${item._id}`)}
                            className="bg-white/90 hover:bg-white text-[var(--eucalyptus)] p-2 rounded-xl shadow-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => remove(item._id)}
                            className="p-2 text-white shadow-lg bg-red-500/90 hover:bg-red-500 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-[var(--text-main)] mb-3 line-clamp-2 group-hover:text-[var(--eucalyptus)] transition-colors">
                        {item.title}
                      </h3>
                      
                      <p className="text-[var(--text-muted)] mb-4 line-clamp-3 leading-relaxed">
                        {item.body}
                      </p>
                      
                      {/* Meta Information */}
                      <div className="flex items-center justify-between text-sm text-[var(--text-muted)] mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(item.publishDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric"
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{item.createdBy?.name || "HR"}</span>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      {item.isPolicyUpdate && unviewedPolicies.has(item._id) && (
                        <Button
                          onClick={() => markPolicyViewed(item._id)}
                          className="w-full bg-[var(--eucalyptus)] hover:bg-[var(--clay)] text-white font-semibold py-3 rounded-xl transition-all duration-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Mark as Viewed
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}