-- 1. Fix Profiles Table Columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS organizer_type TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 2. Fix Posts Table Columns (Add missing video fields)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 3. Create 'posts' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for 'posts' bucket

-- Allow public read access to posts bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

-- Allow authenticated users to upload to posts bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update/delete their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.uid() = owner
);

-- 5. Fix Chat Trigger Error (COALESCE types messages and json cannot be matched)
-- Drop problematic triggers on messages
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
DROP TRIGGER IF EXISTS handle_new_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_last_message ON public.messages;
DROP TRIGGER IF EXISTS update_conversation_timestamp ON public.messages;
DROP TRIGGER IF EXISTS sync_message_to_conversation ON public.messages;

-- Create a safe function to update conversation timestamp
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the safe trigger
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message();
