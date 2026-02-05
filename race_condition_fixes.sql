-- FIX: Ticket Overselling Race Condition & Concurrency
-- This replaces the previous purchase_ticket function with a version that locks the row
-- and decrements the available quantity in the JSONB ticket_tiers array.

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
  v_new_ticket_id BIGINT;
  v_updated_tiers jsonb;
  v_available_count INT;
  v_tier_found BOOLEAN := false;
BEGIN
  -- 1. Lock the event row for update to prevent race conditions
  -- This ensures that only one transaction can modify the ticket count at a time
  SELECT ticket_tiers INTO v_ticket_tiers
  FROM events
  WHERE id = p_event_id
  FOR UPDATE; 

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- 2. Find the tier, get price, and check availability
  -- We iterate through the array to find the matching tier
  DECLARE
    tier jsonb;
  BEGIN
    FOR tier IN SELECT * FROM jsonb_array_elements(v_ticket_tiers)
    LOOP
      IF tier->>'name' = p_ticket_type THEN
        v_event_price := tier->>'price';
        v_tier_found := true;
        
        -- Check if 'available' field exists and handle logic
        IF tier ? 'available' THEN
           v_available_count := (tier->>'available')::int;
           IF v_available_count <= 0 THEN
             RAISE EXCEPTION 'Tickets sold out for this tier';
           END IF;
        END IF;
        
        EXIT; -- Stop loop once found
      END IF;
    END LOOP;
  END;

  IF NOT v_tier_found THEN
    RAISE EXCEPTION 'Invalid ticket type or ticket type not found for this event';
  END IF;

  -- 3. Decrement availability in the JSONB structure
  -- Rebuild the array with the updated count
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'name' = p_ticket_type AND (elem ? 'available') THEN 
        jsonb_set(elem, '{available}', ((elem->>'available')::int - 1)::text::jsonb)
      ELSE elem 
    END
  ) INTO v_updated_tiers
  FROM jsonb_array_elements(v_ticket_tiers) AS elem;

  -- 4. Update the event with new tiers (only if availability was tracked)
  -- If v_updated_tiers is null (e.g. empty array), we keep original (though that shouldn't happen here)
  IF v_updated_tiers IS NOT NULL THEN
    UPDATE events 
    SET ticket_tiers = v_updated_tiers
    WHERE id = p_event_id;
  END IF;

  -- 5. Insert the ticket using the VERIFIED price
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
    v_event_price,
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
