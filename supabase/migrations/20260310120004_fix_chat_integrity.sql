-- FIX: Chat Integrity (Cascade Delete)
-- Run this in Supabase SQL Editor

-- Ensure messages are deleted when a conversation is deleted
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
    ON DELETE CASCADE;

-- Ensure messages are deleted when a sender profile is deleted (optional, but good for cleanup)
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
