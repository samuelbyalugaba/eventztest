import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post } from '../types';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CommentIcon } from './icons/CommentIcon';
import { 
  MessageSquare, Share2, Bookmark, 
  Volume2, VolumeX, Maximize,
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
  onViewPost?: (startTime?: number, isMuted?: boolean) => void;
  onViewComments?: () => void;
  audioUnlocked?: boolean;
  isPaused?: boolean;
}

const isVideo = (url?: string) => {
  if (!url) return false;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|mov)$/i.test(cleaned);
};

export const PostCard = React.memo(function PostCard({ 
  post, 
  onLike, 
  onSave, 
  onShare, 
  onProfileClick, 
  onMessage, 
  onViewPost, 
  onViewComments, 
  audioUnlocked = false,
  isPaused = false
}: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsCount = post.comments_count || 0;
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);

  const updateCarouselHeight = useCallback(() => {
    if (!api) return;
    const index = api.selectedScrollSnap();
    const slide = api.slideNodes()[index] as HTMLElement | undefined;
    const frame = slide?.querySelector('[data-media-frame="true"]') as HTMLElement | null;
    if (!frame) return;
    const next = Math.ceil(frame.getBoundingClientRect().height);
    if (next > 0) setCarouselHeight((prev) => (prev === next ? prev : next));
  }, [api]);
  
  const requestVideoFullscreen = async (videoEl: HTMLVideoElement) => {
    const isFullscreen = () =>
      document.fullscreenElement === videoEl ||
      (document as any).webkitFullscreenElement === videoEl ||
      (document as any).msFullscreenElement === videoEl;

    const disableControls = () => {
      videoEl.controls = false;
    };

    videoEl.controls = false;
    videoEl.addEventListener('webkitendfullscreen', disableControls, { once: true } as any);

    try {
      if (videoEl.requestFullscreen) {
        await videoEl.requestFullscreen();
      } else if ((videoEl as any).webkitEnterFullscreen) {
        (videoEl as any).webkitEnterFullscreen();
      } else if ((videoEl as any).webkitRequestFullscreen) {
        (videoEl as any).webkitRequestFullscreen();
      } else if ((videoEl as any).msRequestFullscreen) {
        (videoEl as any).msRequestFullscreen();
      }
    } catch {
      return;
    }

    if (isFullscreen() || (videoEl as any).webkitDisplayingFullscreen) {
      videoEl.controls = true;
    }
  };

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

    const onSize = () => {
      requestAnimationFrame(updateCarouselHeight);
    };
    onSize();
    api.on("reInit", onSize);
    api.on("select", onSize);
    
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSize);
      api.off("select", onSize);
    };
  }, [api, updateCarouselHeight]);
  
  // Effect to handle fullscreen controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        if (document.fullscreenElement === v || 
            (document as any).webkitFullscreenElement === v || 
            (document as any).msFullscreenElement === v) {
          v.controls = true;
        } else {
          v.controls = false;
        }
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Intersection Observer for Video Autoplay & Concurrency Management
  useEffect(() => {
    // Listen for other videos playing
    const handleOtherVideoPlay = (e: CustomEvent) => {
      const otherId = e.detail.id || e.detail.postId;
      if (otherId !== post.id && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('video-play', handleOtherVideoPlay as EventListener);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            // Threshold for autoplay - Now starts at 50% visibility
            // Also check if we are explicitly paused (e.g. modal is open)
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !isPaused) {
              if (videoRef.current.paused) {
                const shouldMute = !audioUnlocked;
                videoRef.current.muted = shouldMute;
                setIsMuted(shouldMute);

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      setIsPlaying(true);
                      window.dispatchEvent(new CustomEvent('video-play', { detail: { postId: post.id } }));
                    })
                    .catch(() => {
                      setIsPlaying(false);
                    });
                }
              } else if (audioUnlocked && videoRef.current.muted) {
                // If already playing and audio is unlocked, ensure we are unmuted
                videoRef.current.muted = false;
                setIsMuted(false);
              }
            } else {
              // Pause if less than 50% visible OR if we are explicitly paused
              if (!videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    // Force pause if isPaused becomes true while visible
    if (isPaused && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    return () => {
      window.removeEventListener('video-play', handleOtherVideoPlay as EventListener);
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [carouselIndex, post.id, audioUnlocked, isPaused]);

  // Effect to handle audio unlock when already playing
  useEffect(() => {
    if (audioUnlocked && isPlaying && videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  }, [audioUnlocked, isPlaying]);

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
  const videoPoster = post.isHighlight ? post.content.images?.find((u) => !!u && !isVideo(u)) : undefined;
  const currentVideoSrc = currentMedia ? `${currentMedia}${currentMedia.includes('#') ? '' : '#t=0.1'}` : undefined;
  const currentAspectRatio = currentMedia ? (mediaAspectRatios[currentMedia] ?? 1) : 1;

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
            size="md"
            verified={post.user.verified}
            className="ring-2 ring-purple-50 cursor-pointer"
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

      {/* 2. MEDIA CONTENT */}
      <div 
        className="relative overflow-hidden group rounded-2xl bg-gray-50 cursor-pointer"
        onClick={(e) => { 
          e.stopPropagation(); 
          const startTime = videoRef.current?.currentTime || 0;
          onViewPost?.(startTime, isMuted); 
        }}
      >
        {isCarousel ? (
          <div onDoubleClick={handleDoubleTap}>
            <Carousel setApi={setApi} className="w-full">
              <CarouselContent
                className="transition-[height] duration-300"
                style={carouselHeight ? { height: `${carouselHeight}px` } : undefined}
              >
                {post.content.images?.map((media, index) => {
                  const isMediaVideo = isVideo(media);
                  // Only attach ref if this is the ACTIVE slide to ensure IntersectionObserver works correctly
                  const isActive = index === carouselIndex;

                  return (
                    <CarouselItem key={index} className="pl-0">
                      <div data-media-frame="true" className="relative w-full bg-gray-100 overflow-hidden" style={{ aspectRatio: mediaAspectRatios[media] ?? 1 }}>
                        {isMediaVideo ? (
                          <div className="absolute inset-0 bg-black">
                            {isVideoLoading && isActive && <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />}
                            <video
                              id={`video-card-${post.id}-${index}`}
                              ref={isActive ? videoRef : null}
                              src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
                              poster={videoPoster}
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                              loop
                              muted={isMuted}
                              playsInline
                              preload="metadata"
                              controls={false}
                              disablePictureInPicture
                              controlsList="nodownload noplaybackrate noremoteplayback"
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                if (v.videoWidth > 0 && v.videoHeight > 0) {
                                  const next = v.videoWidth / v.videoHeight;
                                  setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                                }
                                requestAnimationFrame(updateCarouselHeight);
                              }}
                              onLoadedData={() => setIsVideoLoading(false)}
                            />
                            {/* Video Controls (Show only on active slide) */}
                            {isActive && (
                              <>
                                <div className="absolute bottom-4 left-4 z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const videoEl = document.getElementById(`video-card-${post.id}-${index}`) as HTMLVideoElement;
                                      if (videoEl) {
                                        requestVideoFullscreen(videoEl);
                                      }
                                    }}
                                    className="p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                                  >
                                    <Maximize className="w-3.5 h-3.5 text-white" />
                                  </button>
                                </div>
                                <div className="absolute bottom-4 right-4 z-10">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                    className="p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                                  >
                                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <ImageWithFallback
                            src={media}
                            alt={`Post content ${index + 1}`}
                            className="absolute inset-0 w-full h-full object-contain"
                            fallbackType="image"
                            loading={index === 0 ? "eager" : "lazy"}
                            width={600}
                            height={600}
                            quality={80}
                            resize="cover"
                            onLoad={(e) => {
                              const img = e.currentTarget;
                              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                                const next = img.naturalWidth / img.naturalHeight;
                                setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                              }
                              requestAnimationFrame(updateCarouselHeight);
                            }}
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
          <div className={`relative w-full flex items-center justify-center ${isCurrentMediaVideo ? 'bg-black min-h-[200px] sm:min-h-[250px]' : 'min-h-[200px] sm:min-h-[250px]'}`} onDoubleClick={handleDoubleTap}>
             {isCurrentMediaVideo ? (
                /* ... Existing Video Logic for Single File ... */
                <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: currentAspectRatio }}>
                  {isVideoLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />}
                  <video
                    id={`video-card-${post.id}`}
                    ref={videoRef}
                    src={currentVideoSrc}
                    poster={videoPoster}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    loop
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                    controls={false}
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    onLoadedMetadata={(e) => {
                      if (!currentMedia) return;
                      const v = e.currentTarget;
                      if (v.videoWidth > 0 && v.videoHeight > 0) {
                        const next = v.videoWidth / v.videoHeight;
                        setMediaAspectRatios((prev) => (prev[currentMedia] === next ? prev : { ...prev, [currentMedia]: next }));
                      }
                    }}
                    onLoadedData={() => setIsVideoLoading(false)}
                  />
                  <div className="absolute bottom-4 left-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const videoEl = document.getElementById(`video-card-${post.id}`) as HTMLVideoElement;
                        if (videoEl) {
                          requestVideoFullscreen(videoEl);
                        }
                      }}
                      className="p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      <Maximize className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 right-4 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                      className="p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
             ) : (
                <div className="relative w-full bg-gray-100 overflow-hidden" style={{ aspectRatio: currentAspectRatio }}>
                  <ImageWithFallback
                    src={currentMedia}
                    alt="Post content"
                    className="absolute inset-0 w-full h-full object-contain"
                    fallbackType="image"
                    loading="lazy"
                    width={800}
                    quality={85}
                    onLoad={(e) => {
                      if (!currentMedia) return;
                      const img = e.currentTarget;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const next = img.naturalWidth / img.naturalHeight;
                        setMediaAspectRatios((prev) => (prev[currentMedia] === next ? prev : { ...prev, [currentMedia]: next }));
                      }
                    }}
                  />
                </div>
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

      {/* 3. FOOTER ACTION BAR */}
      <div className="mt-4 bg-purple-50 rounded-2xl p-2 flex items-center justify-between gap-2">
        <button 
          onClick={handleLike}
          className="flex-1 w-0 bg-white rounded-full py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
           <ThumbsUp className={`w-5 h-5 ${isLiked ? 'text-purple-600 fill-purple-600' : 'text-gray-600'}`} />
           <span className={`text-sm font-bold ${isLiked ? 'text-purple-600' : 'text-gray-700'}`}>{likesCount}</span>
        </button>

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            onViewComments?.(); 
          }}
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

      {/* 4. TEXT CONTENT (Caption) - moved below actions */}
      {post.content.text && (
        <div className="mt-3 px-1">
          <p 
            className={`text-gray-800 text-[15px] leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-3'}`}
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
    </div>
  );
});
