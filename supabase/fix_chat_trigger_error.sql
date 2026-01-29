-- Fix for "COALESCE types messages and json cannot be matched" error
-- This error occurs when a trigger tries to COALESCE a row type (NEW) with JSONB.
-- We will drop likely conflicting triggers and replace them with a safe one.

-- 1. Drop potential problematic triggers
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
DROP TRIGGER IF EXISTS handle_new_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_last_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_timestamp ON public.messages;
DROP TRIGGER IF EXISTS sync_message_to_conversation ON public.messages;

-- 2. Create a safe function to update conversation timestamp
-- We purposefully do NOT try to store the last message in the conversation table 
-- to avoid the type mismatch error. The client fetches the last message separately.
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the safe trigger
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message();
