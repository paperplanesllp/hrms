import React from "react";
import { Activity, MessageCircle, Calendar, Users, Zap, AlertCircle } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";

export default function HRActivityFeed({ activity }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case "discussion": return <MessageCircle className="w-4 h-4" />;
      case "meeting": return <Calendar className="w-4 h-4" />;
      case "reply": return <Zap className="w-4 h-4" />;
      case "member": return <Users className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "discussion": return "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400";
      case "meeting": return "from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-400";
      case "reply": return "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400";
      case "member": return "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400";
      default: return "from-gray-500/10 to-gray-600/5 border-gray-500/20 text-gray-400";
    }
  };

  if (activity.length === 0) {
    return (
      <Card className="p-12 text-center backdrop-blur-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-white/10">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">No activity yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((item, idx) => (
        <Card
          key={idx}
          className={`p-4 backdrop-blur-xl bg-gradient-to-r ${getActivityColor(
            item.type
          )} border transition-all hover:border-opacity-100`}
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 mt-1 rounded-lg bg-white/10">
              {getActivityIcon(item.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-sm font-semibold text-white">{item.message}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
                {item.user && <span>•</span>}
                {item.user && <span>{item.user.name}</span>}
              </div>
            </div>

            {/* Badge */}
            <Badge className="flex-shrink-0 text-xs capitalize">
              {item.type}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
