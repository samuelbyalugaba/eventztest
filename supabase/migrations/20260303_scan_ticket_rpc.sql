-- Add columns for tracking scans
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scanned_by UUID REFERENCES auth.users(id);

-- Create a secure RPC function to scan and validate tickets
CREATE OR REPLACE FUNCTION scan_ticket(
  p_ticket_code TEXT, 
  p_event_id BIGINT
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket RECORD;
  v_event RECORD;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- 1. Verify Event Ownership/Access
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Event not found');
  END IF;
  
  -- Check if current user is the organizer
  -- (In future, add logic here for "staff" or "gatekeeper" roles)
  IF v_event.organizer_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You are not the organizer of this event');
  END IF;

  -- 2. Find the Ticket
  -- We check both ticket_number and barcode to be safe, or just one if standardized.
  -- Assuming the QR code contains the 'barcode' (UUID) or 'ticket_number'.
  SELECT * INTO v_ticket 
  FROM tickets 
  WHERE event_id = p_event_id 
    AND (barcode = p_ticket_code OR ticket_number = p_ticket_code);
    
  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid Ticket: Ticket not found for this event');
  END IF;

  -- 3. Check Ticket Status
  IF v_ticket.status = 'used' OR v_ticket.scanned_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Already Scanned', 
      'data', jsonb_build_object(
        'scanned_at', v_ticket.scanned_at,
        'customer_name', v_ticket.customer_name,
        'ticket_type', v_ticket.ticket_type
      )
    );
  END IF;
  
  IF v_ticket.status != 'valid' AND v_ticket.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid Ticket: Status is ' || v_ticket.status);
  END IF;

  -- 4. Mark as Used
  UPDATE tickets 
  SET 
    status = 'used',
    scanned_at = NOW(),
    scanned_by = v_user_id
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Ticket Verified',
    'data', jsonb_build_object(
      'customer_name', v_ticket.customer_name,
      'ticket_type', v_ticket.ticket_type,
      'ticket_number', v_ticket.ticket_number
    )
  );
END;
$$;