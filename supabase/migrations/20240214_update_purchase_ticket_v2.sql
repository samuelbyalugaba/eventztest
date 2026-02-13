-- Update purchase_ticket function to accept p_price and p_user_id
-- This resolves the "Could not find function" error from the frontend
-- We prioritize DB-calculated price for security, but accept the parameter to match signature

CREATE OR REPLACE FUNCTION purchase_ticket(
  p_event_id BIGINT,
  p_ticket_type TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_ticket_number TEXT,
  p_qr_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_price TEXT DEFAULT NULL
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
  v_event_base_price TEXT;
  v_final_user_id UUID;
BEGIN
  -- Determine user_id: use provided p_user_id if not null, otherwise auth.uid()
  v_final_user_id := COALESCE(p_user_id, auth.uid());
  
  -- If no user ID is available (e.g. anonymous purchase?), we might need to handle that.
  -- For now, we assume user must be logged in or p_user_id provided.
  IF v_final_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be logged in or user_id provided';
  END IF;

  -- 1. Lock the event row for update to prevent race conditions
  SELECT ticket_tiers, price INTO v_ticket_tiers, v_event_base_price
  FROM events
  WHERE id = p_event_id
  FOR UPDATE; 

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- 2. Determine price and availability
  
  IF v_ticket_tiers IS NOT NULL AND jsonb_array_length(v_ticket_tiers) > 0 THEN
      -- Handle Tiered Logic
      DECLARE
        tier jsonb;
      BEGIN
        FOR tier IN SELECT * FROM jsonb_array_elements(v_ticket_tiers)
        LOOP
          IF tier->>'name' = p_ticket_type THEN
            v_event_price := tier->>'price';
            v_tier_found := true;
            
            -- Check availability
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
         IF p_ticket_type = 'General Admission' OR p_ticket_type = 'Standard' THEN
             -- Fallback for legacy calls if appropriate, or fail.
             -- If we can't find the tier, but p_price was provided, maybe we trust it? 
             -- NO, that's insecure. We stick to DB tiers.
            RAISE EXCEPTION 'Invalid ticket type: % (Event has specific tiers)', p_ticket_type;
         ELSE
            RAISE EXCEPTION 'Invalid ticket type or ticket type not found for this event';
         END IF;
      END IF;

      -- Decrement availability
      SELECT jsonb_agg(
        CASE 
          WHEN elem->>'name' = p_ticket_type AND (elem ? 'available') THEN 
            jsonb_set(elem, '{available}', ((elem->>'available')::int - 1)::text::jsonb)
          ELSE elem 
        END
      ) INTO v_updated_tiers
      FROM jsonb_array_elements(v_ticket_tiers) AS elem;

      -- Update event
      UPDATE events 
      SET ticket_tiers = v_updated_tiers
      WHERE id = p_event_id;

  ELSE
      -- Handle General Admission / Non-tiered Logic
      v_event_price := v_event_base_price;
  END IF;

  -- 3. Insert the ticket
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
    v_final_user_id,
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
