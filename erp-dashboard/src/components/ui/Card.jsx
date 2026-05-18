import React from "react";

export default function Card({ 
  children, 
  className = "", 
  elevated = false,
  interactive = false,
  variant = "default",
  ...props
}) {
  const baseClasses = elevated
    ? "glass-card glass-card-hover shadow-elevation-2"
    : "glass-card glass-card-hover shadow-elevation-1";

  const interactiveClasses = interactive 
    ? "cursor-pointer active:scale-[0.98] transition-all duration-300 ease-smooth" 
    : "";

  const variantClasses = {
    default: "",
    success: "border-emerald-300/45 dark:border-emerald-300/20 bg-emerald-50/45 dark:bg-emerald-950/25",
    warning: "border-amber-300/45 dark:border-amber-300/20 bg-amber-50/45 dark:bg-amber-950/25",
    error: "border-red-300/45 dark:border-red-300/20 bg-red-50/45 dark:bg-red-950/25",
    info: "border-blue-300/45 dark:border-blue-300/20 bg-blue-50/45 dark:bg-blue-950/25",
  };

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
