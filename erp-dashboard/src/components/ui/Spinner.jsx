import React from "react";

export default function Spinner({ size = "md", className = "" }) {
  const sizeClass = {
    sm: "w-4 h-4 border",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  }[size];

  return (
    <div
      className={`rounded-full border-emerald-100/70 dark:border-slate-700/80 border-t-emerald-500 dark:border-t-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)] animate-spin ${sizeClass} ${className}`}
    />
  );
}
