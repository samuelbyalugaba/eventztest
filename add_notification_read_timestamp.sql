-- Add last_notification_read_at to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_notification_read_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing profiles to have the current time as default (so old notifications are "read")
UPDATE public.profiles 
SET last_notification_read_at = timezone('utc'::text, now()) 
WHERE last_notification_read_at IS NULL;
