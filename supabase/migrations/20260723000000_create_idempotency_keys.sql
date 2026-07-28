-- Idempotency keys for financial operations
-- Prevents double-charges on wallet payments and gift transfers

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  operation TEXT NOT NULL,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(user_id, key)
);

-- Index for fast lookups by user_id + key
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_key ON idempotency_keys(user_id, key);

-- Index for cleanup of expired keys
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- RLS policies
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Users can only read their own idempotency keys
CREATE POLICY "Users can read own idempotency keys"
  ON idempotency_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own idempotency keys
CREATE POLICY "Users can insert own idempotency keys"
  ON idempotency_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own idempotency keys (for status changes)
CREATE POLICY "Users can update own idempotency keys"
  ON idempotency_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all idempotency keys (for cleanup)
CREATE POLICY "Service role can manage all idempotency keys"
  ON idempotency_keys
  FOR ALL
  TO service_role
  USING (true);

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM idempotency_keys
  WHERE expires_at < NOW();
END;
$$;

-- Create a scheduled job to clean up expired keys (runs daily)
-- Note: This requires pg_cron extension. If not available, run manually.
-- SELECT cron.schedule('cleanup-idempotency-keys', '0 2 * * *', 'SELECT cleanup_expired_idempotency_keys()');
