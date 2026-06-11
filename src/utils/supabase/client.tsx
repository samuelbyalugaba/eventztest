/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

const resolvedSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const resolvedSupabaseKey = supabaseKey || 'placeholder';

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseKey !== 'placeholder' &&
    looksLikeJwt(supabaseKey)
  );
};

type EventzSupabaseClient = SupabaseClient<any, 'public', 'public'>;

const createSupabaseClientInstance = (): EventzSupabaseClient => createClient<any, 'public', 'public'>(
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

const createNativeOAuthSupabaseClientInstance = (): EventzSupabaseClient => createClient<any, 'public', 'public'>(
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

type SupabaseClientInstance = EventzSupabaseClient;
type NativeOAuthSupabaseClientInstance = EventzSupabaseClient;

declare global {
  var __eventzSupabaseClient: SupabaseClientInstance | undefined;
  var __eventzNativeOAuthSupabaseClient: NativeOAuthSupabaseClientInstance | undefined;
}

export const supabase =
  globalThis.__eventzSupabaseClient ??
  (globalThis.__eventzSupabaseClient = createSupabaseClientInstance());

export const nativeOAuthSupabase =
  globalThis.__eventzNativeOAuthSupabaseClient ??
  (globalThis.__eventzNativeOAuthSupabaseClient = createNativeOAuthSupabaseClientInstance());
