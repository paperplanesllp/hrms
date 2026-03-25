import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { requestGeolocation, isGeolocationSupported } from './geolocation.js';
import api from './api.js';
import { ROLES } from '../app/constants.js';

// Track geolocation every 10 seconds for HR and employees
const UPDATE_INTERVAL = 10000; // 10 seconds

export default function useGeolocationTracker() {
  const user = useAuthStore((state) => state.user);
  const intervalRef = useRef(null);
  const isTrackingRef = useRef(false);

  useEffect(() => {
    // Track for HR and EMPLOYEE users after login
    const shouldTrack = user && 
      (user.role === ROLES.HR || user.role === ROLES.USER);

    if (!shouldTrack) {
      return;
    }

    // Check if geolocation is supported
    if (!isGeolocationSupported()) {
      console.warn('Geolocation is not supported in this browser');
      return;
    }

    // Function to update location every 10 seconds
    const updateLocation = async () => {
      if (isTrackingRef.current) return;
      
      try {
        isTrackingRef.current = true;
        const location = await requestGeolocation();
        
        // Send location update to backend (every 10 seconds)
        await api.post('/users/location/update', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString(),
        });
        
        console.log(`[Geolocation] Location updated: ${location.latitude}, ${location.longitude}`);
      } catch (error) {
        // Silently handle errors - don't spam the user with notifications
        console.warn('[Geolocation] Failed to update location:', error.message);
      } finally {
        isTrackingRef.current = false;
      }
    };

    // Start tracking - immediate first update
    updateLocation();

    // Set up interval for subsequent updates every 10 seconds
    intervalRef.current = setInterval(updateLocation, UPDATE_INTERVAL);

    // Cleanup on unmount or user change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]); // Re-run when user changes (login/logout)
}


