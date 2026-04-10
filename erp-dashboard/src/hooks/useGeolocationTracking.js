import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import api from '../lib/api.js';
import { toast } from '../store/toastStore.js';

/**
 * Hook to track user geolocation every 2 seconds after login
 * Works for both HR and regular users
 */
export function useGeolocationTracking() {
  const user = useAuthStore((s) => s.user);
  const trackingIntervalRef = useRef(null);
  const lastUpdateRef = useRef(null);

  useEffect(() => {
    // Only start tracking if user is authenticated
    if (!user?.id) {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by browser');
      return;
    }

    const updateGeolocation = async () => {
      try {
        // Get current position
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        const { latitude, longitude, accuracy } = position.coords;
        const now = new Date();

        // Only send if location has changed significantly or 5+ minutes have passed
        // (to avoid redundant API calls while still updating frequently)
        const timeSinceLastUpdate = lastUpdateRef.current
          ? (now - lastUpdateRef.current) / 1000
          : Infinity;

        // Update every 2 seconds as requested, but API will handle deduplication
        if (timeSinceLastUpdate >= 2) {
          // Send location update to backend
          await api.post('/users/location/update', {
            latitude: parseFloat(latitude.toFixed(6)),
            longitude: parseFloat(longitude.toFixed(6)),
            accuracy: parseFloat(accuracy.toFixed(2)),
            timestamp: now.toISOString(),
          }).catch((err) => {
            // Silently handle errors to not spam user with toasts
            console.error('Location update failed:', err.message);
          });

          lastUpdateRef.current = now;
        }
      } catch (error) {
        // Geolocation errors (permission denied, timeout, etc.)
        // Only log on first error to avoid console spam
        if (!trackingIntervalRef.current?.hasLoggedError) {
          console.warn('Geolocation error:', error.message);
          if (trackingIntervalRef.current) {
            trackingIntervalRef.current.hasLoggedError = true;
          }
        }
      }
    };

    // Initial call to get location immediately
    updateGeolocation();

    // Set up interval to update every 2 seconds
    trackingIntervalRef.current = setInterval(updateGeolocation, 2000);

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [user?.id]);
}
