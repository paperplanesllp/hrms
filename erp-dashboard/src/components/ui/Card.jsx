import React from "react";

export default function Card({ 
  children, 
  className = "", 
  elevated = false,
  interactive = false,
  variant = "default"
}) {
  const baseClasses = elevated
    ? "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-elevation-2 transition-all duration-300 ease-smooth hover:border-brand-accent/50 dark:hover:border-brand-accent/60 hover:shadow-elevation-3 hover:shadow-accent-glow/10"
    : "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-elevation-1 transition-all duration-300 ease-smooth hover:border-brand-accent/50 dark:hover:border-brand-accent/60 hover:shadow-accent-glow/20";

  const interactiveClasses = interactive 
    ? "hover:shadow-accent-glow/20 dark:hover:shadow-accent-glow/15 hover:-translate-y-1 cursor-pointer active:scale-95 transition-all duration-300 ease-smooth" 
    : "";

  const variantClasses = {
    default: "",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    warning: "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-[0_0_12px_rgba(217,119,6,0.2)]",
    error: "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 hover:border-red-300 dark:hover:border-red-800 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    info: "border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]",
  };

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}