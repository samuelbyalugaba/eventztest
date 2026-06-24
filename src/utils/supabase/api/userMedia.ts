import { supabase } from './client';

export type UserMedia = {
  id: number;
  user_id: string;
  media_type: 'photo' | 'video';
  url: string;
  thumbnail_url?: string;
  caption?: string;
  likes: number;
  views: number;
  duration?: string;
  created_at: string;
};

export const getUserMedia = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_media')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const incrementUserMediaView = async (mediaId: number) => {
  const { error } = await supabase.rpc('increment_media_view', { media_id: mediaId });
  
  if (error) {
  }
};
