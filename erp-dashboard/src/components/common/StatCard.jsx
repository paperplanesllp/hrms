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
    "primary": "border-l-4 border-l-brand-accent bg-gradient-to-br from-brand-accent/12 to-white/10 dark:from-brand-accent/10 dark:to-white/5",
    "secondary": "border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-100/45 to-white/10 dark:from-blue-950/30 dark:to-white/5",
    "success": "border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-100/45 to-white/10 dark:from-emerald-950/30 dark:to-white/5",
    "warning": "border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-100/45 to-white/10 dark:from-amber-950/30 dark:to-white/5",
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
      className={`relative p-6 h-full min-h-[14rem] ${colorClass} transition-all duration-300 group cursor-pointer flex flex-col`}
      title={nativeTitle}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="mb-3 text-xs theme-label uppercase text-emerald-700 dark:text-emerald-300">
            {title}
          </div>
          <div className="text-4xl lg:text-5xl theme-widget-value">
            {value}
          </div>
        </div>
        {Icon && (
          <div className="flex items-center justify-center w-12 h-12 transition-colors duration-200 rounded-2xl bg-white/50 dark:bg-white/10 border theme-border group-hover:bg-brand-accent/15">
            <Icon className="w-6 h-6 text-brand-accent" />
          </div>
        )}
      </div>
      {hint && (
        <div className="mt-auto text-sm theme-body-text">
          {hint}
        </div>
      )}

      {hasHover && (
        <div className="glass-panel absolute left-4 right-4 z-50 hidden p-3 mt-2 text-sm rounded-xl top-full group-hover:block">
          <p className="mb-2 text-xs theme-label uppercase">
            {hoverTitle || title}
          </p>
          <div className="space-y-1 theme-text-primary">
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
