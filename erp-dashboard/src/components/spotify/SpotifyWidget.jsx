import React, { useMemo, useState } from "react";
import { Headphones, Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SpotifyCard from "./SpotifyCard.jsx";
import {
  SPOTIFY_PLAYLISTS,
  useSpotifyWellnessSettings,
} from "../../services/spotify/spotifyService.js";

export default function SpotifyWidget({ dashboard = false }) {
  const navigate = useNavigate();
  const { spotifyWellnessEnabled, loading } = useSpotifyWellnessSettings();
  const defaultPlaylist = useMemo(() => SPOTIFY_PLAYLISTS[0], []);
  const [activePlaylist, setActivePlaylist] = useState(defaultPlaylist);

  if (loading || !spotifyWellnessEnabled) return null;

  if (dashboard) {
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-950 text-white shadow-xl shadow-emerald-950/20 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/50">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,185,84,0.24),transparent_36%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Employee Wellness
                </p>
                <h3 className="mt-1 text-xl font-black text-white">Now Relaxing</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                <Headphones className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Focus music for deep work, coding, and calm office flow.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <iframe
                title={`Spotify Embed: ${defaultPlaylist.title}`}
                src={defaultPlaylist.embedUrl}
                width="100%"
                height="152"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="block w-full border-0"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate("/spotify-wellness")}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300"
            >
              <Waves className="h-4 w-4" />
              Open Focus Music
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl shadow-emerald-950/20">
      <div className="relative border border-white/10 p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(29,185,84,0.24),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(20,184,166,0.18),transparent_26%)]" />
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                Employee Wellness / Focus Music
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Now Relaxing
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Choose a playlist and let Spotify handle playback through its official embed.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 backdrop-blur-xl">
              No audio files stored. No Premium bypass. Embed only.
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <iframe
                key={activePlaylist.id}
                title={`Spotify Embed: ${activePlaylist.title}`}
                src={activePlaylist.embedUrl}
                width="100%"
                height="352"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="block w-full border-0"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {SPOTIFY_PLAYLISTS.map((playlist) => (
                <SpotifyCard
                  key={playlist.id}
                  playlist={playlist}
                  compact
                  active={activePlaylist.id === playlist.id}
                  onSelect={setActivePlaylist}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
