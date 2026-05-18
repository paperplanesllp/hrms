import React from "react";

const variants = {
  primary: "glass-badge border-emerald-300/45 text-emerald-800 dark:text-emerald-200 bg-emerald-100/55 dark:bg-emerald-900/25",
  secondary: "glass-badge border-slate-300/45 text-slate-700 dark:text-slate-200 bg-slate-100/55 dark:bg-slate-800/45",
  light: "glass-badge text-slate-700 dark:text-slate-200",
  success: "glass-badge border-green-300/45 text-green-800 dark:text-green-200 bg-green-100/55 dark:bg-green-900/25",
  warning: "glass-badge border-amber-300/45 text-amber-800 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/25",
  danger: "glass-badge border-red-300/45 text-red-800 dark:text-red-200 bg-red-100/55 dark:bg-red-900/25",
  info: "glass-badge border-blue-300/45 text-blue-800 dark:text-blue-200 bg-blue-100/55 dark:bg-blue-900/25",
  outline: "glass-badge text-slate-700 dark:text-slate-200",
};

const sizes = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
  lg: "px-4 py-2 text-sm",
};

export default function Badge({ 
  children, 
  className = "", 
  variant = "light",
  size = "md",
  animated = false 
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full theme-badge-text transition-all duration-300 ${animated ? 'hover:scale-110' : 'hover:scale-105'} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
