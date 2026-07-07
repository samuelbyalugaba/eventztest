import { supabase } from './supabase/client';

export type EmailPreferences = {
  user_id: string;
  product_updates: boolean;
  event_reminders: boolean;
  social_notifications: boolean;
  marketing: boolean;
  transactional: boolean;
  security: boolean;
  unsubscribed_at?: string | null;
};

export type EmailPreferenceUpdate = Partial<
  Pick<EmailPreferences, 'product_updates' | 'event_reminders' | 'social_notifications' | 'marketing'>
>;

type SocialEmailKind = 'like' | 'comment' | 'follow';

export const DEFAULT_EMAIL_PREFERENCES = {
  product_updates: true,
  event_reminders: true,
  social_notifications: false,
  marketing: true,
  transactional: true,
  security: true,
};

export const getEmailPreferences = async (userId: string): Promise<EmailPreferences> => {
  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) return data as EmailPreferences;

  const { data: created, error: createError } = await supabase
    .from('email_preferences')
    .insert({ user_id: userId, ...DEFAULT_EMAIL_PREFERENCES })
    .select('*')
    .single();

  if (createError) throw createError;
  return created as EmailPreferences;
};

export const updateEmailPreferences = async (
  userId: string,
  updates: EmailPreferenceUpdate
): Promise<EmailPreferences> => {
  const { data, error } = await supabase
    .from('email_preferences')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as EmailPreferences;
};

export const getEmailSystemState = async () => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { kind: 'config' },
  });

  if (error) return { configured: false, from: '' };
  return data as { configured?: boolean; from?: string };
};

export const sendSocialEmailNotification = async (
  kind: SocialEmailKind,
  payload: { postId?: number; commentId?: number; targetUserId?: string }
) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await supabase.functions.invoke('send-email', {
      body: { kind, ...payload },
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.warn('Failed to send email notification:', error);
  }
};
