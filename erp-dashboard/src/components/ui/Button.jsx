import React from "react";

const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  className = "", 
  leftIcon, 
  rightIcon, 
  ...props 
}) => {
  const variants = {
    primary: "glass-btn glass-btn-primary",
    secondary: "glass-btn glass-btn-secondary",
    ghost: "glass-btn glass-btn-secondary",
    outline: "glass-btn glass-btn-secondary",
    danger: "glass-btn glass-btn-danger",
    success: "glass-btn glass-btn-success",
    cancel: "glass-btn glass-btn-cancel",
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
        inline-flex max-w-full items-center justify-center whitespace-normal break-words text-center 
        theme-button-text
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
