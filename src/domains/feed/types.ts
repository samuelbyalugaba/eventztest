// Feed Domain Types
// Manages: Posts, comments, likes, shares, hashtags

export interface PostComment {
  id: number;
  user: {
    name: string;
    avatar: string;
    id?: string;
    username?: string;
    verified?: boolean;
    is_organizer?: boolean;
  };
  text: string;
  timestamp: string;
  likes_count?: number;
  is_liked?: boolean;
  parent_id?: number;
}

export interface ApiPost {
  id: number;
  user_id: string;
  content: string;
  image_urls: string[];
  video_url?: string;
  views?: number;
  duration?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
  user?: any;
  event?: any;
}

export interface Post {
  id: number;
  user_id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
    isOrganizer?: boolean;
    isOrganizerPage?: boolean;
  };
  event?: {
    id: number;
    name: string;
    date: string;
    time?: string;
    location: string;
    image: string;
    price?: string;
  };
  content: {
    text?: string;
    image?: string;
    images?: string[];
    hashtags?: string[];
  };
  timestamp: string;
  likes: number;
  comments: PostComment[];
  comments_count?: number;
  shares: number;
  views?: number;
  isLiked: boolean;
  isSaved: boolean;
  video_url?: string;
  recommended?: boolean;
  isHighlight?: boolean;
  highlights?: any[];
  totalHighlightViews?: number;
  mutualFriends?: { name: string; avatar: string }[];
}
