import React from "react";
import Card from "../ui/Card.jsx";

export default function StatCard({ title, value, hint, color = "primary", icon: Icon }) {
  const colorClass = {
    "primary": "border-l-4 border-l-brand-accent bg-gradient-to-br from-brand-accent/10 to-transparent dark:from-brand-accent/5 dark:to-transparent hover:shadow-accent-glow/15",
    "secondary": "border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-100/50 to-transparent dark:from-blue-950/40 dark:to-transparent",
    "success": "border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-100/50 to-transparent dark:from-emerald-950/40 dark:to-transparent",
    "warning": "border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-100/50 to-transparent dark:from-amber-950/40 dark:to-transparent",
  }[color];

  return (
    <Card className={`p-6 ${colorClass} hover:shadow-lg transition-all duration-300 group cursor-pointer`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="mb-3 text-xs font-bold tracking-widest uppercase text-brand-accent dark:text-brand-accent">
            {title}
          </div>
          <div className="text-4xl font-bold tracking-tight lg:text-5xl text-slate-900 dark:text-white">
            {value}
          </div>
        </div>
        {Icon && (
          <div className="flex items-center justify-center w-12 h-12 transition-colors duration-200 rounded-2xl bg-brand-accent/15 dark:bg-brand-accent/10 group-hover:bg-brand-accent/25 dark:group-hover:bg-brand-accent/15">
            <Icon className="w-6 h-6 text-brand-accent" />
          </div>
        )}
      </div>
      {hint && (
        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {hint}
        </div>
      )}
    </Card>
  );
}