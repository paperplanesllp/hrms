import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export default function AudioPlayer({ src, isSender }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={src} />
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isSender
            ? "bg-white/20 hover:bg-white/30"
            : "bg-[#0A1931]/10 hover:bg-[#0A1931]/20"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>
      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${
          isSender ? "bg-white/20" : "bg-[#0A1931]/10"
        }`}>
          <div
            className={`h-full transition-all ${
              isSender ? "bg-white" : "bg-[#0A1931]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs opacity-70 min-w-[35px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}
