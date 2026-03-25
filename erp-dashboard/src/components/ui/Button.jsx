import React from "react";

const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  className = "", 
  leftIcon, 
  ...props 
}) => {
  // Premium variant mapping with proper contrast ratios (4.5:1+)
  const variants = {
    primary: "bg-brand-accent text-white hover:bg-brand-accent/90 hover:shadow-accent-glow/30 dark:bg-brand-accent dark:text-slate-900 dark:hover:bg-brand-accent/90 dark:hover:shadow-accent-glow/25 border border-brand-accent/50 dark:border-brand-accent",
    secondary: "bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600 hover:shadow-md",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200",
    danger: "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/50 dark:hover:bg-red-900/50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-2",
    md: "px-4 py-2 text-sm gap-3",
    lg: "px-6 py-3 text-base gap-4",
  };

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center justify-center 
        font-semibold rounded-lg border 
        transition-all duration-300 ease-smooth 
        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        tracking-wide
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
    </button>
  );
};

export default Button;