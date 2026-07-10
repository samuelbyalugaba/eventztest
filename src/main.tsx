
import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/registerSW";


import { AuthProvider } from "./contexts/AuthContext";
import { MessagingProvider } from "./contexts/MessagingContext";
import { configureNativeRuntime } from "./utils/nativeRuntime";
import { queryClient } from "./queryClient";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD,
  dataCollection: {},
});

// Defer non-critical bootstrap to idle so first paint isn't blocked.
const runIdle = (cb: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout: 2000 });
  else window.setTimeout(cb, 500);
};

runIdle(() => {
  try {
    void configureNativeRuntime();
    registerServiceWorker();
  } catch (e) {
    console.warn('Native runtime init failed:', e);
  }
});

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
  <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="bg-card p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-border">
      <h1 className="text-2xl font-bold text-foreground mb-3">Something went wrong</h1>
      <p className="text-muted-foreground mb-6">Eventz hit an unexpected error. Try refreshing the app.</p>
      <button onClick={() => window.location.reload()} className="rounded-full bg-primary text-primary-foreground py-2.5 px-6 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">Refresh app</button>
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
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

// App entry
