import React from "react";

export default function PageTitle({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 animate-slideInUp sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex min-w-0 items-center gap-3 sm:gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl border theme-border bg-white/55 dark:bg-white/10 flex items-center justify-center shadow-sm backdrop-blur">
              <Icon className="w-6 h-6 text-brand-accent dark:text-brand-accent" />
            </div>
          )}
          <h1 className="min-w-0 break-words text-2xl premium-page-title sm:text-3xl md:text-4xl">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-base theme-page-subtitle max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 sm:justify-end sm:gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
