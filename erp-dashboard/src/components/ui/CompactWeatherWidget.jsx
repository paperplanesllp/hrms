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
    <div className="relative hidden items-center gap-3 overflow-hidden rounded-2xl border border-white/45 bg-gradient-to-br from-white/75 via-sky-50/55 to-cyan-100/40 px-3.5 py-2.5 shadow-[0_18px_45px_rgba(14,165,233,0.12),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:scale-[1.01] hover:border-sky-200/75 hover:shadow-[0_22px_55px_rgba(15,23,42,0.14),0_0_30px_rgba(14,165,233,0.2),inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:from-slate-900/80 dark:via-slate-800/55 dark:to-sky-950/35 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:border-sky-300/30 dark:hover:shadow-[0_22px_55px_rgba(0,0,0,0.42),0_0_30px_rgba(14,165,233,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] sm:flex">
      <div className="pointer-events-none absolute -left-8 -bottom-8 h-20 w-20 rounded-full bg-sky-300/35 blur-2xl dark:bg-sky-400/15" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
      <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-amber-200/55 bg-white/45 shadow-inner shadow-white/40 backdrop-blur-md dark:border-amber-300/15 dark:bg-white/10 dark:shadow-none">
        <Icon className="w-5 h-5 text-amber-500 drop-shadow-sm dark:text-amber-300" />
      </div>
      <div className="relative flex flex-col leading-tight">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-100">
          {weather.city}
        </span>
        <span className="text-xs font-semibold text-slate-600/90 dark:text-slate-300/90">
          {weather.temperature}°C · {weather.conditionText}
        </span>
      </div>
    </div>
  );
}
