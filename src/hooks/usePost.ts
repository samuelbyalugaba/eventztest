import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createPost, uploadImage } from '../utils/supabase/api';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import type { MediaItem } from './useCamera';

export function usePost() {
  const navigate = useNavigate();
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = useCallback(async ({
    caption,
    capturedMedia,
    locationData,
    canPost,
  }: {
    caption: string;
    capturedMedia: MediaItem;
    locationData: { lat: number; lng: number; label: string } | null;
    canPost: boolean;
  }) => {
    if (!canPost || !capturedMedia || isPosting) return;
    setIsPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const url = await uploadImage(capturedMedia.file, 'posts', `user_${user.id}`);
      const extraLines: string[] = [];
      if (locationData) extraLines.push(`📍 ${locationData.label}`);
      const finalContent = [caption.trim(), ...extraLines].filter(Boolean).join('\n\n');

      await createPost({
        user_id: user.id,
        content: finalContent,
        image_urls: [url],
        hashtags: [],
        posted_as_organizer: false,
      } as any);

      toast.success('Post created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      navigate('/feed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }, [isPosting, navigate]);

  return { isPosting, handlePost };
}
