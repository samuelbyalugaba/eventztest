import { toast } from 'sonner';
import { isNativeCapacitor } from './platform';

const clearEventzCaches = async () => {
  if (!('caches' in window)) return;

  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('eventz-'))
      .map((name) => caches.delete(name))
  );
};

const unregisterServiceWorkers = async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
};

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const isLocalDevelopment =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    // Capacitor ships bundled assets, so a PWA service worker can keep Android/iOS
    // WebViews pinned to stale JS chunks after an app update.
    if (isNativeCapacitor() || isLocalDevelopment) {
      try {
        await unregisterServiceWorkers();
        await clearEventzCaches();
      } catch (e) {
      }
      return;
    }
    try {
      let refreshing = false;
      let userRequestedRefresh = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!userRequestedRefresh) return;
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      await registration.update();

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, show update prompt
              toast.success('New version available.', {
                duration: 10000,
                action: {
                  label: 'Refresh',
                  onClick: () => {
                    userRequestedRefresh = true;
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  },
                },
              });
            }
          });
        }
      });

      return registration;
    } catch (error) {
    }
  }
};

// Check if app is installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

