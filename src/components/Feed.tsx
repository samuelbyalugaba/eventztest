import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, MessageCircle, Share2, Bookmark, Search, Bell, X, Send, Eye, ArrowLeft, Calendar, Sparkles, TrendingUp, Users as UsersIcon, Star, ArrowUpRight, LayoutGrid, UserPlus, ThumbsUp, Play, ChevronLeft, ChevronRight, MessageSquare, MoreVertical, Mail, Trash2, Film } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getPosts, toggleLikePost, toggleSavePost, getPostComments, createPostComment, deleteConversation, markConversationAsUnread, getNotifications, markNotificationAsRead, subscribeToNotifications, getFollowedUserIds, getMutualFollows, Post as ApiPost, Notification as ApiNotification } from '../utils/supabase/api';
import { Conversation } from '../types';

import { ChatList } from './ChatList';
import { ChatDetail } from './ChatDetail';

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

interface Post {
  id: number;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
    isOrganizer?: boolean;
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

// Use ApiNotification directly or map it
type Notification = ApiNotification;

type FilterTab = 'all' | 'following' | 'organizers' | 'trending';

interface FeedProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
  onMarkAsRead?: (conversationId: number) => void;
  onlineUsers?: { id: string; name: string; avatar: string; username: string }[];
}

const isVideo = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export function Feed({ conversations: globalConversations, onStartConversation, onSendMessage, onMarkAsRead, onlineUsers = [] }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [showMessages, setShowMessages] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  const [messageSearch, setMessageSearch] = useState('');
  const [likeAnimation, setLikeAnimation] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });
  const [lastTap, setLastTap] = useState<number>(0);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>({});
  const [playingVideo, setPlayingVideo] = useState<{ postId: number; clipIndex: number; clips: HighlightClip[] } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[]; currentIndex: number; postId: number } | null>(null);
  const [fullScreenTouchStart, setFullScreenTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [carouselIndexes, setCarouselIndexes] = useState<{ [key: number]: number }>({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [lastVideoTap, setLastVideoTap] = useState<number>(0);
  const [rewindAnimation, setRewindAnimation] = useState<{ show: boolean; direction: 'left' | 'right' } | null>(null);
  const [videoTouchStart, setVideoTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [imageTouchStart, setImageTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        
        if (user) {
          // Load notifications
          try {
            const notifs = await getNotifications(user.id);
            setNotifications(notifs || []);
          } catch (e) {
            console.error('Error loading notifications:', e);
          }

          // Load following
          try {
            const following = await getFollowedUserIds(user.id);
            setFollowingIds(new Set(following));
          } catch (e) {
            console.error('Error loading following:', e);
          }

          // Subscribe to notifications
          subscribeToNotifications(user.id, () => {
             getNotifications(user.id).then(data => setNotifications(data || []));
             toast('New notification', {
               icon: <Bell className="w-4 h-4 text-purple-600" />,
             });
          });
        }
        
        const data = await getPosts({ currentUserId: user?.id });
        if (data && data.length > 0) {
          const mappedPosts: Post[] = data.map((p: ApiPost) => ({
            id: p.id,
            user: {
              id: p.user?.id || 'unknown',
              name: p.user?.full_name || p.user?.username || 'Unknown User',
              username: p.user?.username || '@unknown',
              avatar: p.user?.avatar_url,
              verified: p.user?.verified || false,
              isOrganizer: p.user?.is_organizer || false,
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
            timestamp: new Date(p.created_at).toLocaleDateString(),
            likes: p.likes_count || 0,
            comments: [], // Will load on expand
            comments_count: p.comments_count || 0,
            shares: 0,
            views: p.views || 0,
            isLiked: p.is_liked || false,
            isSaved: p.is_saved || false,
            isHighlight: !!p.video_url,
            highlights: p.video_url ? [{
              id: p.id,
              thumbnail: p.image_urls?.[0] || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop', // Vertical thumbnail fallback
              duration: p.duration || '',
              title: p.content || 'Video Highlight',
              videoUrl: p.video_url,
              views: p.views || 0,
            }] : undefined,
          }));
          setPosts(mappedPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
        toast.error('Failed to load posts');
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();

    const handlePostsUpdated = () => {
      loadPosts();
    };
    window.addEventListener('postsUpdated', handlePostsUpdated);

    return () => {
      window.removeEventListener('postsUpdated', handlePostsUpdated);
    };
  }, []);

  // Sync activeConversation with global conversations updates and mark as read
  useEffect(() => {
    if (activeConversation) {
      const updatedConv = globalConversations.find(c => c.id === activeConversation.id);
      if (updatedConv) {
        // Update local state to match global state (handles new messages, ID updates, etc.)
        // We use JSON.stringify to avoid unnecessary updates if deep equality is same, 
        // but simpler is just to check if it's a different object reference or length changed.
        // Given App.tsx creates new references on update, this is safe.
        // But to avoid infinite loops if set triggers update, we check if it's actually different.
        if (updatedConv !== activeConversation) {
          setActiveConversation(updatedConv);
        }
        
        // Mark as read if needed
        if (updatedConv.unreadCount && updatedConv.unreadCount > 0 && onMarkAsRead) {
           onMarkAsRead(updatedConv.id);
        }
      }
    }
  }, [globalConversations, activeConversation, onMarkAsRead]);
  
  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = globalConversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Calendar className="w-5 h-5 text-cyan-500" />;
      case 'update':
        return <Bell className="w-5 h-5 text-purple-500" />;
      case 'follower':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

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

  /*
  const openPostDetail = (post: Post) => {
    setSelectedPost(post);
  };
  */

  const closePostDetail = () => {
    setSelectedPost(null);
  };

  const handleDoubleTap = (post: Post, e: React.MouseEvent) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected!
      e.stopPropagation();
      
      // Only like if not already liked
      if (!post.isLiked) {
        toggleLike(post.id, e);
      } else {
        // If already liked, just show the animation again without API call
         setLikeAnimation({
          show: true,
          x: e.clientX,
          y: e.clientY,
        });
        
        setTimeout(() => {
          setLikeAnimation({ show: false, x: 0, y: 0 });
        }, 1000);
      }
    }
    
    setLastTap(currentTime);
  };

  const toggleComments = async (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(postId);
    
    // Load comments for this post
    try {
      const comments = await getPostComments(postId);
      if (comments) {
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: comments.map((c: any) => ({
                id: c.id,
                user: {
                  name: c.user?.full_name || c.user?.username || 'Unknown',
                  avatar: c.user?.avatar_url || '',
                },
                text: c.text,
                timestamp: new Date(c.created_at).toLocaleDateString(),
              }))
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

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

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;

    // Update the global state (which will sync back to us)
    onSendMessage(activeConversation.id, messageText);

    // Clear the input field
    setMessageText('');
  };

  const handleDeleteChat = async () => {
    if (!activeConversation) return;
    
    try {
      await deleteConversation(activeConversation.id);
      setActiveConversation(null);
      setShowMessages(false);
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleMarkAsUnread = async () => {
    if (!activeConversation || !currentUser) return;
    
    try {
      await markConversationAsUnread(activeConversation.id, currentUser.id);
      setActiveConversation(null);
      setShowMessages(false);
      toast.success('Marked as unread');
    } catch (error) {
      console.error('Error marking as unread:', error);
      toast.error('Failed to mark as unread');
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

  const handleOpenUserProfile = (user: { id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedUserProfile(user);
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markNotificationAsRead(n.id);
    }
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    // Handle navigation based on type?
  };

  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'organizers') return post.user.isOrganizer;
    if (activeFilter === 'trending') return post.likes > 200;
    if (activeFilter === 'following') return followingIds.has(post.user.id);
    return true;
  });

  return (
    <>
      {/* Main Feed View */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
        {/* Unique Header Design */}
        <div className={`bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 transition-all ${showMessages || showNotifications || selectedPost ? 'z-0' : 'z-50'}`}>
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
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors relative"
                  onClick={() => setShowMessages(!showMessages)}
                >
                  <MessageSquare className="w-5 h-5 text-gray-700" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-[#8A2BE2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
                <button
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full"></span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute top-16 right-4 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-slideDown">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          className="text-xs text-purple-600 font-medium hover:text-purple-700"
                          onClick={markAllAsRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-purple-50/50' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="flex gap-3">
                              <UserAvatar
                                src={notif.actor?.avatar_url}
                                name={notif.actor?.full_name || 'Someone'}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                              />
                              <div>
                                <p className="text-sm text-gray-900">
                                  <span className="font-semibold">{notif.actor?.full_name || 'Someone'}</span> {notif.message}
                                </p>
                                <span className="text-xs text-gray-400 mt-1 block">
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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
          {filteredPosts.map((post, index) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all cursor-pointer"
              onClick={(e) => handleDoubleTap(post, e)}
              style={{ animation: `slideUp 0.4s ease-out ${index * 0.08}s both` }}
            >
              {/* Unique Header with Actions on Right */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <UserAvatar
                      src={post.user.avatar}
                      name={post.user.name}
                      className="w-11 h-11 ring-2 ring-purple-100 cursor-pointer hover:ring-purple-300 transition-all"
                      onClick={() => handleOpenUserProfile(post.user)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-gray-900 text-sm font-semibold truncate cursor-pointer hover:text-purple-600 transition-colors"
                          onClick={(e) => handleOpenUserProfile(post.user, e)}
                        >
                          {post.user.name}
                        </span>
                        {post.user.verified && (
                          <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          </div>
                        )}
                        {post.user.isOrganizer && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">
                            Organizer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-500 text-xs">{post.timestamp}</span>
                        {post.recommended && (
                          <span className="text-purple-600 text-xs">• Recommended</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unique Action Buttons - Only Save on Right */}
                  <div className="flex items-center">
                    <button
                      onClick={(e) => toggleSave(post.id, e)}
                      className={`p-2 rounded-lg transition-all ${
                        post.isSaved 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                      title="Save"
                    >
                      <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-purple-600' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Post Content/Text */}
              {post.content.text && (
                <div className="px-4 pb-3">
                  <p className="text-gray-800 text-[15px] leading-relaxed">
                    {post.content.text}
                  </p>
                </div>
              )}

              {/* EVENT HIGHLIGHTS - SINGLE VERTICAL VIDEO (only for highlight posts) */}
              {post.isHighlight && post.highlights && post.highlights.length > 0 && (
                <div className="px-4 pb-4">
                  {/* Single Vertical Highlight Card */}
                  <div className="relative">
                    <div
                      className="relative cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingVideo({ postId: post.id, clipIndex: 0, clips: post.highlights! });
                      }}
                    >
                      {/* Vertical Highlight Card - Premium Style */}
                      <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-gradient-to-br from-purple-100 to-pink-100 shadow-lg">
                        {/* Highlight Thumbnail */}
                        <ImageWithFallback
                          src={post.highlights[0].thumbnail}
                          alt={post.highlights[0].title}
                          className="w-full h-full object-cover"
                          fallbackType="video"
                        />
                        
                        {/* Cinematic Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
                        
                        {/* EVENTZ Signature Border */}
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all"></div>
                        
                        {/* Play Button - Center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-300">
                            <Play className="w-5 h-5 text-[#8A2BE2] fill-[#8A2BE2] ml-0.5" />
                          </div>
                        </div>
                        
                        {/* Duration Badge - Top Right */}
                        {post.highlights[0].duration && (
                          <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/90 backdrop-blur-md rounded-lg border border-white/10">
                            <span className="text-white text-xs font-bold">{post.highlights[0].duration}</span>
                          </div>
                        )}
                        
                        {/* Clip Info - Bottom Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                          <h4 className="text-white font-bold text-base mb-1.5 line-clamp-2 leading-tight">
                            {post.highlights[0].title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                              <Eye className="w-3.5 h-3.5 text-white" />
                              <span className="text-white text-xs font-bold">
                                {post.highlights[0].views >= 1000 
                                  ? `${(post.highlights[0].views / 1000).toFixed(1)}K` 
                                  : post.highlights[0].views} views
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Carousel - Images & Videos */}
              {post.content.images && post.content.images.length > 0 && !post.isHighlight && (
                <div className="px-4 pb-4">
                  <div className="relative rounded-xl overflow-hidden group">
                    {/* Current Image/Video with Touch Handling */}
                    <div 
                      className="relative select-none"
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        setImageTouchStart({ x: touch.clientX, y: touch.clientY });
                      }}
                      onTouchEnd={(e) => {
                        if (!imageTouchStart) return;
                        
                        const touch = e.changedTouches[0];
                        const deltaX = touch.clientX - imageTouchStart.x;
                        const deltaY = touch.clientY - imageTouchStart.y;
                        
                        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                          e.preventDefault();
                          e.stopPropagation();
                          const currentIndex = carouselIndexes[post.id] || 0;
                          
                          if (deltaX > 0 && currentIndex > 0) {
                            setCarouselIndexes({
                              ...carouselIndexes,
                              [post.id]: currentIndex - 1
                            });
                          } else if (deltaX < 0 && currentIndex < post.content.images!.length - 1) {
                            setCarouselIndexes({
                              ...carouselIndexes,
                              [post.id]: currentIndex + 1
                            });
                          }
                        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                          // Only open fullscreen if it's not a video or if it's a tap on non-interactive area
                          // For now, let's allow fullscreen for images only
                          const currentUrl = post.content.images?.[carouselIndexes[post.id] || 0];
                          if (!isVideo(currentUrl)) {
                            setFullScreenImage({ 
                              images: post.content.images!, 
                              currentIndex: carouselIndexes[post.id] || 0,
                              postId: post.id 
                            });
                          }
                        }
                        
                        setImageTouchStart(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // For mouse clicks
                        const currentUrl = post.content.images![carouselIndexes[post.id] || 0];
                        if (!('ontouchstart' in window) && !currentUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
                          setFullScreenImage({ 
                            images: post.content.images!, 
                            currentIndex: carouselIndexes[post.id] || 0,
                            postId: post.id 
                          });
                        }
                      }}
                    >
                      {post.content.images[carouselIndexes[post.id] || 0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
                        <video
                          src={post.content.images[carouselIndexes[post.id] || 0]}
                          className="w-full aspect-[16/10] object-cover"
                          controls
                          playsInline
                        />
                      ) : (
                        <ImageWithFallback
                          src={post.content.images[carouselIndexes[post.id] || 0]}
                          alt={`Post image ${(carouselIndexes[post.id] || 0) + 1}`}
                          className="w-full aspect-[16/10] object-cover pointer-events-none"
                        />
                      )}
                      
                      {/* Image Counter Badge */}
                      <div className="absolute top-3 left-3 bg-[#8A2BE2]/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium pointer-events-none">
                        {(carouselIndexes[post.id] || 0) + 1} / {post.content.images.length}
                      </div>
                    </div>

                    {/* Navigation Arrows - Desktop Only */}
                    {post.content.images.length > 1 && (
                      <>
                        {(carouselIndexes[post.id] || 0) > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCarouselIndexes({
                                ...carouselIndexes,
                                [post.id]: (carouselIndexes[post.id] || 0) - 1
                              });
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        )}
                        
                        {(carouselIndexes[post.id] || 0) < post.content.images.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCarouselIndexes({
                                ...carouselIndexes,
                                [post.id]: (carouselIndexes[post.id] || 0) + 1
                              });
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}

                    {/* Dot Indicators */}
                    {post.content.images.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none z-20">
                        {post.content.images.map((_, index) => (
                          <div
                            key={index}
                            className={`transition-all duration-300 rounded-full ${
                              index === (carouselIndexes[post.id] || 0)
                                ? 'w-6 h-1.5 bg-white'
                                : 'w-1.5 h-1.5 bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Engagement Bar - Revolutionary Purple Design */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 via-purple-100/50 to-purple-50 rounded-xl px-4 py-3 border border-purple-100">
                  <button
                    onClick={(e) => toggleLike(post.id, e)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      post.isLiked
                        ? 'bg-[#8A2BE2] text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-[#8A2BE2]'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${post.isLiked ? 'fill-white' : ''}`} />
                    <span className="text-sm font-semibold">{post.likes}</span>
                  </button>

                  <button
                    onClick={(e) => toggleComments(post.id, e)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-white text-gray-700 hover:bg-purple-50 hover:text-[#8A2BE2]`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{post.comments_count || post.comments.length}</span>
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 hover:bg-purple-50 hover:text-[#8A2BE2] rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">{post.views || 0}</span>
                  </button>

                  <button
                    onClick={(e) => sharePost(post, e)}
                    className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 rounded-lg transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleStartConversationLocal(post.user, e)}
                    className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 hover:bg-purple-50 hover:text-[#8A2BE2] rounded-lg transition-all"
                    title="Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Comments Section - Slides Down */}
              {expandedPostId === post.id && (
                <div className="px-4 pb-4 space-y-4 animate-slideDown">
                  {/* Add Comment Input */}
                  <div className="flex gap-3 items-start">
                    <UserAvatar
                      src={currentUser?.user_metadata?.avatar_url || currentUser?.avatar_url}
                      name={currentUser?.user_metadata?.full_name || currentUser?.full_name || currentUser?.email || 'User'}
                      className="w-9 h-9 rounded-xl flex-shrink-0"
                    />
                    <div className="flex-1 flex gap-2">
                      <textarea
                        value={commentTexts[post.id] || ''}
                        onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                        placeholder="Write a comment..."
                        rows={1}
                        className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none border border-gray-200 focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100 resize-none transition-all"
                      />
                      <button
                        onClick={() => handlePostComment(post.id)}
                        disabled={!commentTexts[post.id]?.trim()}
                        className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                          commentTexts[post.id]?.trim()
                            ? 'bg-gradient-to-br from-[#6B21A8] via-[#7C2D9F] to-[#BE185D] hover:from-[#581C87] hover:to-[#9F1239] text-white shadow-lg shadow-purple-900/30'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  {post.comments.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <img
                            src={comment.user.avatar}
                            alt={comment.user.name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-gray-900 text-sm font-semibold">{comment.user.name}</span>
                                <span className="text-gray-400 text-xs">• {comment.timestamp}</span>
                              </div>
                              <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {post.comments.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-gray-400 text-sm">
                        No replies yet. Be the first! 💬
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

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
                  <img
                    src={selectedPost.user.avatar}
                    alt={selectedPost.user.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-4 ring-purple-100 cursor-pointer hover:ring-purple-300 transition-all"
                    onClick={(e) => handleOpenUserProfile(selectedPost.user, e)}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-gray-900 font-bold cursor-pointer hover:text-purple-600 transition-colors"
                        onClick={(e) => handleOpenUserProfile(selectedPost.user, e)}
                      >
                        {selectedPost.user.name}
                      </span>
                      {selectedPost.user.verified && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
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
                    <img
                      src="https://i.ibb.co/3559hRDP/G-Profile.jpg"
                      alt="You"
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
                        <img
                          src={comment.user.avatar}
                          alt={comment.user.name}
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

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNotifications(false)}>
          <div className="absolute right-0 top-0 w-80 bg-white h-full shadow-lg overflow-y-auto">
            <div className="px-4 py-5 border-b border-gray-100">
              <h3 className="text-gray-900 text-lg font-bold">Notifications</h3>
            </div>
            <div className="px-4 py-5">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 mb-5">
                  {notification.image && (
                    <img
                      src={notification.image}
                      alt={notification.title}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900 font-bold">{notification.title}</span>
                      {getIcon(notification.type)}
                    </div>
                    <p className="text-gray-500 text-sm">{notification.message}</p>
                    <span className="text-gray-400 text-xs">{notification.time}</span>
                  </div>
                </div>
              ))}
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
              controls
              muted
              playsInline
              loop
              preload="auto"
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
          <button
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
            onClick={() => setFullScreenImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
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
            type: selectedUserProfile.isOrganizer ? 'Organizer' : 'Attendee',
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
    </>
  );
}