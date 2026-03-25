import React from "react";
import { ChevronDown } from "lucide-react";

export default function Select({ label, error, helperText, disabled = false, ...props }) {
  return (
    <label className="block group">
      {label && (
        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5 group-focus-within:text-brand-accent dark:group-focus-within:text-brand-accent transition-colors duration-200">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </div>
      )}
      <div className="relative">
        <select
          {...props}
          disabled={disabled}
          className={`w-full h-11 rounded-2xl bg-white dark:bg-slate-900 border px-4 py-3 pr-10 outline-none text-slate-900 dark:text-white appearance-none transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-red-500 dark:border-red-700 focus:border-red-500 dark:focus:border-red-600 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50"
              : "border-slate-300 dark:border-slate-600 focus:border-brand-accent dark:focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:focus:ring-brand-accent/15"
          } ${props.className || ""}`}
        >
          {props.children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-500 pointer-events-none" />
      </div>
      {helperText && (
        <div className={`text-xs mt-2 transition-colors duration-200 ${error ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
          {helperText}
        </div>
      )}
    </label>
  );
}