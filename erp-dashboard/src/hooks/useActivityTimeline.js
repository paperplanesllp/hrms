import { useState, useCallback } from "react";

/**
 * Hook to fetch activity timeline data
 */
export function useActivityTimeline(endpoint = "hr-timeline") {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(
    async (skip = 0, limit = 50, filters = {}) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(limit),
          skip: String(skip),
        });

        // Add optional filters
        if (filters.module) params.append("module", filters.module);
        if (filters.actionType) params.append("actionType", filters.actionType);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);

        const token = localStorage.getItem("accessToken");
        const response = await fetch(`/api/activity/${endpoint}?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch activities: ${response.statusText}`
          );
        }

        const result = await response.json();

        if (skip === 0) {
          setActivities(result.data || []);
        } else {
          setActivities((prev) => [...prev, ...(result.data || [])]);
        }

        setTotal(result.total || 0);
        setHasMore((result.skip + result.limit) < result.total);
        setPage(Math.floor(skip / limit));

        return result;
      } catch (err) {
        console.error(`Error fetching ${endpoint}:`, err);
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  const loadMore = useCallback(
    async (limit = 50, filters = {}) => {
      const skip = (page + 1) * limit;
      return fetchActivities(skip, limit, filters);
    },
    [page, fetchActivities]
  );

  const refresh = useCallback(
    async (filters = {}) => {
      return fetchActivities(0, 50, filters);
    },
    [fetchActivities]
  );

  return {
    activities,
    loading,
    error,
    total,
    hasMore,
    page,
    fetchActivities,
    loadMore,
    refresh,
  };
}
