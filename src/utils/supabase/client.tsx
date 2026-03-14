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

  if (anonKey || legacyKey) {
    console.error(
      'Invalid Supabase key format. Use the Supabase "anon" key (JWT-looking value with 2 dots) in VITE_SUPABASE_ANON_KEY (preferred) or VITE_SUPABASE_KEY (legacy).'
    );
  }
  return undefined;
})();

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file or Vercel project settings.');
}

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseKey !== 'placeholder' &&
    looksLikeJwt(supabaseKey)
  );
};

// Create a singleton Supabase client
// Use fallback values to prevent app crash on load if env vars are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
