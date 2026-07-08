/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../integrations/supabase/types';

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

const resolvedSupabaseUrl = supabaseUrl || '';
const resolvedSupabaseKey = supabaseKey || '';

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    supabaseUrl !== '' &&
    supabaseKey !== '' &&
    looksLikeJwt(supabaseKey)
  );
};

const createSupabaseClientInstance = () => createClient<Database>(
  resolvedSupabaseUrl,
  resolvedSupabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    }
  }
);

const createNativeOAuthSupabaseClientInstance = () => createClient<Database>(
  resolvedSupabaseUrl,
  resolvedSupabaseKey,
  {
    auth: {
      storageKey: 'eventz-native-oauth',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  }
);

declare global {
  var __eventzSupabaseClient: ReturnType<typeof createSupabaseClientInstance> | undefined;
  var __eventzNativeOAuthSupabaseClient: ReturnType<typeof createNativeOAuthSupabaseClientInstance> | undefined;
}

export const supabase =
  globalThis.__eventzSupabaseClient ??
  (globalThis.__eventzSupabaseClient = createSupabaseClientInstance());

export const nativeOAuthSupabase =
  globalThis.__eventzNativeOAuthSupabaseClient ??
  (globalThis.__eventzNativeOAuthSupabaseClient = createNativeOAuthSupabaseClientInstance());
