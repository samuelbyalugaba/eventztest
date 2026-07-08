
import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/registerSW";


import { AuthProvider } from "./contexts/AuthContext";
import { MessagingProvider } from "./contexts/MessagingContext";
import { configureNativeRuntime } from "./utils/nativeRuntime";
import { queryClient } from "./queryClient";

Sentry.init({
  dsn: "https://7b817c9e06419fc7dc62b72df3867c77@o4511699114983424.ingest.de.sentry.io/4511699126648912",
  dataCollection: {
    // userInfo: false,
    // httpBodies: []
  }
});

try {
  void configureNativeRuntime();
  registerServiceWorker();
} catch (e) {
}

const CHUNK_RELOAD_KEY = 'eventz-chunk-reload-attempted-at';
const recoverFromBundleError = async () => {
  const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 60_000) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith('eventz-')).map((name) => caches.delete(name)));
    }
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations || []).map((registration) => registration.update()));
  } catch (error) {
    console.warn('Failed to clean up caches for bundle reload:', error);
  }

  window.location.reload();
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  void recoverFromBundleError();
});

window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '');
  if (/failed to fetch dynamically imported module|importing a module script failed|loading chunk/i.test(message)) {
    event.preventDefault();
    void recoverFromBundleError();
  }
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
      <p className="text-gray-600 mb-4">EVENTZ hit an unexpected error. Try refreshing.</p>
      <button onClick={() => window.location.reload()} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">Refresh app</button>
    </div>
  </div>}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <MessagingProvider>
            <App />
          </MessagingProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

// App entry
