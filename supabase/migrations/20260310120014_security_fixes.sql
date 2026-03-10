-- SECURITY HARDENING & VULNERABILITY FIXES
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR

-- 1. FIX: Universal Payment Bypass (Free Ticket Glitch)
-- Revoke direct insert access to tickets table
DROP POLICY IF EXISTS "Users can insert tickets (purchase)" ON tickets;

-- Create a secure server-side function for purchasing tickets
CREATE OR REPLACE FUNCTION purchase_ticket(
  p_event_id BIGINT,
  p_ticket_type TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_ticket_number TEXT,
  p_qr_code TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_price TEXT;
  v_ticket_tiers jsonb;
  v_tier jsonb;
  v_new_ticket_id BIGINT;
BEGIN
  -- 1. Verify Event Exists and Fetch Ticket Tiers
  SELECT ticket_tiers INTO v_ticket_tiers
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- 2. Find the price for the requested ticket type from the SOURCE OF TRUTH (Database)
  -- Iterate through the JSONB array to find the matching tier
  -- We default to NULL if not found
  SELECT value->>'price' INTO v_event_price
  FROM jsonb_array_elements(v_ticket_tiers)
  WHERE value->>'name' = p_ticket_type;

  IF v_event_price IS NULL THEN
    RAISE EXCEPTION 'Invalid ticket type or ticket type not found for this event';
  END IF;

  -- 3. Insert the ticket using the VERIFIED price
  INSERT INTO tickets (
    user_id,
    event_id,
    ticket_number,
    barcode,
    price,
    purchase_date,
    customer_name,
    customer_email,
    ticket_type,
    status,
    qr_code
  ) VALUES (
    auth.uid(),
    p_event_id,
    p_ticket_number,
    p_ticket_number, -- using ticket number as barcode for now
    v_event_price,   -- USING THE SERVER-SIDE VERIFIED PRICE
    now(),
    p_customer_name,
    p_customer_email,
    p_ticket_type,
    'valid',
    p_qr_code
  )
  RETURNING id INTO v_new_ticket_id;

  RETURN json_build_object('id', v_new_ticket_id, 'status', 'success');
END;
$$;


-- 2. FIX: Unauthorized Privilege Escalation (Self-Promotion)
-- Prevent users from updating sensitive fields like is_organizer, verified, etc.

CREATE OR REPLACE FUNCTION check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if restricted columns are being modified
  IF (NEW.is_organizer IS DISTINCT FROM OLD.is_organizer) OR
     (NEW.verified IS DISTINCT FROM OLD.verified) OR
     (NEW.organizer_type IS DISTINCT FROM OLD.organizer_type) THEN
      RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
  END IF;
  
  -- Allow other updates
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;
CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_profile_updates();


-- 3. FIX: Private Chat Injection (IDOR)
-- Ensure sender is actually a participant in the conversation

DROP POLICY IF EXISTS "Users can insert messages" ON messages;

CREATE POLICY "Users can insert messages" ON messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id 
  AND 
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);


-- 4. FIX: Broken Conversation Deletion
-- Add missing DELETE policy for conversations AND messages

DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;
CREATE POLICY "Users can delete their conversations" ON conversations
FOR DELETE USING (
  auth.uid() = participant1_id OR auth.uid() = participant2_id
);

DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON messages;
CREATE POLICY "Users can delete messages in their conversations" ON messages
FOR DELETE USING (
  exists (
    select 1 from conversations 
    where conversations.id = messages.conversation_id 
    and (conversations.participant1_id = auth.uid() or conversations.participant2_id = auth.uid())
  )
);

-- 5. FIX: Unrestricted File Upload (Basic Mitigation)
-- (This requires Storage Policy changes in the Supabase Dashboard, but we can document it)
-- SQL cannot easily change Storage Buckets structure without pg_net or extensions, 
-- but we can advise on the policy.
-- Policy recommendation:
-- bucket_id = 'events' AND (storage.foldername(name))[1] != 'private'
