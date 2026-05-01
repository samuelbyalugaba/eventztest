// Single source of truth for the Supabase client.
// Re-exported from the generated integrations client to prevent
// having two parallel auth/realtime instances (which causes session
// drift, duplicate listeners, and stale data bugs).
export { supabase } from '@/integrations/supabase/client';

export const isSupabaseConfigured = () => true;
