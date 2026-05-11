import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api.js";

const CACHE_KEY = "experimental.spotifyWellnessEnabled";
const EVENT_NAME = "spotify-wellness-settings-changed";

const DEFAULT_SETTINGS = {
  spotifyWellnessEnabled: false,
};

const SPOTIFY_WELLNESS_API_ENABLED = import.meta.env.VITE_ENABLE_SPOTIFY_WELLNESS === "true";

function readCachedSettings() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    return { spotifyWellnessEnabled: raw === "true" };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function cacheSettings(settings) {
  try {
    window.localStorage.setItem(CACHE_KEY, String(Boolean(settings.spotifyWellnessEnabled)));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
  } catch {
    // Local cache is best-effort only. The server remains the source of truth.
  }
}

export const SPOTIFY_PLAYLISTS = [
  {
    id: "deep-focus",
    title: "Deep Work Mode",
    mood: "Now Relaxing",
    category: "Focus playlist",
    description: "Ambient focus textures for long quiet task blocks.",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
  },
  {
    id: "coding-mode",
    title: "Coding Music",
    mood: "Flow State",
    category: "Coding playlist",
    description: "Steady electronic energy for engineering sprints.",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX5trt9i14X7j?utm_source=generator&theme=0",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX5trt9i14X7j",
  },
  {
    id: "office-focus",
    title: "Office Focus",
    mood: "Desk Calm",
    category: "Office focus playlist",
    description: "Low-friction background music for focused shared spaces.",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1E8PPbAdFK8WOf?utm_source=generator&theme=0",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1E8PPbAdFK8WOf",
  },
];

// Future upgrade path: keep OAuth, user playlist fetching, Web Playback SDK,
// and currently-playing state behind this service so HRMS screens stay unchanged.
export const spotifyService = {
  async getSettings() {
    if (!SPOTIFY_WELLNESS_API_ENABLED) {
      cacheSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }

    let response;
    try {
      response = await api.get("/spotify/settings");
    } catch (error) {
      if (error?.response?.status === 404) {
        cacheSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      throw error;
    }
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(response.data || {}),
    };
    cacheSettings(settings);
    return settings;
  },

  async updateSettings(nextSettings) {
    if (!SPOTIFY_WELLNESS_API_ENABLED) {
      throw new Error("Spotify Wellness API is not enabled for this deployment.");
    }

    const response = await api.patch("/spotify/settings", nextSettings);
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(response.data?.settings || response.data || {}),
    };
    cacheSettings(settings);
    return settings;
  },
};

export function useSpotifyWellnessSettings({ fetchOnMount = true } = {}) {
  const [settings, setSettings] = useState(readCachedSettings);
  const [loading, setLoading] = useState(fetchOnMount);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await spotifyService.getSettings();
      setSettings(next);
      return next;
    } catch {
      const cached = readCachedSettings();
      setSettings(cached);
      return cached;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (nextSettings) => {
    const next = await spotifyService.updateSettings(nextSettings);
    setSettings(next);
    return next;
  }, []);

  useEffect(() => {
    const handleChange = (event) => {
      setSettings(event.detail || readCachedSettings());
    };

    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  useEffect(() => {
    if (fetchOnMount) refresh();
  }, [fetchOnMount, refresh]);

  return {
    ...settings,
    loading,
    refresh,
    update,
  };
}
