import React from 'react';

export default function TasksTabNavigation({ tabs, activeTab, onTabChange }) {
  // Find the active parent tab
  const activeParent = tabs.find(tab => 
    tab.id === activeTab || (tab.children && tab.children.some(child => child.id === activeTab))
  );

  return (
    <div>
      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.children ? tab.children[0].id : tab.id)}
              className={`
                px-6 py-3 text-sm font-semibold
                transition-all duration-300 ease-smooth
                border-b-2 -mb-px
                ${
                  activeParent?.id === tab.id
                    ? 'text-brand-accent border-brand-accent'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Indicator Dot - Visual feedback */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-2 h-2 rounded-full bg-brand-accent opacity-80 animate-pulse"></div>
          <span>Live Updates</span>
        </div>
      </div>

      {/* Sub-Tab Navigation (if parent has children) */}
      {activeParent?.children && (
        <div className="flex items-center gap-4 mb-6 pl-2 border-b border-slate-200 dark:border-slate-700">
          {activeParent.children.map((child) => (
            <button
              key={child.id}
              onClick={() => onTabChange(child.id)}
              className={`
                px-4 py-2 text-sm font-medium
                transition-all duration-300 ease-smooth
                border-b-2 -mb-px
                ${
                  activeTab === child.id
                    ? 'text-brand-accent border-brand-accent'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
