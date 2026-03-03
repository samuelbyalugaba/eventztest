-- 1. Ensure attendees column exists and defaults to 0
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendees INTEGER DEFAULT 0;

-- 2. Create function to sync count
CREATE OR REPLACE FUNCTION public.update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE events
    SET attendees = (SELECT count(*) FROM tickets WHERE event_id = NEW.event_id)
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE events
    SET attendees = (SELECT count(*) FROM tickets WHERE event_id = OLD.event_id)
    WHERE id = OLD.event_id;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.event_id != NEW.event_id THEN
      -- Decrement old event
      UPDATE events
      SET attendees = (SELECT count(*) FROM tickets WHERE event_id = OLD.event_id)
      WHERE id = OLD.event_id;
      -- Increment new event
      UPDATE events
      SET attendees = (SELECT count(*) FROM tickets WHERE event_id = NEW.event_id)
      WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS on_ticket_change ON tickets;
CREATE TRIGGER on_ticket_change
AFTER INSERT OR DELETE OR UPDATE OF event_id ON tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_event_attendees_count();

-- 4. Sync existing data
UPDATE events e
SET attendees = (SELECT count(*) FROM tickets t WHERE t.event_id = e.id);
