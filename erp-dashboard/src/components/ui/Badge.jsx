import React from "react";

const variants = {
  primary: "bg-slate-900 dark:bg-slate-700 text-white border border-slate-900 dark:border-slate-600",
  secondary: "bg-slate-700 dark:bg-slate-600 text-white border border-slate-700 dark:border-slate-500",
  light: "bg-slate-200/30 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600",
  success: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800",
  warning: "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800",
  danger: "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800",
  info: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800",
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
      className={`inline-flex items-center gap-1 rounded-full font-semibold transition-all duration-300 ${animated ? 'hover:scale-110' : 'hover:scale-105'} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}