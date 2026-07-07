import { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { checkUsernameUnique } from '../utils/supabase/api';
import { toast } from 'sonner';

function getEmailRedirectTo(next = '/events') {
  const origin = window.location.origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function validateForm(
  formData: { email: string; password: string; fullName: string },
  isLogin: boolean,
) {
  if (!formData.email || !formData.password) {
    toast.error('Missing Fields', { description: 'Please fill in all required fields.' });
    return false;
  }
  if (!isLogin && !formData.fullName) {
    toast.error('Missing Name', { description: 'Please enter your full name.' });
    return false;
  }
  if (formData.password.length < 6) {
    toast.error('Weak Password', { description: 'Password must be at least 6 characters long.' });
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    toast.error('Invalid Email', { description: 'Please enter a valid email address.' });
    return false;
  }
  return true;
}

export function useAuthSubmit(
  isLogin: boolean,
  formData: { email: string; password: string; fullName: string },
  isConfigured: boolean,
  onAuthSuccess: (accessToken: string, user: any) => void,
  onSignupNeedsEmailConfirmation?: () => void,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      toast.error('Configuration Error', { description: 'Cannot proceed without database connection.' });
      return;
    }

    if (!validateForm(formData, isLogin)) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.session && data.user) {
          let userName = data.user.user_metadata?.name || data.user.email || 'User';
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('id', data.user.id)
              .single();

            const displayFromProfile =
              profile?.full_name ||
              (profile?.username ? `@${String(profile.username).replace(/^@/, '')}` : null);

            if (displayFromProfile) userName = displayFromProfile;
          } catch (error) {
            console.error('Failed to load user profile:', error);
          }

          toast.success('Welcome back!', { description: `Signed in as ${userName}` });
          onAuthSuccess(data.session.access_token, data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: getEmailRedirectTo('/events'),
            data: {
              name: formData.fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          if (data.session) {
            const baseUsername = formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
            let finalUsername = baseUsername;
            let isUnique = await checkUsernameUnique(finalUsername);

            if (!isUnique) {
              let counter = 1;
              while (counter <= 10) {
                const candidate = `${baseUsername}${counter}`;
                if (await checkUsernameUnique(candidate)) {
                  finalUsername = candidate;
                  isUnique = true;
                  break;
                }
                counter++;
              }
              if (!isUnique) {
                finalUsername = `${baseUsername}${Math.floor(Date.now() % 10000)}`;
              }
            }

            const { error: profileError } = await supabase
              .from('profiles')
              .upsert([
                {
                  id: data.user.id,
                  email: formData.email,
                  full_name: formData.fullName,
                  username: finalUsername,
                  avatar_url: null,
                },
              ], { onConflict: 'id', ignoreDuplicates: true });

            if (profileError) {
              // Continue anyway as auth succeeded
            }

            toast.success('Account Created!', { description: `Welcome to Eventz, ${formData.fullName}!` });
            onAuthSuccess(data.session.access_token, data.user);
          } else {
            toast.success('Signup Successful', { description: 'Please check your email to confirm your account.' });
            onSignupNeedsEmailConfirmation?.();
          }
        }
      }
    } catch (error: any) {
      let message = error.message || 'An unexpected error occurred.';
      if (message.includes('Invalid login credentials')) message = 'Incorrect email or password.';
      if (message.includes('User already registered')) message = 'This email is already registered. Please login.';
      if (message.includes('Email not confirmed')) message = 'Please verify your email before signing in.';

      toast.error('Authentication Failed', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSubmitState = () => setIsSubmitting(false);

  return { handleSubmit, isSubmitting, resetSubmitState };
}
