import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * TaskRefreshContext
 *
 * Provides a shared "refresh key" and trigger function across all Task page sections.
 * When any section performs a mutating action (create, update, delete, status change,
 * start, pause, resume, complete), it calls `triggerRefresh()`. All sections that
 * depend on `refreshKey` will re-fetch their data in the background, keeping filters,
 * search, and pagination intact.
 *
 * Debounced: multiple rapid calls within 300ms collapse into a single refresh.
 */

const TaskRefreshContext = createContext(null);

export function TaskRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const debounceTimer = useRef(null);

  /**
   * Call this after any task mutation to trigger a background re-fetch
   * across all subscribed sections. Debounced to 300ms.
   */
  const triggerRefresh = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 300);
  }, []);

  /**
   * Immediate refresh without debounce – use for socket-driven updates where
   * the debounce window would feel too slow.
   */
  const triggerRefreshImmediate = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <TaskRefreshContext.Provider value={{ refreshKey, triggerRefresh, triggerRefreshImmediate }}>
      {children}
    </TaskRefreshContext.Provider>
  );
}

/**
 * Hook to consume the TaskRefreshContext.
 * Returns { refreshKey, triggerRefresh, triggerRefreshImmediate }
 */
export function useTaskRefresh() {
  const ctx = useContext(TaskRefreshContext);
  if (!ctx) {
    // Graceful fallback when used outside the provider (e.g., standalone tests)
    return { refreshKey: 0, triggerRefresh: () => {}, triggerRefreshImmediate: () => {} };
  }
  return ctx;
}
