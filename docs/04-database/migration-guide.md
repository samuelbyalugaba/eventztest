# Migration Guide

## How Supabase Migrations Work

Supabase uses numbered SQL migration files in `supabase/migrations/`. Each file is a plain `.sql` file executed in order against the database. Migrations are **one-way** — there is no built-in rollback.

### Execution Order

Migrations run in filename order. The naming convention uses a timestamp prefix:

```
YYYYMMDDHHMMSS_description.sql
```

Example from this project:
```
20260310120007_fix_integrity.sql          → 2026-03-10 12:00:07
20260310120008_fix_qa_vulnerabilities.sql → 2026-03-10 12:00:08
20260310120009_fix_transactions_rls.sql   → 2026-03-10 12:00:09
```

### Current Migration Count

**48 migration files** across 2024-2026, plus 1 directory (`archive/`) with 7 old schema dumps.

## Naming Conventions

This project uses two naming patterns:

### Pattern 1: Timestamp-Prefix (Primary)
```
YYYYMMDDHHMMSS_descriptive_name.sql
```
- `HHMMSS` ensures ordering within the same day
- Multiple migrations on the same day get sequential suffixes: `120007`, `120008`, `120009`

### Pattern 2: Date-Prefix (Legacy)
```
YYYYMMDD_descriptive_name.sql
```
Used by early migrations (2024). Lacks time precision.

### Descriptive Name Conventions

| Pattern | Examples | Use Case |
|---------|----------|----------|
| `fix_*` | `fix_integrity`, `fix_transactions_rls` | Bug fixes, security patches |
| `rls_hardening` | `rls_hardening`, `secure_messaging` | RLS policy improvements |
| `add_*` | `add_push_subscriptions`, `add_notification_read_timestamp` | New tables or columns |
| `create_*` | `create_cloudflare_streams`, `create_transactions_table` | New tables |
| `update_purchase_ticket*` | `update_purchase_ticket_v2`, `update_purchase_ticket_rpc` | RPC rewrites |
| `security_fixes` | `security_fixes`, `fix_qa_vulnerabilities` | Security improvements |
| `performance_fixes` | `performance_fixes` | Index and query optimization |

## How to Create a New Migration

### 1. Using Supabase CLI

```bash
# Generate a new migration file with timestamp
supabase migration new <descriptive_name>

# Example
supabase migration new add_stream_chat_index
# Creates: supabase/migrations/20260728XXXXXX_add_stream_chat_index.sql
```

### 2. Manual Creation

Create a file in `supabase/migrations/` with the timestamp format:

```bash
# Get current timestamp in the right format
date +%Y%m%d%H%M%S
# Output: 20260728120000

# Create the file
touch supabase/migrations/20260728120000_add_stream_chat_index.sql
```

### 3. Write the SQL

```sql
-- Migration: Add index for stream chat messages
-- Author: <your name>
-- Date: 2026-07-28

CREATE INDEX IF NOT EXISTS idx_stream_chat_messages_event_created
  ON public.stream_chat_messages (event_id, created_at DESC);
```

### 4. Apply the Migration

```bash
# Local development
supabase db reset        # Reset and re-run all migrations
supabase migration up    # Run pending migrations only

# Production (via Supabase Dashboard)
# Go to SQL Editor → paste SQL → execute
# Or: supabase db push (applies to linked remote project)
```

## Testing Migrations

### Local Testing

```bash
# Reset database to clean state and re-run all migrations
supabase db reset

# Verify table exists
supabase db inspect table stream_chat_messages

# Run migration against test database
supabase migration up
```

### Production Testing Checklist

1. **Backup first**: Take a database backup before applying
2. **Test on staging**: Apply to staging environment first
3. **Verify RLS**: After table changes, confirm RLS policies are active
4. **Check indexes**: `\d+ table_name` to verify index creation
5. **Test queries**: Run the queries that depend on the change
6. **Monitor performance**: Check `pg_stat_user_indexes` for index usage

### Post-Migration Verification

```sql
-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'your_table';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'your_table';

-- Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'your_table';
```

## Rollback Procedures

Supabase has **no built-in rollback**. Each migration must be manually reversed.

### Manual Rollback Pattern

Create a new migration that undoes the previous one:

```sql
-- Migration: Undo add_stream_chat_index
-- This is a new migration, NOT editing the old one

DROP INDEX IF EXISTS idx_stream_chat_messages_event_created;
```

### Common Rollback Templates

#### Drop a Table

```sql
-- Rollback: Drop table created in previous migration
DROP TABLE IF EXISTS public.new_table CASCADE;
```

#### Remove a Column

```sql
-- Rollback: Remove column added in previous migration
ALTER TABLE public.events DROP COLUMN IF EXISTS new_column;
```

#### Remove an Index

```sql
-- Rollback: Remove index created in previous migration
DROP INDEX IF EXISTS idx_name;
```

#### Revert RLS Policy

```sql
-- Rollback: Remove policy added in previous migration
DROP POLICY IF EXISTS "Policy name" ON public.table_name;
```

#### Revert a Function

