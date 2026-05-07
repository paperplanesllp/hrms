import React, { useState } from "react";
import { ExternalLink, Headphones, Music2 } from "lucide-react";

export default function SpotifyCard({ playlist, compact = false, active = false, onSelect }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        active
          ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_18px_60px_rgba(29,185,84,0.18)]"
          : "border-white/10 bg-white/5 hover:border-emerald-400/50 hover:bg-white/[0.08]"
      } backdrop-blur-xl`}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/20 to-transparent opacity-80" />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                {playlist.category}
              </p>
              <h3 className="truncate text-base font-bold text-white">{playlist.title}</h3>
            </div>
          </div>
          <a
            href={playlist.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title="Open in Spotify"
            aria-label={`Open ${playlist.title} in Spotify`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Headphones className="h-3.5 w-3.5 text-emerald-300" />
            {playlist.mood}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300">
            Official Spotify Embed
          </span>
        </div>

        {!compact && (
          <p className="mt-3 text-sm leading-6 text-slate-300">{playlist.description}</p>
        )}

        <button
          type="button"
          onClick={() => onSelect?.(playlist)}
          className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-emerald-400 hover:text-slate-950"
        >
          Load playlist
        </button>

        {active && !compact && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            {!loaded && (
              <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-300">
                Loading Spotify...
              </div>
            )}
            <iframe
              title={`Spotify Embed: ${playlist.title}`}
              src={playlist.embedUrl}
              width="100%"
              height="352"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className={`${loaded ? "block" : "hidden"} w-full border-0`}
              onLoad={() => setLoaded(true)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
