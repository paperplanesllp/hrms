import { useState, useEffect, useRef } from 'react';
import { toast } from '../../../store/toastStore.js';

/**
 * Hook for countdown timer based on estimated time
 * Counts DOWN from estimated time (e.g., 2:00:00 → 1:59:59 → ...)
 * Shows alert when reaches 0
 */
export function useEstimatedTimeCountdown(task) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isAlertShown, setIsAlertShown] = useState(false);
  const alertShownRef = useRef(false);

  // Calculate initial estimated seconds
  const getEstimatedSeconds = () => {
    if (!task) return 0;
    const hours = task.estimatedHours || 0;
    const minutes = task.estimatedMinutes || 0;
    return hours * 3600 + minutes * 60;
  };

  // Calculate elapsed time in seconds
  const calculateElapsedSeconds = () => {
    if (!task || task.status === 'pending') return 0;
    
    // Total active time from previous sessions
    const totalActive = task.totalActiveTimeInSeconds || 0;
    
    // Add current session time if task is running
    let currentSessionTime = 0;
    if (task.isRunning && task.currentSessionStartTime) {
      const now = new Date();
      const sessionStart = new Date(task.currentSessionStartTime);
      currentSessionTime = Math.floor((now - sessionStart) / 1000);
    }
    
    return totalActive + currentSessionTime;
  };

  // Format seconds to HH:MM:SS format
  const formatCountdown = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    // Calculate remaining seconds every second
    const interval = setInterval(() => {
      const estimated = getEstimatedSeconds();
      const elapsed = calculateElapsedSeconds();
      const remaining = Math.max(0, estimated - elapsed);
      
      setRemainingSeconds(remaining);

      // Show alert only once when timer reaches 0
      if (remaining === 0 && !alertShownRef.current && estimated > 0) {
        alertShownRef.current = true;
        setIsAlertShown(true);
        
        // Show toast notification
        toast({
          title: '⏱️ Time Estimate Reached!',
          message: `"${task.title}" - Estimated time has been used up. Please update time or mark complete.`,
          type: 'warning',
          duration: 5000
        });

        // Beep notification sound
        playAlertSound();
      }

      // Reset alert shown if task restarted
      if (remaining > 0 && alertShownRef.current) {
        alertShownRef.current = false;
        setIsAlertShown(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [task?.estimatedHours, task?.estimatedMinutes, task?.totalActiveTimeInSeconds, task?.currentSessionStartTime, task?.isRunning, task?.status, task?.title]);

  return {
    remainingSeconds,
    remainingDisplay: formatCountdown(remainingSeconds),
    isExpired: remainingSeconds === 0,
    isAlertShown,
    estimatedSeconds: getEstimatedSeconds(),
    elapsedSeconds: calculateElapsedSeconds()
  };
}

/**
 * Play alert sound when timer expires
 */
function playAlertSound() {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequency and volume
    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    // Play beep
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (err) {
    console.log('Audio context not available, skipping sound');
  }
}
