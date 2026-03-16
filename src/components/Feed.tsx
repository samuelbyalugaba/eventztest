import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserAvatar } from './UserAvatar';
import { PostCard } from './PostCard';
import { PostSkeleton } from './PostSkeleton';
import { Calendar, Search, MessageCircle, X, Eye, ArrowLeft, Users as UsersIcon, Star, LayoutGrid, ThumbsUp, Play, ChevronLeft, ChevronRight, MessageSquare, Volume2, VolumeX, Bell, Heart, UserPlus, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getPosts, toggleLikePost, toggleSavePost, createPostComment, getFollowedUserIds, incrementPostView, getNotifications, Notification, deletePost, markNotificationsAsRead, getPostComments, getProfile, getMessages, toggleLikeComment, updatePostCaption, searchProfiles } from '../utils/supabase/api';
import { formatTimeAgo } from '../utils/format';
import { Post, HighlightClip, Conversation } from '../types';
import { PostDetailModal } from './PostDetailModal';
import { handleShare } from '../utils/share';
import { mapPostsToViewModel } from '../utils/postMapper';

import { ChatList } from './ChatList';
import { ChatDetail } from './ChatDetail';
import { UserProfileModal } from './UserProfileModal';
import { ShareModal } from './ShareModal';
import { FeedHeader } from './FeedHeader';

type FilterTab = 'all' | 'organizers' | 'trending' | 'following';

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
  onViewPost?: (post: any) => void;
}

let feedCacheMemory: { posts: any[]; timestamp: number } | null = null;

// const isVideo = (url?: string) => {
//   if (!url) return false;
//   return /\.(mp4|webm|ogg|mov)$/i.test(url);
// };

