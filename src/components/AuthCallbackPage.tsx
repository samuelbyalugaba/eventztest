import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

const getHashParams = () => new URLSearchParams(window.location.hash.replace(/^#/, ''));

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const nextPath = params.get('next') || '/events';

  useEffect(() => {
    let active = true;

    const finishCallback = async () => {
      try {
        const code = params.get('code');
        const hashParams = getHashParams();
        const type = params.get('type') || hashParams.get('type');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && !/already.*used|invalid.*code/i.test(error.message || '')) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (type === 'recovery') {
          if (active) {
            setIsRecovery(true);
            setIsReady(true);
          }
          return;
        }

        if (data.session) {
          toast.success('Email verified');
          navigate(nextPath, { replace: true });
          return;
        }

        toast.success('Email link confirmed. Please sign in.');
        navigate('/events', { replace: true });
      } catch (error: any) {
        toast.error(error?.message || 'Email link could not be verified');
        navigate('/events', { replace: true });
      }
    };

    void finishCallback();

    return () => {
      active = false;
    };
  }, [navigate, nextPath, params]);

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated');
      navigate(nextPath, { replace: true });
    } catch (error: any) {
      toast.error(error?.message || 'Could not update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRecovery && isReady) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 px-4 py-12 flex items-center justify-center">
        <form onSubmit={handlePasswordUpdate} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Create a new password</h1>
          <p className="mt-1 text-sm text-gray-500">Use a strong password you have not used before.</p>

          <div className="mt-5 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-gray-900 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-900" />
        <p className="mt-3 text-sm font-medium text-gray-600">Finishing sign in...</p>
      </div>
    </div>
  );
}
