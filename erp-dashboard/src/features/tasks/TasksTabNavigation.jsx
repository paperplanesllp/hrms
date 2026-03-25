import React from 'react';

export default function TasksTabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex items-center justify-start gap-3 flex-wrap">
      {/* Premium Pill-style Navigation */}
      <div className="inline-flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-5 py-2 rounded-full text-sm font-semibold
              transition-all duration-300 ease-smooth
              ${
                activeTab === tab.id
                  ? 'bg-brand-accent text-slate-900 shadow-lg shadow-brand-accent/30 dark:shadow-brand-accent/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Indicator Dot - Visual feedback */}
      <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-slate-500 dark:text-slate-400">
        <div className="w-2 h-2 rounded-full bg-brand-accent opacity-80 animate-pulse"></div>
        <span>Live Updates</span>
      </div>
    </div>
  );
}
