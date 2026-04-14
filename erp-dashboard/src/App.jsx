import React from "react";
import AppRoutes from "./app/routes.jsx";
import ToastHost from "./components/ui/Toast.jsx";
import SocketProvider from "./components/providers/SocketProvider.jsx";
import LocationProvider from "./components/providers/LocationProvider.jsx";
import { ThemeProvider } from "./components/providers/ThemeProvider.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <LocationProvider>
          <AppRoutes />
          <ToastHost />
        </LocationProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
