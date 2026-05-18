import React from "react";
import { Code2 } from "lucide-react";

export default function EmptyState({ title = "No data", subtitle = "Nothing to show here yet.", icon: Icon = Code2 }) {
  return (
    <div className="glass-panel rounded-3xl py-16 px-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-white/55 dark:bg-slate-800/55 border theme-border flex items-center justify-center shadow-inner">
          {React.createElement(Icon, { className: "w-8 h-8 text-emerald-600 dark:text-emerald-300" })}
        </div>
      </div>
      <div className="text-lg theme-empty-title">{title}</div>
      <div className="text-sm theme-empty-text mt-2">{subtitle}</div>
    </div>
  );
}
