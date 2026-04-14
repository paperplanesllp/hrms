import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Button from "../ui/Button.jsx";
import api from "../../lib/api.js";
import { useAuthStore } from "../../store/authStore.js";

/**
 * Centralized HRMS location tracking provider.
 * Use this file only for live tracking. Do not create duplicate trackers elsewhere.
 * Lifecycle:
 * 1) Wait for auth readiness (user + token + profile data)
 * 2) Check geolocation permission state
 * 3) Start/stop a single watchPosition tracker based on permission and auth state
 * 4) Send live updates to POST /users/location/update
 *
 * ⚠️ Do not create new geolocation trackers. Use this centralized system only.
 */

const LocationContext = createContext(null);

function LocationStatusCard({
  locationPermission,
  locationError,
  currentLocation,
  isTracking,
  isRequesting,
  requestLocationAccess,
}) {
  const showCard = locationPermission === "unknown" || locationPermission === "prompt" || locationPermission === "denied";

  if (!showCard) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Location Status</h3>

      {locationPermission === "unknown" && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Checking location permission...</p>
      )}

      {locationPermission === "prompt" && (
        <>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Enable location access to keep attendance tracking active during your session.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={requestLocationAccess}
              disabled={isRequesting || isTracking}
            >
              {isRequesting ? "Enabling..." : "Enable Location"}
            </Button>
          </div>
        </>
      )}

      {locationPermission === "denied" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">
          Location access is blocked. Please enable it from browser settings.
        </p>
      )}

      {!!locationError && locationPermission !== "unknown" && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-300">{locationError}</p>
      )}

      {currentLocation && locationPermission === "granted" && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Last update: {new Date(currentLocation.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export function useLocationTracking() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationTracking must be used within LocationProvider");
  }
  return context;
}

export default function LocationProvider({ children }) {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [locationPermission, setLocationPermission] = useState("unknown");
  const [locationError, setLocationError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const watchIdRef = useRef(null);
  const permissionStatusRef = useRef(null);
  const isSendingRef = useRef(false);

  const userId = user?._id || user?.id || null;
  const isAuthReady = Boolean(userId && accessToken && user);

  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = null;
    setIsTracking(false);
    isSendingRef.current = false;
  }, []);

  const startLocationTracking = useCallback(() => {
    if (!isAuthReady) {
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      stopLocationTracking();
      setLocationError("Location tracking requires a secure HTTPS connection.");
      return;
    }

    if (!navigator.geolocation) {
      stopLocationTracking();
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    stopLocationTracking();

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Number(position.coords.accuracy.toFixed(2)),
          timestamp: new Date().toISOString(),
        };

        setLocationPermission("granted");
        setLocationError(null);
        setCurrentLocation(nextLocation);

        if (isSendingRef.current) {
          return;
        }

        try {
          isSendingRef.current = true;
          await api.post("/users/location/update", nextLocation);
        } catch (error) {
          setLocationError(error?.response?.data?.message || "Failed to send live location update.");
        } finally {
          isSendingRef.current = false;
        }
      },
      (error) => {
        if (error?.code === 1) {
          setLocationPermission("denied");
          setLocationError("Location access is blocked. Please enable it from browser settings.");
          stopLocationTracking();
          return;
        }

        if (error?.code === 2) {
          setLocationError("Location information is unavailable. Please check device location services.");
          return;
        }

        if (error?.code === 3) {
          setLocationError("Location request timed out. Retrying automatically.");
          return;
        }

        setLocationError("Unable to start location tracking.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
  }, [isAuthReady, stopLocationTracking]);

  const checkLocationPermission = useCallback(async () => {
    if (!isAuthReady) {
      return;
    }

    if (!navigator.geolocation) {
      setLocationPermission("denied");
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    if (!navigator.permissions?.query) {
      setLocationPermission("prompt");
      setLocationError(null);
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      permissionStatusRef.current = status;

      const syncState = (value) => {
        setLocationPermission(value);

        if (value === "granted") {
          setLocationError(null);
          startLocationTracking();
          return;
        }

        if (value === "prompt") {
          stopLocationTracking();
          setLocationError(null);
          return;
        }

        if (value === "denied") {
          stopLocationTracking();
          setLocationError("Location access is blocked. Please enable it from browser settings.");
        }
      };

      syncState(status.state);

      status.onchange = () => {
        syncState(status.state);
      };
    } catch {
      setLocationPermission("prompt");
      setLocationError(null);
    }
  }, [isAuthReady, startLocationTracking, stopLocationTracking]);

  const requestLocationAccess = useCallback(async () => {
    if (!isAuthReady || locationPermission !== "prompt") {
      return;
    }

    setIsRequesting(true);
    setLocationError(null);

    try {
      startLocationTracking();
    } finally {
      setIsRequesting(false);
      await checkLocationPermission();
    }
  }, [checkLocationPermission, isAuthReady, locationPermission, startLocationTracking]);

  useEffect(() => {
    if (!isAuthReady) {
      stopLocationTracking();
      setLocationPermission("unknown");
      setLocationError(null);
      setCurrentLocation(null);

      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }

      permissionStatusRef.current = null;
      return;
    }

    checkLocationPermission();

    return () => {
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [checkLocationPermission, isAuthReady, stopLocationTracking]);

  useEffect(() => {
    return () => {
      stopLocationTracking();
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [stopLocationTracking]);

  const contextValue = useMemo(
    () => ({
      locationPermission,
      locationError,
      currentLocation,
      isTracking,
      checkLocationPermission,
      requestLocationAccess,
      startLocationTracking,
      stopLocationTracking,
    }),
    [
      checkLocationPermission,
      currentLocation,
      isTracking,
      locationError,
      locationPermission,
      requestLocationAccess,
      startLocationTracking,
      stopLocationTracking,
    ]
  );

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
      {isAuthReady && (
        <LocationStatusCard
          locationPermission={locationPermission}
          locationError={locationError}
          currentLocation={currentLocation}
          isTracking={isTracking}
          isRequesting={isRequesting}
          requestLocationAccess={requestLocationAccess}
        />
      )}
    </LocationContext.Provider>
  );
}
