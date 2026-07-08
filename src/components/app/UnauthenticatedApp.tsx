import { Toaster } from 'sonner';
import { AuthScreen } from '../AuthScreen';
import { AuthCallbackPage } from '../AuthCallbackPage';
import { LegalPage } from '../legal/LegalPage';
import { DeleteAccountPage } from '../legal/DeleteAccountPage';
import type { Location } from 'react-router-dom';

interface UnauthenticatedAppProps {
  location: Location;
  onAuthSuccess: (token: string, user: any) => void;
}

export default function UnauthenticatedApp({ location, onAuthSuccess }: UnauthenticatedAppProps) {
  if (location.pathname === '/auth/callback') {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gray-50">
        <Toaster position="top-center" richColors={false} closeButton toastOptions={{ duration: 2500 }} />
        <AuthCallbackPage />
      </div>
    );
  }

  if (location.pathname === '/privacy' || location.pathname === '/terms' || location.pathname === '/delete-account') {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gray-50">
        <Toaster position="top-center" richColors={false} closeButton toastOptions={{ duration: 2500 }} />
        {location.pathname === '/delete-account'
          ? <DeleteAccountPage />
          : <LegalPage type={location.pathname === '/privacy' ? 'privacy' : 'terms'} />}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-y-auto bg-gray-50">
      <Toaster position="top-center" richColors={false} closeButton toastOptions={{ duration: 2500 }} />
      <AuthScreen onAuthSuccess={onAuthSuccess} />
    </div>
  );
}
