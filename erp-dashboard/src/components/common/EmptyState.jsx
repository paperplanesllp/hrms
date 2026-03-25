import React from "react";
import { Code2 } from "lucide-react";

export default function EmptyState({ title = "No data", subtitle = "Nothing to show here yet.", icon: Icon = Code2 }) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-slate-600 dark:text-slate-400" />
        </div>
      </div>
      <div className="text-lg font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">{subtitle}</div>
    </div>
  );
}