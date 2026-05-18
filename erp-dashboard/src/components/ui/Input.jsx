import React from "react";

export default function Input({ label, error, helperText, disabled = false, ...props }) {
  return (
    <label className="block group">
      {label && (
        <div className="theme-label mb-2.5 group-focus-within:text-brand-accent dark:group-focus-within:text-brand-accent transition-colors duration-200">
          {label}
          {props.required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
        </div>
      )}
      <input
        {...props}
        disabled={disabled}
        className={`glass-input w-full h-11 rounded-2xl px-4 py-3 outline-none
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? "border-red-500 dark:border-red-500/60 focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50"
            : ""
        } ${props.className || ""}`}
      />
      {helperText && (
        <div className={`text-xs mt-2 transition-colors duration-200 ${error ? "text-red-600 dark:text-red-400" : "theme-text-secondary"}`}>
          {helperText}
        </div>
      )}
    </label>
  );
}
