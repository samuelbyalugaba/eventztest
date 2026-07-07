import { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

function getEmailRedirectTo(next = '/events') {
  const origin = window.location.origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function validateEmailOnly(email: string) {
  if (!email) {
    toast.error('Email required', { description: 'Enter your email address first.' });
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast.error('Invalid Email', { description: 'Please enter a valid email address.' });
    return false;
  }
  return true;
}

export function useEmailActions(
  isConfigured: boolean,
  formData: { email: string },
) {
  const [isEmailActionSubmitting, setIsEmailActionSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (!isConfigured || !validateEmailOnly(formData.email)) return;

    setIsEmailActionSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: getEmailRedirectTo('/events'),
      });
      if (error) throw error;
      toast.success('Reset email sent', { description: 'Check your inbox for the password reset link.' });
    } catch (error: any) {
      toast.error('Could not send reset email', { description: error?.message || 'Please try again.' });
    } finally {
      setIsEmailActionSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!isConfigured || !validateEmailOnly(formData.email)) return;

    setIsEmailActionSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: getEmailRedirectTo('/events'),
        },
      });
      if (error) throw error;
      toast.success('Verification email sent', { description: 'Check your inbox to confirm your account.' });
    } catch (error: any) {
      toast.error('Could not send verification email', { description: error?.message || 'Please try again.' });
    } finally {
      setIsEmailActionSubmitting(false);
    }
  };

  return { handleResetPassword, handleResendVerification, isEmailActionSubmitting };
}
