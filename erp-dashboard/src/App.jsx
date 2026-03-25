import React from "react";
import AppRoutes from "./app/routes.jsx";
import ToastHost from "./components/ui/Toast.jsx";
import SocketProvider from "./components/providers/SocketProvider.jsx";
import { ThemeProvider } from "./components/providers/ThemeProvider.jsx";
import useGeolocationTracker from "./lib/useGeolocationTracker.js";

export default function App() {
  // Track user geolocation every 10 seconds for HR and employees
  useGeolocationTracker();

  return (
    <ThemeProvider>
      <SocketProvider>
        <AppRoutes />
        <ToastHost />
      </SocketProvider>
    </ThemeProvider>
  );
}
