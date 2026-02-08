-- Function to completely delete an event and all its related data
-- This function bypasses RLS to allow the organizer to delete data owned by other users (like saved_events or chat messages)
-- associated with the event they are deleting.

CREATE OR REPLACE FUNCTION delete_event_complete(target_event_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Verify that the user executing this function is the organizer of the event
  -- We use auth.uid() to get the current user's ID
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE id = target_event_id 
    AND organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this event';
  END IF;

  -- 2. Unlink posts associated with this event (set event_id to NULL)
  -- We don't delete the posts, just remove the reference
  UPDATE posts 
  SET event_id = NULL 
  WHERE event_id = target_event_id;

  -- 3. Delete dependent records from other tables
  -- These tables have Foreign Keys pointing to events(id)
  
  -- Delete all chat messages for this event
  DELETE FROM stream_chat_messages WHERE event_id = target_event_id;
  
  -- Delete all "saved event" entries (bookmarks)
  DELETE FROM saved_events WHERE event_id = target_event_id;
  
  -- Delete all tickets associated with this event
  DELETE FROM tickets WHERE event_id = target_event_id;

  -- 4. Finally, delete the event itself
  DELETE FROM events WHERE id = target_event_id;
END;
$$;
