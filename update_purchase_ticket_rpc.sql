-- FIX: Ticket Overselling Race Condition & Concurrency
-- This replaces the previous purchase_ticket function with a version that locks the row
-- and decrements the available quantity in the JSONB ticket_tiers array.
-- UPDATED: Now supports non-tiered (General Admission) events as well.

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
  v_event_base_price TEXT;
BEGIN
  -- 1. Lock the event row for update to prevent race conditions
  -- This ensures that only one transaction can modify the ticket count at a time
  SELECT ticket_tiers, price INTO v_ticket_tiers, v_event_base_price
  FROM events
  WHERE id = p_event_id
  FOR UPDATE; 

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- 2. Determine if it's a tiered event or general admission
  -- If ticket_tiers is null or empty, assume general admission (or if ticket type matches 'General Admission')
  
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

      -- If not found in tiers, check if it's a legacy/fallback request for General Admission
      IF NOT v_tier_found THEN
         IF p_ticket_type = 'General Admission' OR p_ticket_type = 'Standard' THEN
            -- If the event has tiers, we generally shouldn't allow 'General Admission' unless it's one of the tiers.
            -- However, to prevent breaking legacy flows completely, if the event has a base price and tiers,
            -- we could arguably fallback. But safer to fail to prevent selling wrong tickets.
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
      -- We don't have a specific availability counter for GA in this schema usually.
      -- If 'capacity' exists, it should be checked here.
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
