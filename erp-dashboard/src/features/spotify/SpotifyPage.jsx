import React from "react";
import { Navigate } from "react-router-dom";
import { Headphones, Lock, Radio, ShieldCheck, Sparkles } from "lucide-react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import SpotifyWidget from "../../components/spotify/SpotifyWidget.jsx";
import { useSpotifyWellnessSettings } from "../../services/spotify/spotifyService.js";

const futureFeatures = [
  "Spotify OAuth login",
  "User playlist support",
  "Spotify Web Playback SDK",
  "Currently playing song",
  "Personalized wellness playlists",
];

export default function SpotifyPage() {
  const { spotifyWellnessEnabled, loading } = useSpotifyWellnessSettings();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!spotifyWellnessEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 pb-10">
      <PageTitle
        icon={Headphones}
        title="Spotify Wellness"
        subtitle="Focus playlists for calm, productive work sessions."
      />

      <SpotifyWidget />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Radio className="h-6 w-6 text-emerald-500" />
          <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            Embed First
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Playback stays inside Spotify's official iframe player with lazy loading.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ShieldCheck className="h-6 w-6 text-blue-500" />
          <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            Legal Safe Mode
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            The app never downloads, stores, proxies, or modifies Spotify audio.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Lock className="h-6 w-6 text-violet-500" />
          <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            Removable Module
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Spotify UI lives in isolated feature, component, and service folders.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
              Future Upgrade Path
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
              This first version intentionally avoids OAuth. When ready, add auth tokens and playback SDK code inside the Spotify module only, then replace the embed service methods without changing HRMS screens.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {futureFeatures.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
