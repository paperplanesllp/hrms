import React from "react";
import { ChevronDown } from "lucide-react";

export default function Select({ label, error, helperText, disabled = false, ...props }) {
  return (
    <label className="block group">
      {label && (
        <div className="theme-label mb-2.5 group-focus-within:text-brand-accent dark:group-focus-within:text-brand-accent transition-colors duration-200">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </div>
      )}
      <div className="relative">
        <select
          {...props}
          disabled={disabled}
          className={`glass-input w-full h-11 rounded-2xl px-4 py-3 pr-10 outline-none appearance-none transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-red-500 dark:border-red-700 focus:border-red-500 dark:focus:border-red-600 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50"
              : ""
          } ${props.className || ""}`}
        >
          {props.children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-300 pointer-events-none" />
      </div>
      {helperText && (
        <div className={`text-xs mt-2 transition-colors duration-200 ${error ? "text-red-600 dark:text-red-400" : "theme-text-secondary"}`}>
          {helperText}
        </div>
      )}
    </label>
  );
}
