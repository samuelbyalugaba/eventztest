CREATE OR REPLACE FUNCTION purchase_ticket(
  p_event_id BIGINT,
  p_ticket_type TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_ticket_number TEXT,
  p_qr_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_price TEXT DEFAULT NULL,
  p_transaction_id BIGINT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_tiers jsonb;
  v_new_ticket_id BIGINT;
  v_updated_tiers jsonb;
  v_available_count INT;
  v_tier_found BOOLEAN := false;
  v_event_base_price TEXT;
  v_final_user_id UUID;
  v_event_price TEXT;
  v_required_amount NUMERIC;
  v_tx_status TEXT;
  v_tx_amount NUMERIC;
  v_tx_user UUID;
  v_tx_ticket_id BIGINT;
BEGIN
  v_final_user_id := COALESCE(p_user_id, auth.uid());
  IF v_final_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be logged in';
  END IF;
  
  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Transaction id required';
  END IF;

  SELECT ticket_tiers, price INTO v_ticket_tiers, v_event_base_price
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_ticket_tiers IS NOT NULL AND jsonb_array_length(v_ticket_tiers) > 0 THEN
    DECLARE
      tier jsonb;
    BEGIN
      FOR tier IN SELECT * FROM jsonb_array_elements(v_ticket_tiers)
      LOOP
        IF tier->>'name' = p_ticket_type THEN
          v_event_price := tier->>'price';
          v_tier_found := true;
          IF tier ? 'available' THEN
            v_available_count := (tier->>'available')::int;
            IF v_available_count <= 0 THEN
              RAISE EXCEPTION 'Tickets sold out for this tier';
            END IF;
          END IF;
          EXIT;
        END IF;
      END LOOP;
    END;

    IF NOT v_tier_found THEN
      RAISE EXCEPTION 'Invalid ticket type';
    END IF;

    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'name' = p_ticket_type AND (elem ? 'available') THEN 
          jsonb_set(elem, '{available}', ((elem->>'available')::int - 1)::text::jsonb)
        ELSE elem 
      END
    ) INTO v_updated_tiers
    FROM jsonb_array_elements(v_ticket_tiers) AS elem;

    UPDATE events 
    SET ticket_tiers = v_updated_tiers
    WHERE id = p_event_id;
  ELSE
    v_event_price := v_event_base_price;
  END IF;

  v_required_amount := NULLIF(regexp_replace(COALESCE(v_event_price, '0'), '[^0-9\.]', '', 'g'), '')::numeric;
  IF v_required_amount IS NULL THEN
    v_required_amount := 0;
  END IF;

  SELECT status,
         amount,
         user_id,
         ticket_id
  INTO v_tx_status, v_tx_amount, v_tx_user, v_tx_ticket_id
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx_user IS DISTINCT FROM v_final_user_id THEN
    RAISE EXCEPTION 'Transaction does not belong to user';
  END IF;

  IF v_tx_ticket_id IS NOT NULL THEN
    RAISE EXCEPTION 'Transaction already used';
  END IF;

  IF lower(coalesce(v_tx_status, '')) NOT IN ('completed','success') THEN
    RAISE EXCEPTION 'Transaction not completed';
  END IF;

  IF v_tx_amount < v_required_amount THEN
    RAISE EXCEPTION 'Insufficient transaction amount';
  END IF;

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
    p_ticket_number,
    v_event_price,
    now(),
    p_customer_name,
    p_customer_email,
    p_ticket_type,
    'valid',
    p_qr_code
  )
  RETURNING id INTO v_new_ticket_id;

  UPDATE transactions
  SET ticket_id = v_new_ticket_id,
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN json_build_object('id', v_new_ticket_id, 'status', 'success');
END;
$$;

