import React, { useState } from "react";
import { MessageCircle, Heart, Reply, Pin, Trash2, Edit2, Users } from "lucide-react";
import api from "../../lib/api.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { toast } from "../../store/toastStore.js";

export default function HRDiscussionPanel({ discussions, onRefresh, onNewDiscussion }) {
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState({});

  const handleReply = async (discussionId, text) => {
    if (!text.trim()) return;
    try {
      await api.post(`/admin/hr-team/discussions/${discussionId}/reply`, {
        text: text
      });
      setReplyText({ ...replyText, [discussionId]: "" });
      toast.success("Reply posted");
      onRefresh();
    } catch (err) {
      toast.error("Failed to post reply");
    }
  };

  const handleDelete = async (discussionId) => {
    if (!confirm("Delete this discussion?")) return;
    try {
      await api.delete(`/admin/hr-team/discussions/${discussionId}`);
      toast.success("Discussion deleted");
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete discussion");
    }
  };

  if (discussions.length === 0) {
    return (
      <Card className="p-12 backdrop-blur-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-white/10 text-center">
        <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No discussions yet</p>
        <Button onClick={onNewDiscussion}>Start a Discussion</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Team Discussions</h3>
        <Button onClick={onNewDiscussion} size="sm" className="gap-2">
          <MessageCircle className="w-4 h-4" />
          New Discussion
        </Button>
      </div>

      <div className="space-y-4">
        {discussions.map(discussion => (
          <Card
            key={discussion._id}
            className="backdrop-blur-xl bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-white/10 overflow-hidden hover:border-purple-500/30 transition-all"
          >
            <div className="p-5 space-y-4">
              {/* Discussion Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                    {discussion.createdBy?.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{discussion.createdBy?.name}</p>
                      <Badge className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {discussion.category || "General"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      {new Date(discussion.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(discussion._id)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Discussion Title and Content */}
              <div>
                <h4 className="text-lg font-bold text-white mb-2">{discussion.title}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{discussion.description}</p>
              </div>

              {/* Discussion Stats and Actions */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-gray-400">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {discussion.replies?.length || 0} replies
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {discussion.attendees?.length || 0} watching
                  </span>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === discussion._id ? null : discussion._id)}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-semibold"
                >
                  {expandedId === discussion._id ? "Hide" : "View"} Replies
                </button>
              </div>

              {/* Replies Section */}
              {expandedId === discussion._id && (
                <div className="border-t border-white/10 pt-4 space-y-3">
                  {/* Existing Replies */}
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {discussion.replies?.map(reply => (
                      <div key={reply._id} className="pl-4 border-l-2 border-purple-500/30 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-300">
                            {reply.author?.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(reply.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{reply.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add your reply..."
                      value={replyText[discussion._id] || ""}
                      onChange={(e) => setReplyText({ ...replyText, [discussion._id]: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-700/50 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-purple-500 outline-none transition-all"
                    />
                    <button
                      onClick={() => handleReply(discussion._id, replyText[discussion._id])}
                      className="px-4 py-2 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 transition-all font-semibold flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
