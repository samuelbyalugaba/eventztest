import { useState } from 'react';
import { nativeOAuthSupabase, supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { getNativeAuthRedirectTo, isNativeCapacitor } from '../utils/platform';

function getEmailRedirectTo(next = '/events') {
  const origin = window.location.origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function useOAuthNative(
  isConfigured: boolean,
  onAuthSuccess: (accessToken: string, user: any) => void,
) {
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);

  const finishNativeOAuthSignIn = async (callbackUrl: string, providerLabel: string) => {
    const url = new URL(callbackUrl);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const oauthError =
      url.searchParams.get('error_description') ||
      url.searchParams.get('error') ||
      hashParams.get('error_description') ||
      hashParams.get('error');
    if (oauthError) throw new Error(oauthError);

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (!data.session || !data.user) throw new Error(`${providerLabel} sign-in did not return a session.`);

      toast.success('Welcome back!');
      onAuthSuccess(data.session.access_token, data.user);
      return;
    }

    const code = url.searchParams.get('code');
    if (!code) throw new Error(`${providerLabel} sign-in did not return an authorization code.`);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session || !data.user) throw new Error(`${providerLabel} sign-in did not return a session.`);

    toast.success('Welcome back!');
    onAuthSuccess(data.session.access_token, data.user);
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    if (!isConfigured) {
      toast.error('Configuration Error', { description: 'Cannot proceed without database connection.' });
      return;
    }
    const providerLabel = provider === 'apple' ? 'Apple' : 'Google';
    const setProviderSubmitting = provider === 'apple' ? setIsAppleSubmitting : setIsGoogleSubmitting;
    setProviderSubmitting(true);
    try {
      if (isNativeCapacitor()) {
        const [{ App }, { Browser }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser')]);
        const redirectTo = getNativeAuthRedirectTo();
        let completed = false;
        let urlOpenHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;
        let browserFinishedHandle: Awaited<ReturnType<typeof Browser.addListener>> | null = null;

        const cleanup = async () => {
          await Promise.all([urlOpenHandle?.remove(), browserFinishedHandle?.remove()]);
        };

        urlOpenHandle = await App.addListener('appUrlOpen', ({ url }) => {
          if (!url.startsWith(redirectTo) || completed) return;
          completed = true;

          void (async () => {
            try {
              await cleanup();
              await Browser.close().catch(() => undefined);
              await finishNativeOAuthSignIn(url, providerLabel);
            } catch (error: any) {
              const message = error?.message || `${providerLabel} sign-in failed.`;
              toast.error('Authentication Failed', { description: message });
            } finally {
              setProviderSubmitting(false);
            }
          })();
        });

        browserFinishedHandle = await Browser.addListener('browserFinished', () => {
          if (completed) return;
          completed = true;
          void cleanup();
          setProviderSubmitting(false);
        });

        try {
          const { data, error } = await nativeOAuthSupabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo,
              skipBrowserRedirect: true,
            },
          });
          if (error) throw error;
          if (!data.url) throw new Error(`${providerLabel} sign-in did not return an authorization URL.`);

          await Browser.open({ url: data.url, toolbarColor: '#FAFAFA' });
        } catch (error) {
          completed = true;
          await cleanup();
          throw error;
        }
        return;
      }

      const redirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL || getEmailRedirectTo('/events');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: any) {
      const message = error?.message || `${providerLabel} sign-in failed.`;
      toast.error('Authentication Failed', { description: message });
      setProviderSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => handleOAuthSignIn('google');
  const handleAppleSignIn = () => handleOAuthSignIn('apple');
  const isOAuthSubmitting = isGoogleSubmitting || isAppleSubmitting;

  return { handleGoogleSignIn, handleAppleSignIn, isGoogleSubmitting, isAppleSubmitting, isOAuthSubmitting };
}
