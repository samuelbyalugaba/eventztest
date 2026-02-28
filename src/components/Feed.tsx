import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { PostCard } from './PostCard';
import { PostSkeleton } from './PostSkeleton';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, MessageCircle, Share2, Bookmark, X, Send, Eye, ArrowLeft, Calendar, Users as UsersIcon, Star, ArrowUpRight, LayoutGrid, ThumbsUp, Play, ChevronLeft, ChevronRight, MessageSquare, Sparkles, Volume2, VolumeX, Bell, Heart, UserPlus, TrendingUp, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getPosts, toggleLikePost, toggleSavePost, createPostComment, getFollowedUserIds, toggleFollow, Post as ApiPost, incrementPostView, getNotifications, Notification, deletePost, markNotificationsAsRead } from '../utils/supabase/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { handleShare } from '../utils/share';
import { formatTimeAgo } from '../utils/format';
import { Conversation } from '../types';

import { ChatList } from './ChatList';
import { ChatDetail } from './ChatDetail';
import { UserProfileModal } from './UserProfileModal';
import { OrganizerProfile } from './OrganizerProfile';
import { ShareModal } from './ShareModal';

interface Comment {
  id: number;
  user: {
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
}

interface HighlightClip {
  id: number;
  thumbnail: string;
  duration: string;
  title: string;
  videoUrl?: string;
  views: number;
}

type FilterTab = 'all' | 'organizers' | 'trending' | 'following';

interface Post {
  id: number;
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
    images?: string[]; // For carousel posts with multiple images
    hashtags?: string[];
  };
  timestamp: string;
  likes: number;
  comments: Comment[];
  comments_count?: number;
  shares: number;
  views?: number;
  isLiked: boolean;
  isSaved: boolean;
  recommended?: boolean;
  isHighlight?: boolean;
  highlights?: HighlightClip[];
  totalHighlightViews?: number;
}

interface FeedProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
  onMarkAsRead?: (conversationId: number) => void;
  onlineUsers?: { id: string; name: string; avatar: string; username: string }[];
  onDeleteConversation?: (conversationId: number) => void;
  currentUser?: any;
  isOrganizer?: boolean;
  onCreateEvent?: () => void;
}

let feedCacheMemory: { posts: any[]; timestamp: number } | null = null;

