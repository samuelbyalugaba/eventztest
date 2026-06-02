
  import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/registerSW";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { MessagingProvider } from "./contexts/MessagingContext";
import { configureNativeRuntime } from "./utils/nativeRuntime";

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
  } catch {
    // Reload below is the actual recovery; cache cleanup is best-effort.
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
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MessagingProvider>
          <App />
        </MessagingProvider>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
);

// App entry
