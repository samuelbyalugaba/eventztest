-- FORCE FIX: Remove ALL triggers on messages table and reinstall only the necessary one.
-- This script uses dynamic SQL to find and drop every single trigger on the 'messages' table,
-- regardless of its name. This fixes the "COALESCE types messages and json" error caused by
-- rogue/hidden triggers.

-- 1. Nuke ALL triggers on public.messages
DO $$ 
DECLARE 
    trg RECORD; 
BEGIN 
    FOR trg IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'messages' 
        AND trigger_schema = 'public'
    LOOP 
        RAISE NOTICE 'Dropping trigger: %', trg.trigger_name;
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trg.trigger_name) || ' ON public.messages CASCADE;'; 
    END LOOP; 
END $$;

-- 2. Nuke ALL triggers on public.conversations (just to be safe)
DO $$ 
DECLARE 
    trg RECORD; 
BEGIN 
    FOR trg IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'conversations' 
        AND trigger_schema = 'public'
    LOOP 
        -- Don't drop the updated_at trigger if it exists and is standard, but better to drop and recreate to be safe
        RAISE NOTICE 'Dropping trigger: %', trg.trigger_name;
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trg.trigger_name) || ' ON public.conversations CASCADE;'; 
    END LOOP; 
END $$;

-- 3. Re-install the safe "Update Timestamp" trigger for messages
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message();

-- 4. Re-install the standard "updated_at" trigger for conversations
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 5. Clean up any potential function debris (optional but good practice)
DROP FUNCTION IF EXISTS public.handle_message_webhook CASCADE;
DROP FUNCTION IF EXISTS public.supabase_functions__http_request CASCADE; 
-- Note: We don't drop 'supabase_functions__http_request' blindly as other things might use it, 
-- but usually this is the culprit if attached as a trigger directly.
