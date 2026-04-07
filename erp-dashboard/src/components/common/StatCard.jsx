import React, { useState } from "react";
import Card from "../ui/Card.jsx";

export default function StatCard({
  title,
  value,
  hint,
  color = "primary",
  icon: Icon,
  hoverTitle,
  hoverList = [],
}) {
  const [showAll, setShowAll] = useState(false);

  const colorClass = {
    "primary": "border-l-4 border-l-brand-accent bg-gradient-to-br from-brand-accent/10 to-transparent dark:from-brand-accent/5 dark:to-transparent hover:shadow-accent-glow/15",
    "secondary": "border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-100/50 to-transparent dark:from-blue-950/40 dark:to-transparent",
    "success": "border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-100/50 to-transparent dark:from-emerald-950/40 dark:to-transparent",
    "warning": "border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-100/50 to-transparent dark:from-amber-950/40 dark:to-transparent",
  }[color];

  const hasHover = Boolean(hoverTitle);
  const normalizedList = Array.isArray(hoverList) ? hoverList : [];
  const visibleNames = showAll ? normalizedList : normalizedList.slice(0, 8);
  const hiddenCount = normalizedList.length > 8 ? normalizedList.length - 8 : 0;
  const nativeTitle = hasHover
    ? `${hoverTitle || title}\n${normalizedList.length > 0 ? normalizedList.join("\n") : "No employees"}`
    : undefined;

  return (
    <Card
      className={`relative p-6 h-full min-h-[14rem] ${colorClass} hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col`}
      title={nativeTitle}
    >
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
        <div className="mt-auto text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {hint}
        </div>
      )}

      {hasHover && (
        <div className="absolute left-4 right-4 z-50 hidden p-3 mt-2 text-sm border rounded-xl shadow-xl top-full bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 group-hover:block">
          <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            {hoverTitle || title}
          </p>
          <div className="space-y-1 text-slate-700 dark:text-slate-200">
            {visibleNames.map((name, idx) => (
              <p key={`${name}-${idx}`}>• {name}</p>
            ))}
            {visibleNames.length === 0 && (
              <p className="italic text-slate-500 dark:text-slate-400">No employees</p>
            )}
            {hiddenCount > 0 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-1 italic underline transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                +{hiddenCount} more
              </button>
            )}
            {showAll && normalizedList.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="mt-1 italic underline transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}