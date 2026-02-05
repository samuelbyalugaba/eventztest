-- QA Assassin Vulnerability Fixes

-- 1. Secure Message Content (Input Validation)
-- Prevent empty messages and massive payloads that could crash clients
ALTER TABLE public.messages
ADD CONSTRAINT messages_content_length_check
CHECK (length(content) > 0 AND length(content) <= 5000);

-- 2. Secure Comment Text (Input Validation)
-- Prevent empty comments and spam
ALTER TABLE public.post_comments
ADD CONSTRAINT post_comments_text_length_check
CHECK (length(text) > 0 AND length(text) <= 1000);

-- 3. Optimize Unread Count Queries
-- Used frequently in getConversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read_sender
ON public.messages(conversation_id, is_read, sender_id);

-- 4. Atomic View Increments (Prevent Race Conditions)
-- Re-defining RPCs to ensure they exist and are atomic.
-- We use SECURITY DEFINER to allow users to increment views without needing UPDATE permission on the table.

-- Event Views
CREATE OR REPLACE FUNCTION increment_event_view(event_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.events
  SET views = views + 1
  WHERE id = event_id;
END;
$$;

-- Post Views
CREATE OR REPLACE FUNCTION increment_post_view(post_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET views = views + 1
  WHERE id = post_id;
END;
$$;

-- Media Views
CREATE OR REPLACE FUNCTION increment_media_view(media_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_media
  SET views = views + 1
  WHERE id = media_id;
END;
$$;
