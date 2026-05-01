/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const normalizeEnv = (value: unknown) => (typeof value === 'string' ? value.trim() : undefined);
const looksLikeJwt = (value: string) => value.split('.').length === 3;

const supabaseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL);
const anonKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
const legacyKey = normalizeEnv(import.meta.env.VITE_SUPABASE_KEY);

const supabaseKey = (() => {
  if (anonKey && looksLikeJwt(anonKey)) return anonKey;
  if (legacyKey && looksLikeJwt(legacyKey)) return legacyKey;
  return undefined;
})();

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseKey !== 'placeholder' &&
    looksLikeJwt(supabaseKey)
  );
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    }
  }
);
