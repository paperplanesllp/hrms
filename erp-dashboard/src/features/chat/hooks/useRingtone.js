import { useRef, useCallback, useEffect } from "react";

/**
 * Custom hook to manage ringtone playback with cleanup.
 * Uses Web Audio API to generate a ringtone sound (or can be extended to use audio files).
 */
export function useRingtone() {
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const pulseTimeoutRef = useRef(null);

  /**
   * Start playing ringtone (looping pattern).
   * Gracefully handles browsers that block autoplay.
   */
  const startRingtone = useCallback(() => {
    try {
      // Stop any existing ringtone first
      stopRingtone();

      // Resume audio context if in 'suspended' state (common with autoplay restrictions)
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }

      // Create or reuse audio context
      const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create oscillator and gain to simulate ringtone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;

      // Set ringtone frequency (busy/dial tone frequency)
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(480, audioContext.currentTime); // 480 Hz

      // Start quiet
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();

      // Pulse the ringtone (on for 0.6s, off for 0.4s)
      const pulse = () => {
        if (!gainNodeRef.current || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const now = ctx.currentTime;

        // Ring duration: 0.6s
        gainNodeRef.current.gain.setValueAtTime(0.1, now);
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        // Silence duration: 0.4s
        gainNodeRef.current.gain.setValueAtTime(0.01, now + 0.6);
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        // Schedule next pulse
        pulseTimeoutRef.current = setTimeout(pulse, 1000);
      };

      pulse();

      console.log("[Ringtone] Started playing");
    } catch (err) {
      console.error("[Ringtone] Failed to start:", err.message);
    }
  }, []);

  /**
   * Stop playing ringtone and clean up.
   */
  const stopRingtone = useCallback(() => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }

      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }

      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = null;
      }

      // Note: We keep audioContextRef alive in case we need it again
      // (Web Audio contexts are expensive to create)

      console.log("[Ringtone] Stopped");
    } catch (err) {
      console.error("[Ringtone] Failed to stop:", err.message);
    }
  }, []);

  /**
   * Clean up on unmount.
   */
  useEffect(() => {
    return () => {
      stopRingtone();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopRingtone]);

  return { startRingtone, stopRingtone };
}
