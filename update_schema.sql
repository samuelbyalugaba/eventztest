-- Add new columns to events table to support rich event details
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendees INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS streaming JSONB;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_tiers JSONB;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_highlights JSONB;

-- Fix for missing status and views columns (added 2026-01-26)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status text default 'published';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS views integer default 0;