import React from "react";

export default function PageTitle({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between animate-slideInUp mb-8">
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-3">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/20 dark:bg-brand-accent/30 flex items-center justify-center">
              <Icon className="w-6 h-6 text-brand-accent dark:text-brand-accent" />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-3 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}