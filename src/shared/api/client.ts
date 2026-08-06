// Re-exports the canonical, deduplicated Supabase client so the app never
// spawns multiple GoTrue clients against the same storage key (which breaks
// session consistency and raises the "Multiple GoTrueClient instances" warning).
//
// Consumers of this module historically received a loosely-typed client
// (SupabaseClient<any>): they read profile/chat/ticket fields as non-null even
// though the DB schema returns `string | null`. We keep that contract here by
// re-exporting the *same runtime instance* through an unspecific type. This
// gives us a single deduplicated client while preserving the codebase's existing
// (lenient) typing. Do not reintroduce a second raw `createClient`.
import type { SupabaseClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase as _supabase } from '../../utils/supabase/client';

export const supabase: SupabaseClient<any, any, any> = _supabase;