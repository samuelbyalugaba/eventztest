import React, { useState, useEffect, useRef } from 'react';
import { Post, Comment } from '../types';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  MessageSquare, Share2, Bookmark, 
  Play, Volume2, VolumeX, MapPin, 
  ChevronLeft, ChevronRight, Send, ThumbsUp,
  Star, Trash2
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { Input } from "./ui/input";
import { getPostComments, createPostComment } from '../utils/supabase/api';
import { toast } from 'sonner';

interface PostCardProps {
  post: Post;
  currentUser: any;
  onLike: (postId: number) => Promise<void>;
  onSave: (postId: number) => Promise<void>;
  onShare: (post: Post) => Promise<void>;
  onProfileClick: (user: Post['user']) => void;
  onFollow?: (userId: string) => Promise<void>;
  onDelete?: (postId: number) => Promise<void>;
  isFollowed?: boolean;
}

const isVideo = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const PostCard = React.memo(function PostCard({ post, currentUser, onLike, onSave, onShare, onProfileClick, onFollow, onDelete, isFollowed = false }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };
  
  // Intersection Observer for Video Autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [carouselIndex]);

  const handleLike = async () => {
    // Optimistic UI
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    
    if (newIsLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }

    try {
      await onLike(post.id);
    } catch (error) {
      // Revert if failed
      setIsLiked(!newIsLiked);
      setLikesCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      handleLike();
    } else {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
  };

  const handleSave = async () => {
    triggerHaptic();
    setIsSaved(!isSaved);
    try {
      await onSave(post.id);
    } catch (error) {
      setIsSaved(!isSaved);
    }
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const data = await getPostComments(post.id);
      if (data) {
        setComments(data.map((c: any) => ({
          id: c.id,
          user: {
            name: c.user?.full_name || c.user?.username || 'Unknown',
            avatar: c.user?.avatar_url || '',
          },
          text: c.text,
          timestamp: new Date(c.created_at).toLocaleDateString(),
        })));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    
    try {
      const commentData = await createPostComment(post.id, currentUser.id, newComment.trim());
      const addedComment: Comment = {
        id: commentData.id,
        user: {
          name: commentData.user?.full_name || commentData.user?.username || 'Unknown',
          avatar: commentData.user?.avatar_url,
        },
        text: commentData.text,
        timestamp: 'Just now',
      };
      
      setComments([...comments, addedComment]);
      setCommentsCount(prev => prev + 1);
      setNewComment('');
      toast.success('Comment posted!');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const videoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;
  const currentMedia = videoUrl || post.content.images?.[carouselIndex] || post.content.image;
  const isCurrentMediaVideo = !!videoUrl || isVideo(currentMedia);
  const isCarousel = (post.content.images?.length ?? 0) > 1;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow duration-300">
      
      {/* 1. SOCIAL CONTEXT */}
      {post.mutualFriends && post.mutualFriends.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs text-gray-500">
          <div className="flex -space-x-2">
            {post.mutualFriends.slice(0, 3).map((friend, i) => (
              <img key={i} src={friend.avatar} alt={friend.name} className="w-5 h-5 rounded-full border-2 border-white" />
            ))}
          </div>
          <span>
            Followed by <span className="font-semibold text-gray-700">{post.mutualFriends[0].name}</span>
            {post.mutualFriends.length > 1 && ` and ${post.mutualFriends.length - 1} others`}
          </span>
        </div>
      )}

      {/* 2. POST HEADER */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar 
            src={post.user.avatar} 
            name={post.user.name} 
            className="w-10 h-10 ring-2 ring-purple-50 cursor-pointer"
            onClick={() => onProfileClick(post.user)}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span 
                className="text-gray-900 font-bold text-sm cursor-pointer hover:text-purple-600 transition-colors"
                onClick={() => onProfileClick(post.user)}
              >
                {post.user.name}
              </span>
              {post.user.isOrganizer && (
                <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
              )}
              {post.user.verified && !post.user.isOrganizer && (
                <div className="bg-blue-500 rounded-full p-0.5" title="Verified">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
               {post.event && (
                <span className="flex items-center gap-0.5 text-purple-600">
                  <MapPin className="w-3 h-3" />
                  {post.event.location.split(',')[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onFollow && currentUser && post.user.id !== currentUser.id && !isFollowed && (
            <button
              onClick={(e) => {
                 e.stopPropagation();
                 onFollow(post.user.id);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors"
            >
              Follow
            </button>
          )}

          {currentUser?.id === post.user.id && onDelete && (
            <button 
              onClick={() => onDelete(post.id)} 
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none"
              title="Delete Post"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button 
            onClick={handleSave}
            className={`p-2 rounded-full transition-colors active:scale-75 ${isSaved ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-50'}`}
            aria-label={isSaved ? "Unsave post" : "Save post"}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. POST CONTENT AREA - MEDIA */}
      <div className="relative overflow-hidden group">
        <div 
          className={`relative w-full flex items-center justify-center ${isCarousel ? 'aspect-square bg-gray-100' : ''}`}
          onDoubleClick={handleDoubleTap}
        >
          {isCurrentMediaVideo ? (
            <div className={`relative w-full bg-black ${isCarousel ? 'h-full' : ''}`}>
              <video
                ref={videoRef}
                src={currentMedia}
                className={`w-full ${isCarousel ? 'h-full object-cover' : 'h-auto'}`}
                loop
                muted={isMuted}
                playsInline
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current?.paused) {
                    videoRef.current.play();
                    setIsPlaying(true);
                  } else {
                    videoRef.current?.pause();
                    setIsPlaying(false);
                  }
                }}
              />
              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 right-4 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ImageWithFallback
              src={currentMedia}
              alt="Post content"
              className={`w-full ${isCarousel ? 'h-full object-cover' : 'h-auto'}`}
              fallbackType="image"
            />
          )}

          {/* Double Tap ThumbsUp Animation */}
          {showLikeAnimation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 duration-300">
              <ThumbsUp className="w-24 h-24 text-purple-600 fill-purple-600 drop-shadow-xl animate-bounce" />
            </div>
          )}
        </div>

        {/* Carousel Indicators */}
        {post.content.images && post.content.images.length > 1 && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {post.content.images.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === carouselIndex ? 'bg-white w-4' : 'bg-white/50'
                  }`} 
                />
              ))}
            </div>
            {carouselIndex > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setCarouselIndex(prev => prev - 1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-black/50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {carouselIndex < (post.content.images.length - 1) && (
              <button 
                onClick={(e) => { e.stopPropagation(); setCarouselIndex(prev => prev + 1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-black/50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* 4. ENGAGEMENT ACTION BAR */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className="group flex items-center gap-1.5 transition-colors focus:outline-none"
            aria-label={isLiked ? "Unlike post" : "Like post"}
          >
            <div className={`p-2 rounded-full transition-colors active:scale-75 ${isLiked ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}>
              <ThumbsUp className={`w-6 h-6 transition-transform group-hover:scale-110 ${isLiked ? 'fill-purple-600' : ''}`} />
            </div>
            {likesCount > 0 && (
              <span className={`font-semibold text-sm ${isLiked ? 'text-purple-600' : 'text-gray-700'}`}>
                {likesCount}
              </span>
            )}
          </button>

          <Drawer open={showComments} onOpenChange={(open: boolean) => {
            setShowComments(open);
            if (open) loadComments();
          }}>
            <DrawerTrigger asChild>
              <button 
                className="group flex items-center gap-1.5 transition-colors focus:outline-none"
                aria-label="View comments"
              >
                <div className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors active:scale-75">
                  <MessageSquare className="w-6 h-6 transition-transform group-hover:scale-110" />
                </div>
                {commentsCount > 0 && (
                  <span className="font-semibold text-sm text-gray-700">
                    {commentsCount}
                  </span>
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh] bg-white/85 backdrop-blur-xl border-t border-white/20 shadow-2xl">
              <DrawerHeader className="border-b border-white/20 pb-4">
                <DrawerTitle className="text-center">Comments</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 overflow-y-auto flex-1 min-h-[300px]">
                {loadingComments ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No comments yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar 
                          src={comment.user.avatar} 
                          name={comment.user.name} 
                          className="w-8 h-8 rounded-full ring-2 ring-white/50"
                        />
                        <div className="flex-1">
                          <div className="bg-white/60 p-3 rounded-2xl rounded-tl-none backdrop-blur-sm border border-white/40 shadow-sm">
                            <span className="font-semibold text-sm block mb-1">{comment.user.name}</span>
                            <p className="text-sm text-gray-800 break-words">{comment.text}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-gray-500">
                            <span>{comment.timestamp}</span>
                            <button className="font-semibold hover:text-purple-600">Reply</button>
                            <button className="font-semibold hover:text-purple-600">Like</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/20 bg-white/30 backdrop-blur-lg">
                <div className="flex items-center gap-2">
                  <UserAvatar 
                    src={currentUser?.user_metadata?.avatar_url} 
                    name={currentUser?.user_metadata?.full_name || 'Me'} 
                    className="w-8 h-8 rounded-full ring-2 ring-white/50"
                  />
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Add a comment..." 
                      className="pr-10 rounded-full bg-white/60 border-white/30 focus:bg-white focus:border-purple-200 shadow-inner"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                      maxLength={500}
                    />
                    <button 
                      onClick={handlePostComment}
                      disabled={!newComment.trim()}
                      className="absolute right-1 top-1 p-1.5 bg-purple-600 rounded-full text-white disabled:opacity-50 disabled:bg-gray-300 transition-all"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          <button 
            onClick={() => onShare(post)}
            className="group flex items-center gap-1.5 transition-colors focus:outline-none"
            aria-label="Share post"
          >
            <div className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors active:scale-75">
              <Share2 className="w-6 h-6 transition-transform group-hover:scale-110" />
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {post.views !== undefined && post.views > 0 && !(post.content.image || (post.content.images && post.content.images.length > 0)) && (
             <div className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
               {post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}k` : post.views} views
             </div>
          )}
        </div>
      </div>
      
      {/* 5. TIMESTAMP BOTTOM */}
      <div className="px-4 pb-4">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {post.timestamp}
        </span>
      </div>

      {/* 3. POST CONTENT AREA - TEXT */}
      {post.content.text && (
        <div className="px-4 pb-4">
          <p className={`text-gray-800 text-[15px] leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
            <span className="font-semibold mr-2">{post.user.name}</span>
            {post.content.text}
          </p>
          {post.content.text.length > 100 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 text-sm mt-1 hover:text-gray-700"
            >
              {isExpanded ? 'less' : 'more'}
            </button>
          )}
        </div>
      )}

    </div>
  );
});
