import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

if (import.meta.env.DEV && typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });

  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key);
      });
    });
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
