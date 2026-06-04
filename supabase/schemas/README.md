# Supabase Declarative Schema

This directory is the canonical home for declarative schema SQL when schema pulls are available.

Current migrations remain in `supabase/migrations`. When updating database structure:

1. Apply and validate changes locally.
2. Generate or update schema SQL with the Supabase CLI.
3. Commit both the schema update and the generated migration.

Keep RLS and role grants visible in version-controlled SQL for every table exposed through the Data API.
