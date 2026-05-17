-- Secure tickets table by removing direct insert access
-- Logic: Ticket creation should only happen via the 'purchase_ticket' RPC function
-- which handles inventory checks and payment validation.
-- The RPC is SECURITY DEFINER, so it can insert even if the user cannot.

DROP POLICY IF EXISTS "Users can purchase tickets" ON public.tickets;

-- Ensure RLS is enabled (just in case)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Verify/Keep "Users can see their tickets"
-- CREATE POLICY "Users can see their tickets" ON tickets FOR SELECT USING (auth.uid() = user_id);