export function Feed({ 
  conversations: globalConversations, 
  onStartConversation, 
  onMarkAsRead, 
  onlineUsers = [], 
  onDeleteConversation, 
  currentUser: propCurrentUser,
  onViewPost 
}: FeedProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const handledNavKeyRef = useRef<string | null>(null);
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
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean; type?: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  // const [messageSearch, setMessageSearch] = useState('');
  const [likeAnimation, setLikeAnimation] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState<{ postId: number; clipIndex: number; clips: HighlightClip[] } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[]; currentIndex: number; postId: number } | null>(null);
  const [fullScreenTouchStart, setFullScreenTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [videoTouchStart, setVideoTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [lastVideoTap, setLastVideoTap] = useState<number>(0);
  const [rewindAnimation, setRewindAnimation] = useState<{ show: boolean; direction: 'left' | 'right' } | null>(null);
  // const [showChatMenu, setShowChatMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [renderCount, setRenderCount] = useState(20);
  const [exploreSearch, setExploreSearch] = useState('');
  const [searchedProfiles, setSearchedProfiles] = useState<any[]>([]);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (handledNavKeyRef.current === location.key) return;
    handledNavKeyRef.current = location.key;

    const state = (location.state || {}) as any;
    if (!state?.openMessages && !state?.userToMessage) return;

    if (state.openMessages) setShowMessages(true);

    if (state.userToMessage) {
      (async () => {
        try {
          setShowMessages(true);
          const conv = await onStartConversation(state.userToMessage);
          if (conv) setActiveConversation(conv);
        } catch (e) {
          console.error('Failed to start conversation from navigation state', e);
        } finally {
          navigate(location.pathname, { replace: true });
        }
      })();
    } else {
      navigate(location.pathname, { replace: true });
    }
  }, [location.key, location.pathname, location.state, navigate, onStartConversation]);

  useEffect(() => {
    const performSearch = async () => {
      if (exploreSearch.trim().length >= 2) {
        setIsSearchingProfiles(true);
        try {
          const profiles = await searchProfiles(exploreSearch.trim());
          setSearchedProfiles(profiles || []);
        } catch (error) {
          console.error('Error searching profiles:', error);
        } finally {
          setIsSearchingProfiles(false);
        }
      } else {
        setSearchedProfiles([]);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [exploreSearch]);


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
      
      // Fetch full comments when post is selected
      const fetchComments = async () => {
        try {
          const comments = await getPostComments(selectedPost.id);
          const mappedComments = (comments || []).map((c: any) => ({
            id: c.id,
            user: {
              name: c.user?.full_name || c.user?.username || 'User',
              avatar: c.user?.avatar_url || ''
            },
            text: c.text,
            timestamp: formatTimeAgo(c.created_at)
          }));
          
          setSelectedPost(prev => prev && prev.id === selectedPost.id ? { ...prev, comments: mappedComments } : prev);
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      };
      
      fetchComments();
    }
  }, [selectedPost?.id]);

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

  const mapPosts = (data: any[]) => mapPostsToViewModel(data);

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
        try {
          const profile = await getProfile(user.id);
          setCurrentUserProfile(profile || null);
        } catch (e) {
          setCurrentUserProfile(null);
        }

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
        // If we don't have messages yet, fetch them
        if ((updatedConv.messages?.length || 0) === 0 && updatedConv.lastMessage?.text !== 'Start a conversation...') {
           // We'll fetch them and update the local activeConversation
           const loadMsgs = async () => {
             try {
               const msgs = await getMessages(updatedConv.id);
               const formattedMsgs = msgs.map((m: any) => ({
                 id: m.id,
                 senderId: m.sender_id === currentUser?.id ? 0 : parseInt(m.sender_id) || 1,
                 text: m.content,
                 timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                 read: m.is_read
               }));
               setActiveConversation({ ...updatedConv, messages: formattedMsgs });
             } catch (e) { console.error(e); }
           };
           loadMsgs();
        } else if (updatedConv !== activeConversation) {
          setActiveConversation(updatedConv);
        }
        
        // Mark as read if needed
        if (updatedConv.unreadCount && updatedConv.unreadCount > 0 && onMarkAsRead) {
           onMarkAsRead(updatedConv.id);
        }
      }
    }
  }, [activeConversation?.id, globalConversations, onMarkAsRead, currentUser?.id]);
  

  // Fetch comments for selected post
  useEffect(() => {
    if (selectedPost && (!selectedPost.comments || selectedPost.comments.length === 0) && (selectedPost.comments_count || 0) > 0) {
      const fetchComments = async () => {
        try {
          const { data: commentsData } = await supabase
            .from('post_comments')
            .select('*, user:profiles(*)')
            .eq('post_id', selectedPost.id)
            .order('created_at', { ascending: true });
          
          if (commentsData) {
            const mappedComments = commentsData.map((c: any) => ({
              id: c.id,
              user: {
                name: c.user?.full_name || c.user?.username || 'User',
                avatar: c.user?.avatar_url || '',
                is_organizer: c.user?.is_organizer || false
              },
              text: c.text,
              timestamp: formatTimeAgo(c.created_at)
            }));
            
            setSelectedPost(prev => prev ? { ...prev, comments: mappedComments } : null);
          }
        } catch (e) {
          console.error('Error fetching comments for modal:', e);
        }
      };
      fetchComments();
    }
  }, [selectedPost?.id]);

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
    
    // Construct deep link URL
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    const shared = await handleShare({
      title: `Check out this post from ${post.user.name}`,
      text: post.content.text || 'Check out this amazing post on EVENTZ!',
      url: postUrl,
    });
    
    // If native share not available, show custom modal
    if (!shared) {
      setShareModalData({
        title: `Post from ${post.user.name}`,
        text: post.content.text || 'Check out this amazing post on EVENTZ!',
        url: postUrl,
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

  const handlePostComment = async (postId: number, text: string, parentId?: number) => {
    if (!text || !text.trim()) return;

    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }

    try {
      const newCommentData = await createPostComment(postId, currentUser.id, text.trim(), parentId);
      
      const newComment: any = {
        id: newCommentData.id,
        user: {
          name: newCommentData.user?.full_name || newCommentData.user?.username || 'Unknown',
          avatar: newCommentData.user?.avatar_url,
          is_organizer: newCommentData.user?.is_organizer || false
        },
        text: newCommentData.text,
        timestamp: 'Just now',
        parent_id: newCommentData.parent_id,
        likes_count: 0,
        is_liked: false
      };

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), newComment],
            comments_count: (post.comments_count || 0) + 1
          };
        }
        return post;
      }));

      setSelectedPost(prev => {
        if (!prev || prev.id !== postId) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), newComment],
          comments_count: (prev.comments_count || 0) + 1,
        };
      });

      toast.success('Comment posted');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!currentUser) {
      toast.error('Please sign in to like comments');
      return;
    }

    try {
      const isLiked = await toggleLikeComment(commentId, currentUser.id);
      
      // Update selectedPost comments locally
      setSelectedPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: (prev.comments || []).map((c: any) => {
            if (c.id === commentId) {
              return {
                ...c,
                is_liked: isLiked,
                likes_count: isLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 0) - 1)
              };
            }
            return c;
          })
        };
      });
    } catch (e) {
      console.error('Error liking comment:', e);
      toast.error('Failed to update like');
    }
  };

  const handleEditCaption = async (postId: number, caption: string) => {
    if (!currentUser) {
      toast.error('Please sign in');
      return;
    }
    try {
      const updated = await updatePostCaption(postId, currentUser.id, caption);
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          content: {
            ...(p.content || {}),
            text: updated.content,
          }
        } as any;
      }));
      setSelectedPost(prev => {
        if (!prev || prev.id !== postId) return prev;
        return {
          ...prev,
          content: {
            ...(prev.content || {}),
            text: updated.content,
          }
        } as any;
      });
      window.dispatchEvent(new Event('postsUpdated'));
    } catch (e) {
      console.error(e);
      toast.error('Failed to update caption');
      throw e;
    }
  };

  const handleStartConversationLocal = async (user: { name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!currentUser) {
      toast.error('Please sign in to start a conversation');
      return;
    }
    
    const toastId = toast.loading('Opening chat...');
    try {
      const conversation = await onStartConversation(user);
      if (conversation) {
        // Close post detail if open AFTER we have the conversation ready
        setSelectedPost(null);
        setActiveConversation(conversation);
        setShowMessages(true);
        toast.dismiss(toastId);
      } else {
        toast.error('Could not start conversation', { id: toastId });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation', { id: toastId });
    }
  };

  const handleOpenUserProfile = (user: { id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean; isOrganizerPage?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Use onViewPost to navigate to the profile page
    if (onViewPost) {
      onViewPost({ id: user.id, isProfile: true });
    }
  };



  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'organizers') return post.user.isOrganizer;
    if (activeFilter === 'trending') return post.likes > 200;
    if (activeFilter === 'following') return followingIds.has(post.user.id);
    return true;
  });


  const handlePostClick = (post: Post) => {
    if (onViewPost) {
      onViewPost(post);
    }
  };

  return (
    <>
      {/* Main Feed View */}
      <div ref={feedContainerRef} className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
        {/* Feed Header Component */}
        <FeedHeader
          currentUser={currentUser}
          showNotifications={showNotifications}
          showMessages={showMessages}
          unreadMessagesCount={unreadMessagesCount}
          notifications={notifications}
          exploreSearch={exploreSearch}
          setExploreSearch={setExploreSearch}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onToggleNotifications={() => {
            setShowNotifications(!showNotifications);
            setShowMessages(false);
          }}
          onToggleMessages={() => {
            setShowMessages(!showMessages);
            setShowNotifications(false);
          }}
          showMessagesOrPost={showMessages || !!selectedPost}
        />

        {/* Unique Card-Based Posts */}
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {exploreSearch.trim().length >= 2 ? (
            <div className="mb-8 -mx-4">
              <div className="flex items-center justify-between px-5 mb-4">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">Profiles</h3>
                {isSearchingProfiles && (
                  <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              
              {searchedProfiles.length > 0 ? (
                <div className="flex overflow-x-auto gap-5 px-5 pb-2 scrollbar-hide">
                  {searchedProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleOpenUserProfile({
                        id: profile.id,
                        name: profile.full_name || profile.username,
                        username: profile.username,
                        avatar: profile.avatar_url,
                        verified: profile.verified,
                        isOrganizer: profile.is_organizer
                      })}
                      className="flex flex-col items-center gap-2.5 flex-shrink-0 w-20 group"
                    >
                      <div className="relative">
                        <UserAvatar 
                          src={profile.avatar_url} 
                          name={profile.full_name || profile.username} 
                          size="lg"
                          verified={profile.verified}
                          className="ring-2 ring-transparent group-hover:ring-purple-500/30 transition-all duration-300"
                        />
                        {profile.is_organizer && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm z-10">
                            <Star className="w-3.5 h-3.5 text-purple-600 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <p className="text-[12px] font-bold text-gray-900 truncate mb-0.5">
                          {profile.full_name?.split(' ')[0] || profile.username}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium truncate">@{profile.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isSearchingProfiles && (
                <div className="px-5">
                  <div className="p-6 text-center bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                    <p className="text-xs text-gray-400">No matching profiles</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
                        onLike={(id) => toggleLike(id)}
                        onSave={(id) => toggleSave(id)}
                        onShare={(p) => sharePost(p)}
                        onProfileClick={(user) => handleOpenUserProfile(user)}
                        onMessage={(user) => handleStartConversationLocal(user)}
                        audioUnlocked={audioUnlocked}
                        onViewPost={() => handlePostClick(post)}
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
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 text-lg font-semibold mb-2">Nothing here yet</h3>
                  <p className="text-gray-600 text-center text-sm max-w-xs">
                    Follow creators and explore events to see updates
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          currentUserProfile={currentUserProfile}
          onClose={closePostDetail}
          onLike={(id, e) => toggleLike(id, e)}
          onSave={(id, e) => toggleSave(id, e)}
          onShare={(p, e) => sharePost(p, e)}
          onDelete={handleDeletePost}
          onEditCaption={handleEditCaption}
          onProfileClick={(user, e) => handleOpenUserProfile(user, e)}
          onComment={(postId, text, parentId) => handlePostComment(postId, text, parentId)}
          onLikeComment={handleLikeComment}
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
              className="w-full h-full object-cover"
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
