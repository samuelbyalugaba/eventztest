import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CommentIcon } from './icons/CommentIcon';
import { 
  MessageSquare, Share2, Bookmark, 
  Volume2, VolumeX, 
  ThumbsUp,
  Star
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";

interface PostCardProps {
  post: Post;
  onLike: (postId: number) => Promise<void>;
  onSave: (postId: number) => Promise<void>;
  onShare: (post: Post) => Promise<void>;
  onProfileClick: (user: Post['user']) => void;
  onMessage?: (user: any) => void;
  onViewPost?: () => void;
  audioUnlocked?: boolean;
}

const isVideo = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

export const PostCard = React.memo(function PostCard({ post, onLike, onSave, onShare, onProfileClick, onMessage, onViewPost, audioUnlocked = false }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsCount = post.comments_count || 0;
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCarouselIndex(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);
  
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
            // Stricter threshold for autoplay - Must be FULLY visible (ratio >= 0.95 to account for subpixels)
            if (entry.isIntersecting && entry.intersectionRatio >= 0.95) {
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
              // Pause if less than 80% visible
              if (!videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }
          }
        });
      },
      { threshold: 0.95 }
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

  const isCarousel = (post.content.images?.length ?? 0) > 1;
  const videoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;
  const currentMedia = videoUrl || post.content.images?.[carouselIndex] || post.content.image;
  const isCurrentMediaVideo = !!videoUrl || isVideo(currentMedia);

  // Determine display profile (Unified Identity)
  const displayProfile = {
    name: post.user.name || post.user.username || 'User',
    avatar: post.user.avatar,
    id: post.user.id,
    isOrganizer: post.user.isOrganizer || post.user.isOrganizerPage
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 hover:shadow-md transition-shadow duration-300 p-4">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar 
            src={displayProfile.avatar} 
            name={displayProfile.name} 
            className="w-10 h-10 ring-2 ring-purple-50 cursor-pointer"
            onClick={() => onProfileClick(displayProfile as any)}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span 
                className="text-gray-900 font-bold text-sm cursor-pointer hover:text-purple-600 transition-colors"
                onClick={() => onProfileClick(displayProfile as any)}
              >
                {displayProfile.name}
              </span>
              {(displayProfile.isOrganizer || post.user.isOrganizerPage) && (
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
          <p 
            className={`text-gray-800 text-[15px] leading-relaxed transition-all cursor-pointer ${isExpanded ? '' : 'line-clamp-3'}`}
            onClick={(e) => { e.stopPropagation(); onViewPost?.(); }}
          >
            {post.content.text}
          </p>
          {(post.content.text.length > 100 || post.content.text.split('\n').length > 3) && (
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
      <div 
        className="relative overflow-hidden group rounded-2xl bg-gray-50 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onViewPost?.(); }}
      >
        {isCarousel ? (
          <div onDoubleClick={handleDoubleTap}>
            <Carousel setApi={setApi} className="w-full">
              <CarouselContent>
                {post.content.images?.map((media, index) => {
                  const isMediaVideo = isVideo(media);
                  // Only attach ref if this is the ACTIVE slide to ensure IntersectionObserver works correctly
                  const isActive = index === carouselIndex;

                  return (
                    <CarouselItem key={index} className="pl-0">
                      <div 
                        className="relative w-full flex items-center justify-center bg-gray-100 aspect-square"
                      >
                        {isMediaVideo ? (
                          <div className="relative w-full h-full bg-black">
                            {isVideoLoading && isActive && <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />}
                            <video
                              ref={isActive ? videoRef : null}
                              src={media}
                              className="w-full h-full object-cover"
                              loop
                              muted={isMuted}
                              playsInline
                              preload="metadata"
                              onClick={handleManualPlay}
                              onLoadedData={() => setIsVideoLoading(false)}
                            />
                            {/* Video Controls (Show only on active slide) */}
                            {isActive && (
                              <>
                                <div className="absolute bottom-4 right-4 z-10">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                    className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                                  >
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <ImageWithFallback
                            src={media}
                            alt={`Post content ${index + 1}`}
                            className="w-full h-full object-cover"
                            fallbackType="image"
                            loading={index === 0 ? "eager" : "lazy"}
                            width={600}
                            height={600}
                            quality={80}
                            resize="cover"
                          />
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              {/* Show Navigation Arrows on Desktop / Hover */}
              <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                 <CarouselPrevious className="left-4" />
                 <CarouselNext className="right-4" />
              </div>
              
              {/* Carousel Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {post.content.images?.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${
                      idx === carouselIndex ? 'bg-white w-4' : 'bg-white/50'
                    }`} 
                  />
                ))}
              </div>
            </Carousel>
          </div>
        ) : (
          /* SINGLE MEDIA RENDER (No Carousel) */
          <div 
            className={`relative w-full flex items-center justify-center ${isCurrentMediaVideo ? 'bg-black min-h-[250px]' : 'min-h-[250px]'}`}
            onDoubleClick={handleDoubleTap}
          >
             {isCurrentMediaVideo ? (
                /* ... Existing Video Logic for Single File ... */
                <div className="relative w-full bg-black min-h-[250px]">
                  {isVideoLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />}
                  <video
                    ref={videoRef}
                    src={currentMedia}
                    className="w-full h-auto max-h-[600px]"
                    loop
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                    onClick={handleManualPlay}
                    onLoadedData={() => setIsVideoLoading(false)}
                  />
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
                </div>
             ) : (
                <ImageWithFallback
                  src={currentMedia}
                  alt="Post content"
                  className="w-full h-auto object-cover max-h-[600px]"
                  fallbackType="image"
                  loading="lazy"
                  width={800}
                  quality={85}
                />
             )}
          </div>
        )}

        {/* Double Tap Animation Overlay */}
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 duration-300">
            <ThumbsUp className="w-24 h-24 text-purple-600 fill-purple-600 drop-shadow-xl animate-bounce" />
          </div>
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

        <button 
          onClick={(e) => { e.stopPropagation(); onViewPost?.(); }}
          className="flex-1 w-0 bg-white rounded-full py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <CommentIcon className="w-5 h-5" color="#4b5563" />
          <span className="text-sm font-bold text-gray-700">{commentsCount}</span>
        </button>

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
          <MessageSquare className="w-5 h-5 text-gray-600" /> 
        </button>

      </div>
    </div>
  );
});
