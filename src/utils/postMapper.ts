import { Post as ApiPost } from './supabase/api';
import { formatTimeAgo } from './format';

const isVideo = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const mapPostToViewModel = (p: ApiPost) => {
  const isOrganizerPage = !!p.posted_as_organizer && !!p.organizer_profile;
  const displayName = isOrganizerPage ? (p.organizer_profile!.organizer_name || 'Unknown Organizer') : (p.user?.full_name || p.user?.username || 'Unknown User');
  // STRICT: No fallback to user avatar for organizers
  const avatarUrl = isOrganizerPage ? p.organizer_profile!.organizer_avatar_url : p.user?.avatar_url;
  return {
    id: p.id,
    user_id: p.user_id,
    user: {
      id: isOrganizerPage ? (p.organizer_profile!.id || 'unknown') : (p.user?.id || 'unknown'),
      name: displayName || 'Unknown',
      username: p.user?.username || '@unknown',
      avatar: avatarUrl || '',
      verified: p.user?.verified || false,
      isOrganizer: p.user?.is_organizer || false,
      isOrganizerPage: isOrganizerPage
    },
    event: p.event ? {
      id: p.event.id,
      name: p.event.title,
      date: p.event.date,
      time: p.event.time,
      location: p.event.location,
      image: p.event.image_url,
      price: p.event.price_range,
    } : undefined,
    content: {
      text: p.content,
      images: p.image_urls,
      image: p.image_urls?.[0],
      hashtags: p.hashtags,
    },
    timestamp: formatTimeAgo(p.created_at),
    likes: p.likes_count || 0,
    comments: [], // Comments are fetched separately or empty initially
    comments_count: p.comments_count || 0,
    shares: 0,
    views: p.views || 0,
    isLiked: p.is_liked || false,
    isSaved: p.is_saved || false,
    isHighlight: !!p.video_url,
    highlights: p.video_url ? [{
      id: p.id,
      thumbnail: (p.image_urls?.find(url => !isVideo(url))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop',
      duration: p.duration || '',
      title: p.content || 'Video Highlight',
      videoUrl: p.video_url,
      views: p.views || 0,
    }] : undefined,
    mutualFriends: [],
    
    // Pass raw data for safety if needed
    raw: p
  };
};

export const mapPostsToViewModel = (data: any[]) => {
    return data.map(mapPostToViewModel);
};