```sql
-- Rollback: Restore previous function version
CREATE OR REPLACE FUNCTION public.my_function(...)
RETURNS ...
AS $$
  -- previous implementation
$$;
```

## Common Patterns

### Pattern 1: Add Column

```sql
-- Add column with default
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS new_field TEXT DEFAULT 'default_value';

-- Add column (nullable)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS optional_field TEXT;
```

**Migration reference**: `20260309000100_unified_profile.sql` (added 10+ columns to `profiles`)

### Pattern 2: Add Index

```sql
-- Simple index
CREATE INDEX IF NOT EXISTS idx_table_column
  ON public.table_name (column_name);

-- Composite index
CREATE INDEX IF NOT EXISTS idx_table_col1_col2
  ON public.table_name (col1, col2 DESC);

-- Partial index
CREATE INDEX IF NOT EXISTS idx_table_partial
  ON public.table_name (col1, col2)
  WHERE status = 'active';

-- GIN index for JSONB
CREATE INDEX IF NOT EXISTS idx_table_jsonb_gin
  ON public.table_name USING gin (jsonb_column);
```

**Migration reference**: `20260310120007_fix_integrity.sql` (8 FK indexes), `20260310120008_fix_qa_vulnerabilities.sql` (3 indexes)

### Pattern 3: RLS Policy

```sql
-- Enable RLS (required first)
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Drop existing policy (idempotent)
DROP POLICY IF EXISTS "Policy name" ON public.table_name;

-- Create SELECT policy
CREATE POLICY "Policy name"
  ON public.table_name
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create INSERT policy with CHECK
CREATE POLICY "Insert policy"
  ON public.table_name
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create ALL policy (for own records)
CREATE POLICY "Full access own records"
  ON public.table_name
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin/moderator policy using JWT claims
CREATE POLICY "Admins can manage"
  ON public.table_name
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));
```

**Migration references**:
- `20260310120021_secure_messaging.sql` (messaging RLS)
- `20260310120008_fix_qa_vulnerabilities.sql` (organizer_profiles RLS)
- `20260528223151_app_review_moderation_tables.sql` (reports, user_blocks RLS)
- `20260723000000_create_idempotency_keys.sql` (idempotency RLS)

### Pattern 4: RPC Function (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.my_rpc_function(
  p_param1 BIGINT,
  p_param2 TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variable RECORD;
BEGIN
  -- Validate input
  IF p_param1 IS NULL THEN
    RAISE EXCEPTION 'Parameter required';
  END IF;

  -- Lock row for update (race condition prevention)
  SELECT * INTO v_variable
  FROM public.table_name
  WHERE id = p_param1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not found';
  END IF;

  -- Perform operations
  INSERT INTO public.other_table (...) VALUES (...);

  RETURN json_build_object('status', 'success', 'id', v_new_id);
END;
$$;
```

**Migration references**:
- `20260310120013_race_condition_fixes.sql` (`purchase_ticket` with `FOR UPDATE`)
- `20260310120012_performance_fixes.sql` (`get_organizer_stats`, `get_event_analytics`)
- `20260303_scan_ticket_rpc.sql` (`scan_ticket`)
- `20260309_become_organizer_rpc.sql` (`become_organizer`)

### Pattern 5: Trigger for Updated-At

```sql
-- Create trigger function (once per database)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply trigger to table
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON public.table_name
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Migration reference**: `20260310120010_fix_updated_at_column.sql`

### Pattern 6: Create Table with Full Metadata

```sql
CREATE TABLE IF NOT EXISTS public.table_name (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  some_field TEXT NOT NULL DEFAULT 'value',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT table_name_check CHECK (some_field IN ('option1', 'option2'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_name_user_id
  ON public.table_name (user_id);

-- RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own records"
  ON public.table_name FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated-at trigger
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON public.table_name
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO authenticated;
```

**Migration reference**: `20260611145454_email_system.sql` (email_preferences, email_deliveries)

## Migration Health Summary

| Category | Count | Examples |
|----------|-------|----------|
| Schema creation | ~8 | Initial tables, cloudflare_streams, transactions |
| RLS hardening | ~12 | rls_hardening, secure_messaging, fix_transactions_rls |
| Security fixes | ~8 | security_fixes, fix_qa_vulnerabilities, race_condition_fixes |
| Bug fixes | ~12 | fix_chat_trigger_error, fix_downgrade_*, fix_profile_trigger_bypass |
| Performance | ~3 | performance_fixes, fix_integrity (indexes) |
| Feature additions | ~5 | scan_ticket_rpc, email_system, push_subscriptions |

### Known Issues

- Several migrations fix previous migrations (e.g., `fix_downgrade_permissions` → `fix_downgrade_trigger_bypass` → `fix_profile_trigger_bypass`)
- `purchase_ticket` RPC has been rewritten 4 times across migrations
- Archive directory contains 7 old schema dumps — should be cleaned up
- No automated migration testing framework in place
- Some migrations use `IF EXISTS`/`IF NOT EXISTS` for idempotency, others don't
