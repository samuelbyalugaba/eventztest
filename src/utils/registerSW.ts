import { toast } from 'sonner';

export const registerServiceWorker = async () => {
  // Only register in production; in dev, unregister any existing SW to avoid intercepting API calls
  if ('serviceWorker' in navigator) {
    if (!import.meta.env.PROD) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
        console.log('Service Worker unregistered in development.');
      } catch (e) {
        console.warn('Failed to unregister Service Worker in dev:', e);
      }
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully:', registration);

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
              toast.success('New version available! Refresh to update.', {
                duration: 10000,
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Check if app is installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

