import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getProfile, updateProfile } from '../utils/supabase/api';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const checkDismissal = async () => {
      let dismissed = localStorage.getItem('eventz-pwa-dismissed');

      // Check Supabase if user is logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getProfile(user.id);
          
          if (profile?.preferences?.pwaDismissed) {
            dismissed = profile.preferences.pwaDismissed;
            // Clear local storage if we have it in cloud to avoid sync issues
            if (localStorage.getItem('eventz-pwa-dismissed')) {
              localStorage.removeItem('eventz-pwa-dismissed');
            }
          } else if (dismissed) {
            // Migration: User has local dismissal but not in cloud
            const currentPreferences = profile?.preferences || {};
            await updateProfile(user.id, {
              preferences: {
                ...currentPreferences,
                pwaDismissed: dismissed
              }
            });
            localStorage.removeItem('eventz-pwa-dismissed');
          }
        }
      } catch (error) {
        console.error('Error checking PWA dismissal:', error);
      }

      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Show again after 7 days
        if (daysSinceDismissed < 7) {
          return;
        }
      }
      
      // Listen for the beforeinstallprompt event if not dismissed recently
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        
        // Show prompt after 5 seconds
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    };

    checkDismissal();

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA installed');
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success('EVENTZ installed successfully! 🎉');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      toast.success('Installing EVENTZ... 📲');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = async () => {
    setShowPrompt(false);
    const dismissedDate = new Date().toISOString();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfile(user.id);
        const currentPreferences = profile?.preferences || {};
        
        // Commented out to avoid PGRST204 error
        // await updateProfile(user.id, {
        //   preferences: {
        //     ...currentPreferences,
        //     pwaDismissed: dismissedDate
        //   }
        // });
        
        // Fallback to local storage since we can't save to profile
        localStorage.setItem('eventz-pwa-dismissed', dismissedDate);
      } else {
        localStorage.setItem('eventz-pwa-dismissed', dismissedDate);
      }
    } catch (error) {
      console.error('Error saving dismissal:', error);
      // Fallback
      localStorage.setItem('eventz-pwa-dismissed', dismissedDate);
    }
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="p-5">
          {/* Icon */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-purple-600" />
            </div>

            <div className="flex-1 pr-6">
              <h3 className="text-gray-900 font-bold text-lg mb-1">Install App</h3>
              <p className="text-gray-600 text-sm mb-4">
                Get the full experience with offline access and instant notifications
              </p>

              {/* Features - Simplified */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-gray-50 text-gray-600 text-[10px] font-medium px-2 py-1 rounded-full border border-gray-100">Works offline</span>
                <span className="bg-gray-50 text-gray-600 text-[10px] font-medium px-2 py-1 rounded-full border border-gray-100">Faster loading</span>
                <span className="bg-gray-50 text-gray-600 text-[10px] font-medium px-2 py-1 rounded-full border border-gray-100">Live updates</span>
              </div>

              {/* Install Button */}
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-xl hover:bg-neutral-800 transition-all font-semibold shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Add to Home Screen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