const isVideo = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export function Feed({ conversations: globalConversations, onStartConversation, onMarkAsRead, onlineUsers = [], onDeleteConversation, currentUser: propCurrentUser }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser || null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean } | null>(null);
  const [showOrganizerProfile, setShowOrganizerProfile] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<{ id: string; name: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  // const [messageSearch, setMessageSearch] = useState('');
  const [likeAnimation, setLikeAnimation] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });
  const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>({});
  const [playingVideo, setPlayingVideo] = useState<{ postId: number; clipIndex: number; clips: HighlightClip[] } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[]; currentIndex: number; postId: number } | null>(null);
  const [fullScreenTouchStart, setFullScreenTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [lastVideoTap, setLastVideoTap] = useState<number>(0);
  const [rewindAnimation, setRewindAnimation] = useState<{ show: boolean; direction: 'left' | 'right' } | null>(null);
  const [videoTouchStart, setVideoTouchStart] = useState<{ x: number; y: number } | null>(null);
  // const [showChatMenu, setShowChatMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [renderCount, setRenderCount] = useState(20);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const estimatedItemHeight = 560;
  const overscan = 3;

  useEffect(() => {
    const unlockAudio = () => {
      setAudioUnlocked(true);
      // Remove listeners after first interaction
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (selectedPost) {
      incrementPostView(selectedPost.id);
    }
  }, [selectedPost]);

  useEffect(() => {
    if (playingVideo) {
      // Increment view for the current clip
      const currentClip = playingVideo.clips[playingVideo.clipIndex];
      // If the clip ID matches the post ID, it's the main post video
      incrementPostView(currentClip.id);
    }
  }, [playingVideo?.clipIndex, playingVideo?.clips]);

  const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
  const FEED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  const mapPosts = (data: any[]) => {
    return data.map((p: ApiPost) => {
      const isOrganizerPage = !!p.posted_as_organizer && !!p.organizer_profile;
      const displayName = isOrganizerPage ? (p.organizer_profile!.organizer_name || 'Unknown Organizer') : (p.user?.full_name || p.user?.username || 'Unknown User');
      // STRICT: No fallback to user avatar for organizers
      const avatarUrl = isOrganizerPage ? p.organizer_profile!.organizer_avatar_url : p.user?.avatar_url;
      return {
        id: p.id,
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
        comments: [],
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
      };
    });
  };

  const loadPosts = async (useCacheFirst: boolean) => {
    setIsLoading(true);
    try {
      if (useCacheFirst && feedCacheMemory && (Date.now() - feedCacheMemory.timestamp < FEED_CACHE_TTL_MS)) {
        setPosts(feedCacheMemory.posts as Post[]);
        setIsLoading(false);
      }

      if (useCacheFirst) {
        const cachedRaw = localStorage.getItem(FEED_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS && Array.isArray(cached.posts)) {
            setPosts(cached.posts);
            setIsLoading(false);
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        // Load following
        try {
          const following = await getFollowedUserIds(user.id);
          setFollowingIds(new Set(following));
        } catch (e) {
          console.error('Error loading following:', e);
        }
      }
      
      const fresh = await getPosts({ currentUserId: user?.id, limit: 20, offset: 0 });
      
      if (fresh && fresh.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      const mapped = fresh && fresh.length > 0 ? mapPosts(fresh) : [];
      setPosts(mapped);
      const payload = { posts: mapped, timestamp: Date.now() };
      feedCacheMemory = payload;
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Use current posts length as offset
      const offset = posts.length;
      const fresh = await getPosts({ currentUserId: user?.id, limit: 20, offset });
      
      if (!fresh || fresh.length < 20) {
        setHasMore(false);
      }
      
      if (fresh && fresh.length > 0) {
        const mapped = mapPosts(fresh);
        // Append new posts, avoid duplicates
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = mapped.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(true);

    const handlePostsUpdated = () => {
      loadPosts(false);
    };
    window.addEventListener('postsUpdated', handlePostsUpdated);

    return () => {
      window.removeEventListener('postsUpdated', handlePostsUpdated);
    };
  }, []);

  // Sync activeConversation with global conversations updates and mark as read
  useEffect(() => {
    if (activeConversation) {
      const updatedConv = globalConversations?.find(c => c.id === activeConversation.id);
      
      if (updatedConv) {
        // Update local state to match global state (handles new messages, ID updates, etc.)
        if (updatedConv !== activeConversation) {
          setActiveConversation(updatedConv);
        }
        
        // Mark as read if needed
        if (updatedConv.unreadCount && updatedConv.unreadCount > 0 && onMarkAsRead) {
           onMarkAsRead(updatedConv.id);
        }
      }
    }
  }, [activeConversation, globalConversations, onMarkAsRead]);
  

  const unreadMessagesCount = (globalConversations || []).reduce((acc, conv) => {
    if (!conv) return acc;
    return acc + (conv?.unreadCount || 0);
  }, 0);

  useEffect(() => {
    const sentinel = document.getElementById('feed-sentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setRenderCount((c) => c + 20);
          if (hasMore && !isLoadingMore) {
            handleLoadMore();
          }
        }
      });
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [renderCount, posts.length, activeFilter, hasMore, isLoadingMore]);

  useEffect(() => {
    if (currentUser) {
      const fetchNotifications = async () => {
        setNotificationsLoading(true);
        try {
          const data = await getNotifications(currentUser.id);
          setNotifications(data);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        } finally {
          setNotificationsLoading(false);
        }
      };
      
      fetchNotifications();
      
      // Poll every minute if panel is open
      let interval: ReturnType<typeof setInterval>;
      if (showNotifications) {
        interval = setInterval(fetchNotifications, 60000);
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [currentUser, showNotifications]);

 



  const toggleLike = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Show thumbs up animation at click position
    if (e && !posts.find(p => p.id === postId)?.isLiked) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setLikeAnimation({
        show: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      
      // Hide animation after 1 second
      setTimeout(() => {
        setLikeAnimation({ show: false, x: 0, y: 0 });
      }, 1000);
    }
    
    // Optimistic update
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newIsLiked = !post.isLiked;
        return {
          ...post,
          isLiked: newIsLiked,
          likes: newIsLiked ? post.likes + 1 : post.likes - 1,
        };
      }
      return post;
    }));

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        isLiked: !selectedPost.isLiked,
        likes: selectedPost.isLiked ? selectedPost.likes - 1 : selectedPost.likes + 1,
      });
    }

    if (currentUser) {
      try {
        await toggleLikePost(postId, currentUser.id);
      } catch (error) {
        console.error('Error toggling like:', error);
        toast.error('Failed to update like');
      }
    }
  };

  const toggleSave = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Optimistic update
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newIsSaved = !post.isSaved;
        if (newIsSaved) {
          toast.success('Saved for later! 📌');
        }
        return { ...post, isSaved: newIsSaved };
      }
      return post;
    }));

    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        isSaved: !selectedPost.isSaved,
      });
    }

    if (currentUser) {
      try {
        await toggleSavePost(postId, currentUser.id);
      } catch (error) {
        console.error('Error toggling save:', error);
        toast.error('Failed to update saved post');
      }
    }
  };

  const sharePost = async (post: Post, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const shared = await handleShare({
      title: `Check out this post from ${post.user.name}`,
      text: post.content.text || 'Check out this amazing post on EVENTZ!',
      url: window.location.href,
    });
    
    // If native share not available, show custom modal
    if (!shared) {
      setShareModalData({
        title: `Post from ${post.user.name}`,
        text: post.content.text || 'Check out this amazing post on EVENTZ!',
        url: window.location.href,
      });
      setShowShareModal(true);
    }
  };

  // handleOpenUserProfile removed

  const closePostDetail = () => {
    setSelectedPost(null);
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    // Optimistic update
    const previousPosts = [...posts];
    setPosts(posts.filter(p => p.id !== postId));
    
    // Close detail if open
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(null);
    }
    
    try {
      await deletePost(postId);
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
      // Revert
      setPosts(previousPosts);
    }
  };

  // handleDoubleTap removed

  const handlePostComment = async (postId: number) => {
    const text = commentTexts[postId];
    if (!text || !text.trim()) return;

    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }

    try {
      const newCommentData = await createPostComment(postId, currentUser.id, text.trim());
      
      const newComment: Comment = {
        id: newCommentData.id,
        user: {
          name: newCommentData.user?.full_name || newCommentData.user?.username || 'Unknown',
          avatar: newCommentData.user?.avatar_url,
        },
        text: newCommentData.text,
        timestamp: 'Just now',
      };

      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), newComment],
            comments_count: (post.comments_count || 0) + 1
          };
        }
        return post;
      }));

      setCommentTexts({ ...commentTexts, [postId]: '' });
      toast.success('Reply posted! 💬');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };

  const handleFollow = async (userId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to follow users');
      return;
    }
    
    // Optimistic update
    const newFollowingIds = new Set(followingIds);
    newFollowingIds.add(userId);
    setFollowingIds(newFollowingIds);
    toast.success('Following user');

    try {
      await toggleFollow(currentUser.id, userId);
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
      // Revert
      setFollowingIds(followingIds);
    }
  };

  const handleStartConversationLocal = async (user: { name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Close post detail if open
    setSelectedPost(null);
    
    // Use the global conversation handler
    const conversation = await onStartConversation(user);
    
    if (conversation) {
      // Open the conversation
      setActiveConversation(conversation);
      setShowMessages(true);
    }
  };

  const handleOpenUserProfile = (user: { id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean; isOrganizerPage?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // If this post was made as an Organizer Page, open OrganizerProfile instead
    if (user.isOrganizerPage) {
      setSelectedOrganizer({ id: user.id, name: user.name });
      setShowOrganizerProfile(true);
      return;
    }

    // Otherwise open the standard UserProfile modal
    setSelectedUserProfile({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      verified: user.verified,
      isOrganizer: user.isOrganizer,
      type: 'Attendee'
    });
  };



  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'organizers') return post.user.isOrganizer;
    if (activeFilter === 'trending') return post.likes > 200;
    if (activeFilter === 'following') return followingIds.has(post.user.id);
    return true;
  });
  const totalToRender = Math.min(filteredPosts.length, renderCount);


  return (
    <>
      {/* Main Feed View */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
        {/* Unique Header Design */}
        <div className={`bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 transition-all ${showMessages || selectedPost ? 'z-0' : 'z-50'}`}>
          <div className="px-4 pt-5 pb-4">
            {/* Brand Section */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h1 className="text-gray-900 text-xl font-bold">Community</h1>
                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`p-2.5 rounded-xl transition-colors relative ${showNotifications ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMessages(false);
                  }}
                >
                  <Bell className={`w-5 h-5 ${showNotifications ? 'text-purple-600' : 'text-gray-700'}`} />
                  {/* Notification Badge */}
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  )}
                </button>
                <button
                  className={`p-2.5 rounded-xl transition-colors relative ${showMessages ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  onClick={() => {
                    setShowMessages(!showMessages);
                    setShowNotifications(false);
                  }}
                >
                  <MessageSquare className="w-5 h-5 text-gray-700" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-[#8A2BE2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>

              </div>
            </div>

            {/* Unique Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-[#8A2BE2] text-white shadow-lg shadow-purple-200'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                All
              </button>
              <button
                onClick={() => setActiveFilter('following')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilter === 'following'
                    ? 'bg-[#8A2BE2] text-white shadow-lg shadow-purple-200'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                Following
              </button>
              <button
                onClick={() => setActiveFilter('organizers')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilter === 'organizers'
                    ? 'bg-[#8A2BE2] text-white shadow-lg shadow-purple-200'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                <Star className="w-4 h-4" />
                Organizers
              </button>
              <button
                onClick={() => setActiveFilter('trending')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilter === 'trending'
                    ? 'bg-[#8A2BE2] text-white shadow-lg shadow-purple-200'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Trending
              </button>
            </div>
          </div>
        </div>

        {/* Unique Card-Based Posts */}
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {isLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            <>
              {filteredPosts.map((post, index) => (
                <div key={post.id} style={{ animation: `slideUp 0.4s ease-out ${index * 0.08}s both` }}>
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    onLike={(id) => toggleLike(id)}
                    onSave={(id) => toggleSave(id)}
                    onShare={(p) => sharePost(p)}
                    onProfileClick={(user) => handleOpenUserProfile(user)}
                    onFollow={handleFollow}
                    onDelete={handleDeletePost}
                    onMessage={(user) => handleStartConversationLocal(user)}
                    isFollowed={followingIds.has(post.user.id)}
                    audioUnlocked={audioUnlocked}
                  />
                </div>
              ))}
            </>
          )}
          
          {/* Infinite scroll sentinel (auto-load more when near bottom) */}
          {hasMore && (
            <div id="feed-sentinel" className="py-6">
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-gray-900 text-lg font-semibold mb-2">Nothing here yet</h3>
              <p className="text-gray-600 text-center text-sm max-w-xs">
                Follow organizers and explore events to see updates
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Post Detail - Unique Bottom Sheet Style */}
      {selectedPost && (
        <div className="fixed inset-0 bg-white z-[60] overflow-y-auto pb-20">
          {/* Unique Detail Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b border-gray-100">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={closePostDetail}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => sharePost(selectedPost, e)}
                    className="p-2.5 bg-gray-100 hover:bg-cyan-100 text-gray-700 hover:text-cyan-600 rounded-xl transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => toggleSave(selectedPost.id, e)}
                    className={`p-2.5 rounded-xl transition-all ${
                      selectedPost.isSaved
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-600'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${selectedPost.isSaved ? 'fill-white' : ''}`} />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {currentUser?.id === selectedPost.user.id ? (
                        <DropdownMenuItem 
                          onClick={() => handleDeletePost(selectedPost.id)} 
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Post
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="cursor-pointer">
                          Report Post
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Hero Image with Gradient Overlay */}
            {selectedPost.content.image && (
              <div className="relative">
                <ImageWithFallback
                  src={selectedPost.content.image}
                  alt="Post detail"
                  className="w-full aspect-[16/10] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            )}

            {/* User & Post Info */}
            <div className="p-5 space-y-4">
              {/* User Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={selectedPost.user.avatar}
                    name={selectedPost.user.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-4 ring-purple-100 cursor-pointer hover:ring-purple-300 transition-all"
                    onClick={(e) => {
                      if (e) e.stopPropagation();
                      handleOpenUserProfile(selectedPost.user, e);
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {selectedPost.user.isOrganizer && (
                        <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
                      )}
                      <span 
                        className="text-gray-900 font-bold cursor-pointer hover:text-purple-600 transition-colors"
                        onClick={(e) => handleOpenUserProfile(selectedPost.user, e)}
                      >
                        {selectedPost.user.name}
                      </span>
                      {selectedPost.user.verified && !selectedPost.user.isOrganizer && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="Verified">
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-gray-500 text-sm">{selectedPost.timestamp}</span>
                  </div>
                </div>
                {selectedPost.user.isOrganizer && (
                  <button className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-xl transition-all">
                    Follow
                  </button>
                )}
              </div>

              {/* Event Card - If Available */}
              {selectedPost.event && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-bold text-lg mb-2">{selectedPost.event.name}</h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">{selectedPost.event.date}</span>
                          {selectedPost.event.time && <span className="text-gray-500">• {selectedPost.event.time}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          <span>{selectedPost.event.location}</span>
                        </div>
                      </div>
                    </div>
                    {selectedPost.event.price && (
                      <div className="bg-white px-4 py-2 rounded-xl border border-purple-200">
                        <div className="text-purple-600 font-bold text-sm">{selectedPost.event.price}</div>
                      </div>
                    )}
                  </div>
                  <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                    Get Tickets
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Post Description */}
              {selectedPost.content.text && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-gray-800 leading-relaxed">
                    {selectedPost.content.text}
                  </p>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex items-center gap-6 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-gray-900 font-bold text-sm">{selectedPost.likes}</div>
                    <div className="text-gray-500 text-xs">Reactions</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-gray-900 font-bold text-sm">{selectedPost.comments.length}</div>
                    <div className="text-gray-500 text-xs">Replies</div>
                  </div>
                </div>
                {selectedPost.views && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Eye className="w-4 h-4 text-pink-600" />
                    </div>
                    <div>
                      <div className="text-gray-900 font-bold text-sm">{selectedPost.views.toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">Views</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => toggleLike(selectedPost.id, e)}
                className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedPost.isLiked
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gradient-to-r from-gray-100 to-purple-50 text-gray-900 hover:from-purple-600 hover:to-pink-600 hover:text-white border border-gray-200'
                }`}
              >
                <Star className={`w-5 h-5 ${selectedPost.isLiked ? 'fill-white' : ''}`} />
                {selectedPost.isLiked ? 'Added to Favorites' : 'Add to Favorites'}
              </button>
            </div>

            {/* Comments Section */}
            <div className="px-5 pb-5">
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-gray-900 font-bold text-lg mb-4">
                  Replies ({selectedPost.comments.length})
                </h3>
                
                {/* Add Comment First */}
                <div className="mb-5">
                  <div className="flex gap-3 bg-gradient-to-r from-gray-50 to-purple-50/30 rounded-2xl p-4">
                    <UserAvatar
                      src={currentUser?.user_metadata?.avatar_url || "https://i.ibb.co/3559hRDP/G-Profile.jpg"}
                      name={currentUser?.user_metadata?.full_name || "You"}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <textarea
                        value={commentTexts[selectedPost.id] || ''}
                        onChange={(e) => setCommentTexts({ ...commentTexts, [selectedPost.id]: e.target.value })}
                        placeholder="Share your thoughts..."
                        rows={3}
                        className="w-full bg-white rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none border border-gray-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 resize-none"
                      />
                      <button
                        onClick={() => handlePostComment(selectedPost.id)}
                        disabled={!commentTexts[selectedPost.id]?.trim()}
                        className={`mt-3 px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                          commentTexts[selectedPost.id]?.trim()
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        Post Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {selectedPost.comments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">
                        No replies yet. Be the first to share your thoughts!
                      </p>
                    </div>
                  ) : (
                    selectedPost.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                      <UserAvatar
                        src={comment.user.avatar}
                        name={comment.user.name}
                        className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                      />
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-gray-900 text-sm font-semibold">{comment.user.name}</span>
                              <span className="text-gray-400 text-xs">•</span>
                              <span className="text-gray-500 text-xs">{comment.timestamp}</span>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Organizer Profile Modal */}
      {showOrganizerProfile && selectedOrganizer && (
        <OrganizerProfile
          organizerName={selectedOrganizer.name}
          organizerId={selectedOrganizer.id}
          onClose={() => {
            setShowOrganizerProfile(false);
            setSelectedOrganizer(null);
          }}
          onMessage={async (organizer) => {
            setShowOrganizerProfile(false);
            setSelectedOrganizer(null);
            const conv = await onStartConversation({
              name: organizer.name,
              avatar: organizer.avatar,
              verified: organizer.verified,
              isOrganizer: true
            });
            if (conv) {
              setActiveConversation(conv);
              setShowMessages(true);
            }
          }}
        />
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white md:max-w-md md:right-0 md:left-auto md:border-l border-gray-100 shadow-2xl animate-in slide-in-from-right-full duration-300">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              <button 
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded-full transition-colors"
                onClick={async () => {
                  setNotifications(notifications.map(n => ({ ...n, read: true })));
                  toast.success('All notifications marked as read');
                  
                  if (currentUser) {
                    try {
                      await markNotificationsAsRead(currentUser.id);
                    } catch (error) {
                      console.error('Error marking notifications as read:', error);
                    }
                  }
                }}
              >
                Mark all as read
              </button>
            </div>
            <button 
              onClick={() => setShowNotifications(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {notificationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                      notification.read ? 'bg-white hover:bg-gray-50' : 'bg-purple-50/50 hover:bg-purple-50'
                    }`}
                  >
                    <div className="relative">
                      <UserAvatar 
                        src={notification.user.avatar} 
                        name={notification.user.name} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                        notification.type === 'like' ? 'bg-pink-500' :
                        notification.type === 'comment' ? 'bg-blue-500' :
                        notification.type === 'follow' ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}>
                        {notification.type === 'like' && <Heart className="w-3 h-3 text-white fill-white" />}
                        {notification.type === 'comment' && <MessageCircle className="w-3 h-3 text-white fill-white" />}
                        {notification.type === 'follow' && <UserPlus className="w-3 h-3 text-white" />}
                        {notification.type === 'event' && <Calendar className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 leading-snug">
                        <span className="font-semibold">{notification.user.name}</span>{' '}
                        <span className="text-gray-600">{notification.content}</span>
                      </p>
                      <span className="text-xs text-gray-400 mt-0.5 block">{formatTimeAgo(notification.time)}</span>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Professional Messages Panel */}
      {showMessages && (
        !activeConversation ? (
          <ChatList 
            conversations={globalConversations}
            onSelectConversation={(conv) => {
              setActiveConversation(conv);
              if (conv.unreadCount > 0 && onMarkAsRead) {
                onMarkAsRead(conv.id);
              }
            }}
            onStartNewChat={async (user) => {
              const conv = await onStartConversation(user);
              if (conv) setActiveConversation(conv);
            }}
            onClose={() => setShowMessages(false)}
            onlineUsers={onlineUsers}
            onDeleteConversation={onDeleteConversation}
          />
        ) : (
          <ChatDetail 
            conversationId={activeConversation.id}
            recipient={{
              id: activeConversation.user.id || '',
              username: activeConversation.user.username,
              full_name: activeConversation.user.name,
              avatar_url: activeConversation.user.avatar,
              verified: activeConversation.user.verified,
              is_organizer: activeConversation.user.isOrganizer,
              updated_at: new Date().toISOString()
            } as any}
            currentUser={{ id: currentUser?.id || '' }}
            onBack={() => setActiveConversation(null)}
            onViewProfile={() => {
              setSelectedUserProfile({
                id: activeConversation.user.id || '',
                name: activeConversation.user.name,
                username: activeConversation.user.username,
                avatar: activeConversation.user.avatar,
                verified: activeConversation.user.verified,
                isOrganizer: activeConversation.user.isOrganizer,
              });
            }}
            isOnline={onlineUsers.some(u => u.id === activeConversation.user.id)}
          />
        )
      )}

      {/* Professional Thumbs Up Animation */}
      {likeAnimation.show && (
        <div
          className="fixed pointer-events-none z-[100]"
          style={{
            left: `${likeAnimation.x}px`,
            top: `${likeAnimation.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="animate-likePopup">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-4 shadow-2xl">
              <ThumbsUp className="w-10 h-10 text-white fill-white" />
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Video Player - Instagram/Snapchat/YouTube Shorts Style */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black z-[60]">
          {/* Top Controls - Minimal */}
          <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-4 pt-12 pb-6 transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setPlayingVideo(null);
                  setIsPlaying(true);
                  setShowControls(true);
                }}
                className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Video Player - Center Tap Area */}
          <div 
            className="relative w-full h-full flex items-center justify-center"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setVideoTouchStart({ x: touch.clientX, y: touch.clientY });
            }}
            onTouchEnd={(e) => {
              if (!videoTouchStart) return;
              
              const touch = e.changedTouches[0];
              const deltaX = touch.clientX - videoTouchStart.x;
              const deltaY = touch.clientY - videoTouchStart.y;
              
              // Check if it's a horizontal swipe (more horizontal than vertical)
              if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (playingVideo.clips.length > 1) {
                  if (deltaX > 0) {
                    // Swipe right = Previous clip
                    setPlayingVideo({
                      ...playingVideo,
                      clipIndex: playingVideo.clipIndex > 0 ? playingVideo.clipIndex - 1 : playingVideo.clips.length - 1
                    });
                  } else {
                    // Swipe left = Next clip
                    setPlayingVideo({
                      ...playingVideo,
                      clipIndex: playingVideo.clipIndex < playingVideo.clips.length - 1 ? playingVideo.clipIndex + 1 : 0
                    });
                  }
                }
              }
              
              setVideoTouchStart(null);
            }}
            onClick={(e) => {
              const currentTime = new Date().getTime();
              const tapLength = currentTime - lastVideoTap;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const width = rect.width;
              
              // Double tap detected (less than 300ms between taps)
              if (tapLength < 300 && tapLength > 0) {
                const video = document.getElementById('highlight-video') as HTMLVideoElement;
                if (video) {
                  if (clickX < width * 0.5) {
                    // Double tap left = Rewind 10 seconds
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    setRewindAnimation({ show: true, direction: 'left' });
                    setTimeout(() => setRewindAnimation(null), 800);
                  } else {
                    // Double tap right = Forward 10 seconds
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    setRewindAnimation({ show: true, direction: 'right' });
                    setTimeout(() => setRewindAnimation(null), 800);
                  }
                }
                setLastVideoTap(0);
                return;
              }
              
              setLastVideoTap(currentTime);
              
              // Single tap logic (after delay to check for double tap)
              setTimeout(() => {
                if (new Date().getTime() - currentTime < 280) return; // Double tap in progress
                
                // If clicked on sides (30% left or right), navigate clips
                if (playingVideo.clips.length > 1) {
                  if (clickX < width * 0.3) {
                    // Left side - Previous clip
                    setPlayingVideo({
                      ...playingVideo,
                      clipIndex: playingVideo.clipIndex > 0 ? playingVideo.clipIndex - 1 : playingVideo.clips.length - 1
                    });
                    return;
                  } else if (clickX > width * 0.7) {
                    // Right side - Next clip
                    setPlayingVideo({
                      ...playingVideo,
                      clipIndex: playingVideo.clipIndex < playingVideo.clips.length - 1 ? playingVideo.clipIndex + 1 : 0
                    });
                    return;
                  }
                }
                
                // Center tap - Play/Pause (DISABLED to avoid conflict with native controls)
                // We rely on native controls for play/pause.
                // Just toggle the custom controls visibility
                setShowControls(!showControls);
              }, 300);
            }}
          >
            {/* Video Element */}
            <video
              id="highlight-video"
              src={playingVideo.clips[playingVideo.clipIndex].videoUrl}
              autoPlay
              controls={false} // Custom controls
              muted={isMuted}
              playsInline
              loop
              preload="metadata"
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onCanPlay={(e) => {
                const video = e.currentTarget;
                video.play().catch(() => {
                  // Autoplay failed, user will need to tap to play
                });
              }}
            />

            {/* Mute Button - Top Right */}
            <div className={`absolute top-4 right-4 z-20 transition-opacity ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            {isMuted && (
              <div className={`absolute top-4 left-4 z-20 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 text-white backdrop-blur-md">
                  Tap to unmute
                </span>
              </div>
            )}

            {/* Play/Pause Icon - Center (Shows briefly when tapped) */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${
              showControls && !isPlaying ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
            </div>

            {/* Rewind/Forward Animation - Instagram Style */}
            {rewindAnimation?.show && (
              <div className={`absolute inset-0 flex items-center ${
                rewindAnimation.direction === 'left' ? 'justify-start pl-12' : 'justify-end pr-12'
              } pointer-events-none`}>
                <div className="animate-rewindPulse">
                  <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                    {rewindAnimation.direction === 'left' ? (
                      <div className="flex items-center">
                        <ArrowLeft className="w-6 h-6 text-white -mr-2" />
                        <ArrowLeft className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Play className="w-6 h-6 text-white fill-white -mr-2 ml-1" />
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                      </div>
                    )}
                  </div>
                  <span className="block text-center text-white text-xs font-bold mt-2 drop-shadow-lg">
                    10s
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Info - Minimal (Instagram/TikTok Style) */}
          <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-8 pt-20 transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">
              {playingVideo.clips[playingVideo.clipIndex].title}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  {playingVideo.clips[playingVideo.clipIndex].views >= 1000 
                    ? `${(playingVideo.clips[playingVideo.clipIndex].views / 1000).toFixed(1)}K` 
                    : playingVideo.clips[playingVideo.clipIndex].views}
                </span>
              </div>
              <span className="text-white/60">•</span>
              <span className="text-white text-sm font-medium">
                {playingVideo.clips[playingVideo.clipIndex].duration}
              </span>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideLeft {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 1000px;
            transform: translateY(0);
          }
        }
        @keyframes likePopup {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(0) rotate(-10deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) translateY(-20px) rotate(10deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(-60px) rotate(0deg);
          }
        }
        @keyframes rewindPulse {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
        .animate-slideLeft {
          animation: slideLeft 0.3s ease-out forwards;
        }
        .animate-likePopup {
          animation: likePopup 1s ease-out forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        .animate-rewindPulse {
          animation: rewindPulse 0.8s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Full-Screen Image Modal with Swipe */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <button
              className="p-2 bg-white/10 hover:bg-red-500/50 rounded-full transition-colors"
              title="Delete"
              onClick={async (e) => {
                e.stopPropagation();
                const confirmed = window.confirm('Delete this post?');
                if (!confirmed) return;
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  const post = posts.find(p => p.id === fullScreenImage.postId);
                  if (!user || !post || user.id !== post.user.id) {
                    toast.error('Not authorized to delete this post');
                    return;
                  }
                  await deletePost(fullScreenImage.postId);
                  toast.success('Post deleted');
                  setFullScreenImage(null);
                  setPosts(prev => prev.filter(p => p.id !== post.id));
                  window.dispatchEvent(new Event('postsUpdated'));
                } catch (error) {
                  console.error('Error deleting post:', error);
                  toast.error('Failed to delete post');
                }
              }}
            >
              <Trash2 className="w-6 h-6 text-white" />
            </button>
            <button
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Image Counter for Multiple Images */}
          {fullScreenImage.images.length > 1 && (
            <div className="absolute top-6 left-6 bg-[#8A2BE2]/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium z-20">
              {fullScreenImage.currentIndex + 1} / {fullScreenImage.images.length}
            </div>
          )}

          <div 
            className="relative w-full h-full flex items-center justify-center px-4 select-none"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setFullScreenTouchStart({ x: touch.clientX, y: touch.clientY });
            }}
            onTouchEnd={(e) => {
              if (!fullScreenTouchStart) return;
              
              const touch = e.changedTouches[0];
              const deltaX = touch.clientX - fullScreenTouchStart.x;
              const deltaY = touch.clientY - fullScreenTouchStart.y;
              
              // Only process horizontal swipes
              if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                e.preventDefault();
                e.stopPropagation();
                
                if (deltaX > 0 && fullScreenImage.currentIndex > 0) {
                  // Swipe right - previous image
                  setFullScreenImage({
                    ...fullScreenImage,
                    currentIndex: fullScreenImage.currentIndex - 1
                  });
                } else if (deltaX < 0 && fullScreenImage.currentIndex < fullScreenImage.images.length - 1) {
                  // Swipe left - next image
                  setFullScreenImage({
                    ...fullScreenImage,
                    currentIndex: fullScreenImage.currentIndex + 1
                  });
                }
              }
              
              setFullScreenTouchStart(null);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullScreenImage.images[fullScreenImage.currentIndex]}
              alt="Full size"
              className="max-w-full max-h-full object-contain pointer-events-none"
            />
            
            {/* Navigation Arrows for Desktop */}
            {fullScreenImage.images.length > 1 && (
              <>
                {fullScreenImage.currentIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenImage({
                        ...fullScreenImage,
                        currentIndex: fullScreenImage.currentIndex - 1
                      });
                    }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                )}
                
                {fullScreenImage.currentIndex < fullScreenImage.images.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenImage({
                        ...fullScreenImage,
                        currentIndex: fullScreenImage.currentIndex + 1
                      });
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Dot Indicators for Multiple Images */}
          {fullScreenImage.images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {fullScreenImage.images.map((_, index) => (
                <div
                  key={index}
                  className={`transition-all duration-300 rounded-full ${
                    index === fullScreenImage.currentIndex
                      ? 'w-8 h-2 bg-white'
                      : 'w-2 h-2 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUserProfile && (
        <UserProfileModal
          user={{
            id: selectedUserProfile.id,
            name: selectedUserProfile.name,
            type: (selectedUserProfile as any).type ?? (selectedUserProfile.isOrganizer ? 'Organizer' : 'Attendee'),
            avatar: selectedUserProfile.avatar,
            verified: selectedUserProfile.verified,
          }}
          onClose={() => setSelectedUserProfile(null)}
          onFollow={() => {
            toast.success(`Following ${selectedUserProfile.name}! 🎉`);
          }}
          onMessage={() => {
            handleStartConversationLocal(selectedUserProfile);
            setSelectedUserProfile(null);
          }}
        />
      )}

      {/* Share Modal */}
      {shareModalData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareModalData(null);
          }}
          title={shareModalData.title}
          text={shareModalData.text}
          url={shareModalData.url}
        />
      )}
      {/* Notifications Modal */}
    </>
  );
}
