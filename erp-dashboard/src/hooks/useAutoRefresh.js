import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/authStore.js";

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function useAutoRefresh(callback, delay, options = {}) {
  const {
    enabled = true,
    immediate = false,
    pauseWhenHidden = true,
    maxRetries = 2,
    retryDelay = 5000,
    timeoutMs = 20000,
  } = options;
  const accessToken = useAuthStore((s) => s.accessToken);
  const callbackRef = useRef(callback);
  const intervalRef = useRef(null);
  const retryRef = useRef(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (retryRef.current) {
      window.clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const runRefresh = useCallback(async ({ retryCount = 0 } = {}) => {
    if (!enabled || !accessToken || !delay) return;
    if (pauseWhenHidden && !isDocumentVisible()) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    if (mountedRef.current) {
      setIsRefreshing(true);
    }

    try {
      const task = Promise.resolve(callbackRef.current?.());
      let timeoutId = null;
      const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("Auto-refresh request timed out")), timeoutMs);
      });
      try {
        await Promise.race([task, timeout]);
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }
      if (mountedRef.current) {
        setLastUpdatedAt(new Date());
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
      if (retryCount < maxRetries && enabled && accessToken) {
        retryRef.current = window.setTimeout(() => {
          runRefresh({ retryCount: retryCount + 1 });
        }, retryDelay * (retryCount + 1));
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [accessToken, delay, enabled, maxRetries, pauseWhenHidden, retryDelay, timeoutMs]);

  useEffect(() => {
    mountedRef.current = true;
    clearTimers();

    if (!enabled || !accessToken || !delay) {
      return () => clearTimers();
    }

    if (immediate && (!pauseWhenHidden || isDocumentVisible())) {
      runRefresh();
    }

    intervalRef.current = window.setInterval(() => {
      runRefresh();
    }, delay);

    const handleVisibilityChange = () => {
      if (!pauseWhenHidden) return;
      if (isDocumentVisible()) {
        runRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimers();
    };
  }, [accessToken, clearTimers, delay, enabled, immediate, pauseWhenHidden, runRefresh]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isRefreshing,
    lastUpdatedAt,
    error,
    refreshNow: runRefresh,
  };
}
