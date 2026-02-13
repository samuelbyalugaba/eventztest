-- Add price column to tickets table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'price') THEN
        ALTER TABLE tickets ADD COLUMN price TEXT;
    END IF;
END $$;
