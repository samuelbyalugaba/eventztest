import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createPost, uploadImage } from '../utils/supabase/api';
import { CHAR_LIMIT } from '../components/create-post/constants';

export type MediaItem = {
  file: File;
  url: string;
  kind: 'image' | 'video';
};

export function usePostCreation(onMediaCaptured?: () => void) {
  const navigate = useNavigate();
  const [capturedMedia, setCapturedMedia] = useState<MediaItem | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isPosting, setIsPosting] = useState(false);
  const locationSearchRef = useRef<HTMLDivElement>(null);

  const handleGallerySelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
    const isVideo = file.type.startsWith('video/');
    setCapturedMedia({ file, url: URL.createObjectURL(file), kind: isVideo ? 'video' : 'image' });
    onMediaCaptured?.();
    e.target.value = '';
  }, [capturedMedia, onMediaCaptured]);

  const handleRemoveLocation = useCallback(() => {
    setLocationData(null);
  }, []);

  const handleOpenLocationSearch = useCallback(() => {
    setShowLocationSearch(true);
    setLocationQuery('');
    setLocationSuggestions([]);
  }, []);

  const handleLocationSelect = useCallback((suggestion: { display_name: string; lat: string; lon: string }) => {
    const parts = suggestion.display_name.split(',').map(s => s.trim());
    const label = parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
    setLocationData({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon), label });
    setShowLocationSearch(false);
    setLocationQuery('');
    setLocationSuggestions([]);
  }, []);

  useEffect(() => {
    if (!showLocationSearch) {
      setLocationSuggestions([]);
      setLocationQuery('');
      return;
    }
    const timer = setTimeout(async () => {
      if (!locationQuery.trim()) {
        setLocationSuggestions([]);
        return;
      }
      setLocationSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setLocationSuggestions(data || []);
      } catch (error) {
        console.error('Failed to fetch location suggestions:', error);
        setLocationSuggestions([]);
      } finally {
        setLocationSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [locationQuery, showLocationSearch]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [caption]);

  const remaining = CHAR_LIMIT - caption.length;
  const canPost = caption.trim().length > 0 && remaining >= 0 && capturedMedia !== null;

  const handlePost = async () => {
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
      window.dispatchEvent(new Event('postsUpdated'));
      navigate('/feed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  return {
    capturedMedia,
    setCapturedMedia,
    galleryInputRef,
    handleGallerySelect,
    caption,
    setCaption,
    textareaRef,
    remaining,
    canPost,
    isPosting,
    locationData,
    showLocationSearch,
    locationQuery,
    setLocationQuery,
    locationSearching,
    locationSuggestions,
    locationSearchRef,
    handleRemoveLocation,
    handleOpenLocationSearch,
    handleLocationSelect,
    handlePost,
  };
}
