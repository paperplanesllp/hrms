import React from "react";

export default function Spinner({ size = "md", className = "" }) {
  const sizeClass = {
    sm: "w-4 h-4 border",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  }[size];

  return (
    <div
      className={`rounded-full border-slate-200 dark:border-slate-700 border-t-brand-accent dark:border-t-brand-accent animate-spin ${sizeClass} ${className}`}
    />
  );
}