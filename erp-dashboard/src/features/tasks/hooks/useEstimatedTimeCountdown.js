import { useState, useEffect, useRef } from 'react';
import { toast } from '../../../store/toastStore.js';

/**
 * Hook for countdown timer based on estimated time
 * Counts DOWN from estimated time (e.g., 2:00:00 → 1:59:59 → ...)
 * Shows alerts when reaches 10min, 5min, 1min, and 0
 */
export function useEstimatedTimeCountdown(task) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isAlertShown, setIsAlertShown] = useState(false);
  const alertShownRef = useRef({
    tenMin: false,
    fiveMin: false,
    oneMin: false,
    timeUp: false
  });

  // Calculate initial estimated seconds
  const getEstimatedSeconds = () => {
    if (!task) return 0;
    // Check for both possible field names: estimatedHours/estimatedMinutes or estimatedTime variants
    const hours = parseInt(task.estimatedHours) || 0;
    const minutes = parseInt(task.estimatedMinutes) || 0;
    const totalSeconds = hours * 3600 + minutes * 60;
    return Math.max(0, totalSeconds); // Ensure non-negative
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
    // Do not run the countdown timer for completed tasks
    if (!task || task.status === 'completed') return;

    // Calculate remaining seconds every second
    const interval = setInterval(() => {
      const estimated = getEstimatedSeconds();
      const elapsed = calculateElapsedSeconds();
      const remaining = Math.max(0, estimated - elapsed);
      
      setRemainingSeconds(remaining);

      // Show alert only once at each threshold
      if (estimated > 0) {
        // At 10 minutes remaining
        if (remaining === 600 && !alertShownRef.current.tenMin) {
          alertShownRef.current.tenMin = true;
          setIsAlertShown(true);
          toast({
            title: '⏱️ 10 Minutes Remaining!',
            message: `"${task.title}" - Only 10 minutes left on your estimate.`,
            type: 'warning',
            duration: 4000
          });
          playAlertSound();
        }

        // At 5 minutes remaining
        if (remaining === 300 && !alertShownRef.current.fiveMin) {
          alertShownRef.current.fiveMin = true;
          setIsAlertShown(true);
          toast({
            title: '⏱️ 5 Minutes Remaining!',
            message: `"${task.title}" - Only 5 minutes left. Better hurry! 🏃`,
            type: 'warning',
            duration: 4000
          });
          playAlertSound('rapid');
        }

        // At 1 minute remaining
        if (remaining === 60 && !alertShownRef.current.oneMin) {
          alertShownRef.current.oneMin = true;
          setIsAlertShown(true);
          toast({
            title: '⚡ 1 Minute Remaining!',
            message: `"${task.title}" - URGENT! Only 60 seconds left!`,
            type: 'error',
            duration: 3000
          });
          playAlertSound('rapid');
        }

        // When time reaches 0
        if (remaining === 0 && !alertShownRef.current.timeUp) {
          alertShownRef.current.timeUp = true;
          setIsAlertShown(true);
          
          // Show urgent toast notification
          toast({
            title: '🔴 TIME UP!',
            message: `"${task.title}" - Estimated time has been exhausted. Please update time or mark complete.`,
            type: 'error',
            duration: 5000
          });

          // Play urgent alert sound
          playAlertSound('urgent');
        }
      }

      // Reset alert shown if task restarted
      if (remaining > 600 && alertShownRef.current.tenMin) {
        alertShownRef.current = { tenMin: false, fiveMin: false, oneMin: false, timeUp: false };
        setIsAlertShown(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [task?.estimatedHours, task?.estimatedMinutes, task?.totalActiveTimeInSeconds, task?.currentSessionStartTime, task?.isRunning, task?.status, task?.title]);

  // For completed tasks, suppress the timer entirely — show isCompleted flag instead
  if (task?.status === 'completed') {
    return {
      remainingSeconds: 0,
      remainingDisplay: '00:00:00',
      isExpired: false,
      isAlertShown: false,
      estimatedSeconds: getEstimatedSeconds(),
      elapsedSeconds: calculateElapsedSeconds(),
      isCompleted: true,
    };
  }

  return {
    remainingSeconds,
    remainingDisplay: formatCountdown(remainingSeconds),
    isExpired: remainingSeconds === 0,
    isAlertShown,
    estimatedSeconds: getEstimatedSeconds(),
    elapsedSeconds: calculateElapsedSeconds(),
    isCompleted: false,
  };
}

/**
 * Play alert sound when timer reaches thresholds
 * @param {string} type - 'normal' (default), 'rapid', or 'urgent'
 */
function playAlertSound(type = 'normal') {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (type === 'urgent') {
      // Urgent: Multiple rapid beeps with escalating pitch
      playBeep(audioContext, 900, 0.3, 0.05); // High beep 1
      setTimeout(() => playBeep(audioContext, 1100, 0.3, 0.05), 150); // Higher beep 2
      setTimeout(() => playBeep(audioContext, 1300, 0.3, 0.1), 300); // Highest beep 3 (longer)
    } else if (type === 'rapid') {
      // Rapid: Two quick beeps
      playBeep(audioContext, 1000, 0.3, 0.08);
      setTimeout(() => playBeep(audioContext, 1000, 0.3, 0.08), 200);
    } else {
      // Normal: Single beep
      playBeep(audioContext, 800, 0.3, 0.5);
    }
  } catch (err) {
    console.log('Audio context not available, skipping sound');
  }
}

/**
 * Helper to play a single beep
 */
function playBeep(audioContext, frequency, volume, duration) {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (err) {
    console.log('Error playing beep:', err);
  }
}
