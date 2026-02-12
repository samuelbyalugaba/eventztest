import React, { useState, useEffect, useRef } from 'react';
import { Post, Comment } from '../types';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  MessageSquare, Share2, Bookmark, 
  Play, Volume2, VolumeX, 
  ChevronLeft, ChevronRight, Send, ThumbsUp,
  Star, MessageCircle
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
import { sanitizeText } from '../utils/sanitize';
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
  onMessage?: (user: any) => void;
  isFollowed?: boolean;
  audioUnlocked?: boolean;
}

const isVideo = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const PostCard = React.memo(function PostCard({ post, currentUser, onLike, onSave, onShare, onProfileClick, onFollow, onMessage, isFollowed = false, audioUnlocked = false }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
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
  
  // Intersection Observer for Video Autoplay & Concurrency Management
  useEffect(() => {
    // Listen for other videos playing
    const handleOtherVideoPlay = (e: CustomEvent) => {
      if (e.detail.postId !== post.id && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('video-play', handleOtherVideoPlay as EventListener);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              // Try to play with sound first
              if (videoRef.current.paused) {
                // Ensure we try unmuted first
                videoRef.current.muted = false;
                setIsMuted(false);
                
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.then(() => {
                    setIsPlaying(true);
                    // Notify others to stop
                    window.dispatchEvent(new CustomEvent('video-play', { detail: { postId: post.id } }));
                  }).catch((error) => {
                    console.log("Autoplay with sound failed, falling back to muted", error);
                    // Autoplay with sound blocked; fallback to muted
                    if (videoRef.current) {
                      videoRef.current.muted = true;
                      setIsMuted(true);
                      videoRef.current.play().then(() => {
                        setIsPlaying(true);
                      }).catch((e) => {
                        console.error("Autoplay muted failed", e);
                        setIsPlaying(false);
                      });
                    }
                  });
                }
              } else if (audioUnlocked && videoRef.current.muted) {
                // If already playing and audio is unlocked, ensure we are unmuted
                videoRef.current.muted = false;
                setIsMuted(false);
              }
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      window.removeEventListener('video-play', handleOtherVideoPlay as EventListener);
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [carouselIndex, post.id, audioUnlocked]);

  // Effect to handle audio unlock when already playing
  useEffect(() => {
    if (audioUnlocked && isPlaying && videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  }, [audioUnlocked, isPlaying]);

  const handleManualPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent('video-play', { detail: { postId: post.id } }));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

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
    
    const sanitizedComment = sanitizeText(newComment.trim());
    if (!sanitizedComment) {
      toast.error('Invalid comment content');
      return;
    }

    try {
      const commentData = await createPostComment(post.id, currentUser.id, sanitizedComment);
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
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow duration-300 p-4">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between mb-3">
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
              {(post.user.isOrganizer || post.user.isOrganizerPage) && (
                <Star className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
              )}
              {post.user.verified && !post.user.isOrganizer && (
                <div className="bg-blue-500 rounded-full p-0.5" title="Verified">
                  <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {post.timestamp}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onFollow && currentUser && post.user.id !== currentUser.id && !isFollowed && (
            <button
              onClick={(e) => {
                 e.stopPropagation();
                 onFollow(post.user.id);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors mr-1"
            >
              Follow
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

      {/* 2. TEXT CONTENT */}
      {post.content.text && (
        <div className="mb-3 px-1">
          <p className={`text-gray-800 text-[15px] leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>
            {post.content.text}
          </p>
          {post.content.text.length > 150 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 text-sm mt-1 hover:text-gray-700 font-medium"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* 3. MEDIA CONTENT */}
      <div className="relative overflow-hidden group rounded-2xl bg-gray-50">
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
                preload="metadata"
                onClick={handleManualPlay}
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
              {isMuted && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 text-white backdrop-blur-md">
                    Tap to unmute
                  </span>
                </div>
              )}
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
              loading="lazy"
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

      {/* 4. FOOTER ACTION BAR */}
      <div className="mt-4 bg-purple-50 rounded-2xl p-2 flex items-center justify-between gap-2">
        <button 
          onClick={handleLike}
          className="flex-1 w-0 bg-white rounded-full py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
           <ThumbsUp className={`w-5 h-5 ${isLiked ? 'text-purple-600 fill-purple-600' : 'text-gray-600'}`} />
           <span className={`text-sm font-bold ${isLiked ? 'text-purple-600' : 'text-gray-700'}`}>{likesCount}</span>
        </button>

        <Drawer open={showComments} onOpenChange={(open: boolean) => {
            setShowComments(open);
            if (open) loadComments();
          }}>
            <DrawerTrigger asChild>
              <button 
                className="flex-1 w-0 bg-white rounded-full py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-bold text-gray-700">{commentsCount}</span>
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
          className="flex-1 w-0 bg-white rounded-full py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
        
         <button 
           onClick={() => onMessage?.(post.user)}
           className="flex-1 w-0 bg-white rounded-full py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
         >
          <MessageCircle className="w-5 h-5 text-gray-600" /> 
        </button>

      </div>
    </div>
  );
});
