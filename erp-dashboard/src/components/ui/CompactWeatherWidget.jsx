import React, { useEffect, useMemo, useState } from "react";
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from "lucide-react";

const CACHE_TTL_MS = 12 * 60 * 1000;
const CACHE_STORAGE_KEY = "hrms:dashboard-weather:v1";
const DEFAULT_CITY = import.meta.env.VITE_WEATHER_DEFAULT_CITY || import.meta.env.VITE_DEFAULT_CITY || "Kochi";

function getConditionFromCode(code) {
  if (code === 0) return { text: "Clear", Icon: Sun };
  if (code === 1 || code === 2) return { text: "Mostly Sunny", Icon: CloudSun };
  if (code === 3) return { text: "Cloudy", Icon: Cloud };
  if (code === 45 || code === 48) return { text: "Foggy", Icon: CloudFog };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { text: "Rainy", Icon: CloudRain };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "Snow", Icon: CloudSnow };
  if ([95, 96, 99].includes(code)) return { text: "Stormy", Icon: CloudLightning };
  return { text: "Mostly Sunny", Icon: CloudSun };
}

function readCachedWeather(cacheKey) {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.cacheKey !== cacheKey) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.data || null;
  } catch {
    return null;
  }
}

function writeCachedWeather(cacheKey, data) {
  try {
    localStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify({
        cacheKey,
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
    );
  } catch {
    // no-op: cache failure should not block the widget
  }
}

function getUserCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      reject,
      { timeout: 5000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

async function fetchCoordinatesByCity(cityName) {
  const encodedCity = encodeURIComponent(cityName);
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=en`
  );
  if (!response.ok) throw new Error("Failed city geocoding");
  const data = await response.json();
  const first = data?.results?.[0];
  if (!first) throw new Error("City not found");
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    city: first.name || cityName,
  };
}

async function fetchCurrentWeather(latitude, longitude) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
  );
  if (!response.ok) throw new Error("Failed weather lookup");
  const data = await response.json();

  return {
    temperature: Math.round(data?.current?.temperature_2m),
    weatherCode: Number(data?.current?.weather_code),
  };
}

export default function CompactWeatherWidget() {
  const [weather, setWeather] = useState(null);

  const fallbackCity = useMemo(() => DEFAULT_CITY, []);

  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      try {
        let latitude;
        let longitude;
        let cityLabel;

        try {
          const coords = await getUserCoordinates();
          latitude = coords.latitude;
          longitude = coords.longitude;
          // Reverse geocoding from browser can be blocked by CORS on some networks.
          // Keep location-based weather while using a stable label.
          cityLabel = fallbackCity;
        } catch {
          const fallback = await fetchCoordinatesByCity(fallbackCity);
          latitude = fallback.latitude;
          longitude = fallback.longitude;
          cityLabel = fallback.city || fallbackCity;
        }

        const cacheKey = `${Math.round(latitude * 10) / 10}:${Math.round(longitude * 10) / 10}`;
        const cached = readCachedWeather(cacheKey);
        if (cached) {
          if (!cancelled) setWeather(cached);
          return;
        }

        const current = await fetchCurrentWeather(latitude, longitude);
        const condition = getConditionFromCode(current.weatherCode);

        const payload = {
          city: cityLabel,
          temperature: Number.isFinite(current.temperature) ? current.temperature : null,
          conditionText: condition.text,
          weatherCode: current.weatherCode,
        };

        writeCachedWeather(cacheKey, payload);
        if (!cancelled) setWeather(payload);
      } catch {
        if (!cancelled) setWeather(null);
      }
    };

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [fallbackCity]);

  if (!weather || weather.temperature === null) return null;

  const { Icon } = getConditionFromCode(weather.weatherCode);

  return (
    <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/35 dark:border-slate-600/60 bg-gradient-to-br from-white/80 via-sky-50/70 to-cyan-100/70 dark:from-slate-800/80 dark:via-slate-800/70 dark:to-slate-700/70 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 ease-smooth">
      <Icon className="w-4 h-4 text-amber-500 dark:text-amber-300" />
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold tracking-wide text-slate-700 dark:text-slate-200">
          {weather.city}
        </span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {weather.temperature}°C · {weather.conditionText}
        </span>
      </div>
    </div>
  );
}
