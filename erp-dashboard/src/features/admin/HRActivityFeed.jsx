import React from "react";
import { motion } from "framer-motion";
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
      case "discussion": return "from-purple-500/12 to-purple-600/5 border-purple-500/25 text-purple-500 dark:text-purple-300";
      case "meeting": return "from-pink-500/12 to-pink-600/5 border-pink-500/25 text-pink-500 dark:text-pink-300";
      case "reply": return "from-blue-500/12 to-blue-600/5 border-blue-500/25 text-blue-500 dark:text-blue-300";
      case "member": return "from-emerald-500/12 to-emerald-600/5 border-emerald-500/25 text-emerald-500 dark:text-emerald-300";
      default: return "from-slate-500/12 to-slate-600/5 border-slate-500/25 text-slate-500 dark:text-slate-300";
    }
  };

  if (activity.length === 0) {
    return (
      <Card className="relative overflow-hidden rounded-[30px] border border-white/55 bg-white/60 p-12 text-center shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-500/20">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-black text-slate-950 dark:text-white">No activity yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Realtime HR updates, meeting changes, and discussion replies will appear as a live timeline.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative space-y-4 pl-0 sm:pl-7">
      <div className="absolute left-3 top-2 hidden h-[calc(100%-16px)] w-px bg-gradient-to-b from-violet-400 via-cyan-400/60 to-transparent sm:block" />
      {activity.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          className="relative"
        >
          <span className="absolute -left-[1.83rem] top-6 hidden h-4 w-4 rounded-full border-4 border-white bg-cyan-400 shadow-[0_0_22px_rgba(34,211,238,0.75)] dark:border-slate-950 sm:block" />
          <Card
            className={`overflow-hidden rounded-[26px] border bg-gradient-to-r p-5 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_80px_rgba(15,23,42,0.16)] ${getActivityColor(
              item.type
            )}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/65 shadow-sm dark:bg-white/10">
                {getActivityIcon(item.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/50 bg-white/55 px-3 py-1 text-xs font-bold capitalize text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white">
                    {item.type}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                    Live update
                  </span>
                </div>
                <p className="text-sm font-bold leading-6 text-slate-950 dark:text-white">
                  {item.message}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {new Date(item.timestamp).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                  {item.user && <span>•</span>}
                  {item.user && <span>{item.user.name}</span>}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
