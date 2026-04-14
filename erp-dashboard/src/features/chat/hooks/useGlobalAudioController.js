import { useCallback, useEffect, useMemo, useRef, useState } from "react";

let currentPlayingAudioId = null;
let currentAudioRef = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener(currentPlayingAudioId));
}

function setCurrentAudio(audioId, audioElement) {
  currentPlayingAudioId = audioId;
  currentAudioRef = audioElement;
  notifyListeners();
}

function clearCurrentAudio(audioId) {
  if (currentPlayingAudioId === audioId) {
    currentPlayingAudioId = null;
    currentAudioRef = null;
    notifyListeners();
  }
}

export function useGlobalAudioController(audioId) {
  const [currentAudioId, setCurrentAudioId] = useState(currentPlayingAudioId);
  const audioRefs = useRef({});
  const audioElementRef = useRef(null);

  useEffect(() => {
    const listener = (id) => setCurrentAudioId(id);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const registerAudioRef = useCallback(
    (element) => {
      if (!audioId) return;
      if (element) {
        audioRefs.current[audioId] = element;
        audioElementRef.current = element;
      } else {
        delete audioRefs.current[audioId];
        audioElementRef.current = null;
      }
    },
    [audioId]
  );

  const pauseCurrentIfDifferent = useCallback(() => {
    if (currentPlayingAudioId && currentPlayingAudioId !== audioId && currentAudioRef) {
      currentAudioRef.pause();
    }
  }, [audioId]);

  const handlePlayToggle = useCallback(async () => {
    const targetAudio = audioElementRef.current;
    if (!targetAudio || !audioId) return;

    if (currentPlayingAudioId && currentPlayingAudioId !== audioId) {
      pauseCurrentIfDifferent();
    }

    if (currentPlayingAudioId === audioId && !targetAudio.paused) {
      targetAudio.pause();
      clearCurrentAudio(audioId);
      return;
    }

    try {
      await targetAudio.play();
      setCurrentAudio(audioId, targetAudio);
    } catch {
      // Autoplay restrictions/user gesture issues should fail silently.
    }
  }, [audioId, pauseCurrentIfDifferent]);

  useEffect(() => {
    const targetAudio = audioElementRef.current;
    if (!targetAudio || !audioId) return;

    const handlePlay = () => {
      if (currentPlayingAudioId && currentPlayingAudioId !== audioId && currentAudioRef) {
        currentAudioRef.pause();
      }
      setCurrentAudio(audioId, targetAudio);
    };

    const handlePause = () => {
      clearCurrentAudio(audioId);
    };

    const handleEnded = () => {
      clearCurrentAudio(audioId);
    };

    targetAudio.addEventListener("play", handlePlay);
    targetAudio.addEventListener("pause", handlePause);
    targetAudio.addEventListener("ended", handleEnded);

    return () => {
      targetAudio.removeEventListener("play", handlePlay);
      targetAudio.removeEventListener("pause", handlePause);
      targetAudio.removeEventListener("ended", handleEnded);
      if (currentPlayingAudioId === audioId) {
        targetAudio.pause();
        clearCurrentAudio(audioId);
      }
    };
  }, [audioId]);

  useEffect(() => {
    const pauseOnPageHide = () => {
      if (currentAudioRef && !currentAudioRef.paused) {
        currentAudioRef.pause();
      }
    };

    window.addEventListener("pagehide", pauseOnPageHide);
    return () => {
      window.removeEventListener("pagehide", pauseOnPageHide);
    };
  }, []);

  const isPlaying = useMemo(() => currentAudioId === audioId, [currentAudioId, audioId]);

  return {
    isPlaying,
    handlePlayToggle,
    registerAudioRef,
    currentAudioId,
  };
}
