import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post } from '../types';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CommentIcon } from './icons/CommentIcon';
import verifiedBadge from '../assets/verified-badge.png';
import { 
  Share2, Bookmark, MoreHorizontal,
  Volume2, VolumeX, Maximize,
  Heart, Flag, Ban, MessageCircle, Pencil, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { reportContent, blockUser } from '../utils/supabase/api';
import { askForReportReason, confirmBlockUser } from '../utils/moderation';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  onLike: (postId: number) => Promise<void>;
  onSave: (postId: number) => Promise<void>;
  onShare: (post: Post) => Promise<void>;
  onProfileClick: (user: Post['user']) => void;
  currentUserId?: string | null;
  onMessage?: (user: any) => void;
  onUserBlocked?: (userId: string) => void;
  onDelete?: (postId: number) => Promise<void>;
  onEditCaption?: (postId: number, caption: string) => Promise<void>;
  onViewPost?: (startTime?: number, isMuted?: boolean) => void;
  onViewComments?: () => void;
  isPaused?: boolean;
}

const isVideo = (url?: string) => {
  if (!url) return false;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i.test(cleaned);
};

const mediaControlButtonClass =
  'inline-flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-full bg-black/50 p-0 text-white leading-none backdrop-blur-md transition-colors hover:bg-black/70';

const mediaControlIconClass = 'block h-3.5 w-3.5 text-white';

export const PostCard = React.memo(function PostCard({ 
  post, 
  onLike, 
  onSave, 
  onShare, 
  onProfileClick, 
  currentUserId,
  onMessage,
  onUserBlocked,
  onDelete,
  onEditCaption,
  onViewPost, 
  onViewComments, 
  isPaused = false
}: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsCount = post.comments_count || 0;
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);
  const [isLowInternet, setIsLowInternet] = useState(false);

  useEffect(() => {
    setIsSaved(post.isSaved);
  }, [post.isSaved]);

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const updateConnection = () => {
        setIsLowInternet(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.saveData);
      };
      connection.addEventListener('change', updateConnection);
      updateConnection();
      return () => connection.removeEventListener('change', updateConnection);
    }
  }, []);

  const updateCarouselHeight = useCallback(() => {
    if (!api) return;
    const slide = api.slideNodes()[0] as HTMLElement | undefined;
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

  const markVideoReady = useCallback(() => {
    setIsVideoLoading(false);
  }, []);

  const toggleVideoMute = useCallback((videoEl?: HTMLVideoElement | null) => {
    const target = videoEl || videoRef.current;
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    if (!target) return;

    target.muted = nextMuted;

    if (!nextMuted && target.paused) {
      const playPromise = target.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          target.muted = true;
          setIsMuted(true);
          setIsPlaying(false);
        });
      }
    }
  }, [isMuted]);

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
    
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSize);
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
            // If on low internet, we might want to be more conservative with autoplay
            const canAutoplay = !isLowInternet || entry.intersectionRatio >= 0.8;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !isPaused && canAutoplay) {
              if (videoRef.current.paused) {
                videoRef.current.muted = isMuted;

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
      { threshold: [0, 0.25, 0.5, 0.8, 1] }
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
  }, [carouselIndex, post.id, isLowInternet, isPaused, isMuted]);

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

  const normalizedImages = (post.content.images ?? [])
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .map((url) => url.trim());
  const fallbackImage = typeof post.content.image === 'string' && post.content.image.trim().length > 0
    ? post.content.image.trim()
    : undefined;
  const mediaItems = normalizedImages.length > 0 ? normalizedImages : (fallbackImage ? [fallbackImage] : []);
  const videoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;
  const hasMedia = Boolean(videoUrl || mediaItems.length > 0);
  const isCarousel = !videoUrl && mediaItems.length > 1;
  const firstCarouselMedia = mediaItems[0];
  const currentMedia = videoUrl || mediaItems[carouselIndex] || mediaItems[0];
  const isCurrentMediaVideo = !!videoUrl || isVideo(currentMedia);
  const videoPoster = post.isHighlight 
    ? (post.highlights?.[0]?.thumbnail || mediaItems.find((u) => !!u && !isVideo(u)))
    : mediaItems.find((u) => !!u && !isVideo(u));
  const currentVideoSrc = currentMedia ? `${currentMedia}${currentMedia.includes('#') ? '' : '#t=0.1'}` : undefined;
  const getMediaFrameStyle = useCallback((media?: string): React.CSSProperties => {
    const referenceMedia = isCarousel ? firstCarouselMedia : media;
    const ratio = referenceMedia ? mediaAspectRatios[referenceMedia] : undefined;
    return { aspectRatio: ratio && Number.isFinite(ratio) ? String(ratio) : '4 / 5' };
  }, [firstCarouselMedia, isCarousel, mediaAspectRatios]);

  useEffect(() => {
    setIsVideoLoading(isCurrentMediaVideo);
    setVideoError(null);
  }, [currentVideoSrc, isCurrentMediaVideo]);

  useEffect(() => {
    requestAnimationFrame(updateCarouselHeight);
  }, [mediaAspectRatios, updateCarouselHeight]);

  // Determine display profile (Unified Identity)
  const displayProfile = {
    name: post.user.name || post.user.username || 'User',
    username: post.user.username || '',
    avatar: post.user.avatar,
    id: post.user.id || post.user_id,
    verified: !!post.user.verified,
    isOrganizer: post.user.isOrganizer || post.user.isOrganizerPage,
    isOrganizerPage: post.user.isOrganizerPage
  };
  const postOwnerId = displayProfile.id || post.user_id;
  const isOwnPost = !!currentUserId && !!postOwnerId && String(currentUserId) === String(postOwnerId);

  const handleReportUser = async () => {
    if (!postOwnerId) {
      toast.error('Could not find this profile');
      return;
    }

    const reason = askForReportReason(displayProfile.name);
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'profile',
        contentId: postOwnerId,
        reason,
        details: post.content.text,
        reportedUserId: postOwnerId,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  const handleEditOwnPost = async () => {
    if (!onEditCaption) {
      toast.error('Editing is unavailable');
      return;
    }

    const nextCaption = window.prompt('Edit caption', post.content.text || '');
    if (nextCaption === null || nextCaption === post.content.text) return;

    try {
      await onEditCaption(post.id, nextCaption);
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    }
  };

  const handleDeleteOwnPost = async () => {
    if (!onDelete) {
      toast.error('Deleting is unavailable');
      return;
    }

    await onDelete(post.id);
  };

  const handleBlockUser = async () => {
    if (!postOwnerId) {
      toast.error('Could not find this profile');
      return;
    }
    if (!confirmBlockUser(displayProfile.name)) return;

    try {
      await blockUser(postOwnerId);
      onUserBlocked?.(postOwnerId);
      toast.success('User blocked');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to block user');
    }
  };

  const handleMessageUser = () => {
    if (!onMessage) {
      toast.error('Messaging is unavailable');
      return;
    }
    onMessage(displayProfile);
  };

  return (
    <article className="feed-post-card overflow-hidden">
      
      {/* 1. HEADER */}
      <div className="feed-post-head">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <UserAvatar 
            src={displayProfile.avatar} 
            name={displayProfile.name} 
            size="md"
            verified={post.user.verified}
            className="feed-post-avatar cursor-pointer border border-[#EDEDED]"
            onClick={() => onProfileClick(displayProfile as any)}
          />
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span 
                className="feed-post-name cursor-pointer truncate transition-colors hover:text-purple-600"
                onClick={() => onProfileClick(displayProfile as any)}
              >
                {displayProfile.name}
              </span>
              {(displayProfile.isOrganizer || post.user.isOrganizerPage) && (
                <img
                  src={verifiedBadge}
                  alt="Creator badge"
                  className="w-3.5 h-3.5 object-contain"
                />
              )}
            </div>
            <span className="feed-post-time">
              {post.timestamp}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="feed-post-more hover:bg-gray-50"
              aria-label="Post options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-[1.125rem] w-[1.125rem]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="z-[90] min-w-[180px] rounded-xl border-gray-100 bg-white p-1.5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {isOwnPost ? (
              <>
                <DropdownMenuItem
                  onClick={() => void handleEditOwnPost()}
                  className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit caption
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleDeleteOwnPost()}
                  className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={handleMessageUser}
                  className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleReportUser()}
                  className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
                >
                  <Flag className="h-4 w-4" />
                  Report User
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleBlockUser()}
                  className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-600"
                >
                  <Ban className="h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. MEDIA CONTENT */}
      {hasMedia && (
        <div
          className="feed-post-media group cursor-pointer"
          onClick={(e) => { 
            e.stopPropagation(); 
            const startTime = videoRef.current?.currentTime || 0;
            onViewPost?.(startTime, isMuted); 
          }}
        >
          {isCarousel ? (
          <div onDoubleClick={handleDoubleTap}>
            <Carousel
              setApi={setApi}
              opts={{ align: 'start', containScroll: 'trimSnaps', dragFree: false, duration: 22 }}
              className="w-full [touch-action:pan-y]"
            >
              <CarouselContent
                className="ml-0 transform-gpu transition-[height] duration-300 ease-out will-change-transform"
                style={carouselHeight ? { height: `${carouselHeight}px` } : undefined}
              >
                {mediaItems.map((media, index) => {
                  const isMediaVideo = isVideo(media);
                  // Only attach ref if this is the ACTIVE slide to ensure IntersectionObserver works correctly
                  const isActive = index === carouselIndex;
                  const shouldRenderMedia = index === 0 || Math.abs(index - carouselIndex) <= 1;

                  return (
                    <CarouselItem key={index} className="pl-0 transform-gpu [backface-visibility:hidden]">
                      <div
                        data-media-frame="true"
                        className="relative w-full overflow-hidden bg-[#F6F6F6] [contain:layout_paint]"
                        style={getMediaFrameStyle(media)}
                      >
                        {!shouldRenderMedia ? (
                          <div className="absolute inset-0 bg-[#F6F6F6]" />
                        ) : isMediaVideo ? (
                          <div className="absolute inset-0 bg-[#F6F6F6]">
                            {isVideoLoading && isActive && !videoPoster && <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />}
                            {videoError && isActive && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 px-5 text-center text-xs font-medium text-gray-500">
                                {videoError}
                              </div>
                            )}
                            <video
                              id={`video-card-${post.id}-${index}`}
                              ref={isActive ? videoRef : null}
                              src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
                              poster={videoPoster}
                              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${isVideoLoading && isActive && !videoPoster ? 'opacity-0' : 'opacity-100'}`}
                              loop
                              muted={isMuted}
                              playsInline
                              preload={isLowInternet ? "none" : "metadata"}
                              controls={false}
                              disablePictureInPicture
                              controlsList="nodownload noplaybackrate noremoteplayback"
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                if (v.videoWidth > 0 && v.videoHeight > 0) {
                                  const next = v.videoWidth / v.videoHeight;
                                  setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                                }
                                markVideoReady();
                                requestAnimationFrame(updateCarouselHeight);
                              }}
                              onLoadedData={markVideoReady}
                              onCanPlay={markVideoReady}
                              onPlaying={() => {
                                markVideoReady();
                                setIsPlaying(true);
                              }}
                              onPause={() => setIsPlaying(false)}
                              onError={() => {
                                markVideoReady();
                                setVideoError('This video format cannot play on this device.');
                              }}
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
                                    className={mediaControlButtonClass}
                                  >
                                    <Maximize className={mediaControlIconClass} />
                                  </button>
                                </div>
                                <div className="absolute bottom-4 right-4 z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const videoEl = document.getElementById(`video-card-${post.id}-${index}`) as HTMLVideoElement | null;
                                      toggleVideoMute(videoEl);
                                    }}
                                    className={mediaControlButtonClass}
                                  >
                                    {isMuted ? <VolumeX className={mediaControlIconClass} /> : <Volume2 className={mediaControlIconClass} />}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <ImageWithFallback
                            src={media}
                            alt={`Post content ${index + 1}`}
                            className="absolute inset-0 h-full w-full"
                            imageClassName="object-cover"
                            fallbackType="image"
                            loading={index === 0 ? "eager" : "lazy"}
                            displayWidth={520}
                            quality={78}
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
                {mediaItems.map((_, idx) => (
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
            data-media-frame="true"
            className="relative flex w-full items-center justify-center bg-[#F6F6F6]"
            style={getMediaFrameStyle(currentMedia)}
            onDoubleClick={handleDoubleTap}
          >
             {isCurrentMediaVideo ? (
                /* ... Existing Video Logic for Single File ... */
                <div className="relative h-full w-full overflow-hidden bg-[#F6F6F6]">
                  {isVideoLoading && !videoPoster && <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />}
                  {videoError && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 px-5 text-center text-xs font-medium text-gray-500">
                      {videoError}
                    </div>
                  )}
                  <video
                    id={`video-card-${post.id}`}
                    ref={videoRef}
                    src={currentVideoSrc}
                    poster={videoPoster}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${isVideoLoading && !videoPoster ? 'opacity-0' : 'opacity-100'}`}
                    loop
                    muted={isMuted}
                    playsInline
                    preload={isLowInternet ? "none" : "metadata"}
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
                      markVideoReady();
                    }}
                    onLoadedData={markVideoReady}
                    onCanPlay={markVideoReady}
                    onPlaying={() => {
                      markVideoReady();
                      setIsPlaying(true);
                    }}
                    onPause={() => setIsPlaying(false)}
                    onError={() => {
                      markVideoReady();
                      setVideoError('This video format cannot play on this device.');
                    }}
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
                      className={mediaControlButtonClass}
                    >
                      <Maximize className={mediaControlIconClass} />
                    </button>
                  </div>
                  <div className="absolute bottom-4 right-4 z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const videoEl = document.getElementById(`video-card-${post.id}`) as HTMLVideoElement | null;
                        toggleVideoMute(videoEl);
                      }}
                      className={mediaControlButtonClass}
                    >
                      {isMuted ? <VolumeX className={mediaControlIconClass} /> : <Volume2 className={mediaControlIconClass} />}
                    </button>
                  </div>
                </div>
             ) : (
                <div className="relative h-full w-full overflow-hidden bg-[#F6F6F6]">
                  <ImageWithFallback
                    src={currentMedia}
                    alt="Post content"
                    className="absolute inset-0 h-full w-full"
                    imageClassName="object-cover"
                    fallbackType="image"
                    loading="lazy"
                    displayWidth={800}
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
              <Heart className="w-24 h-24 text-purple-600 fill-purple-600 drop-shadow-xl animate-bounce" />
            </div>
          )}
        </div>
      )}

      {/* 3. TEXT CONTENT */}
      {(post.content.text || (post.content.hashtags?.length ?? 0) > 0) && (
        <div className="feed-post-caption">
          {post.content.text && (
            <>
              <p
                className={`transition-all ${isExpanded ? '' : 'line-clamp-3'}`}
              >
                {post.content.text}
              </p>
              {(post.content.text.length > 100 || post.content.text.split('\n').length > 3) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 text-xs mt-1 hover:text-gray-700 font-medium"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </>
          )}
          {(post.content.hashtags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(post.content.hashtags ?? []).slice(0, 4).map((tag) => (
                <span key={tag} className="feed-post-hashtag">
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. FOOTER ACTION BAR */}
      <div className="feed-post-actions">
        <button
          onClick={handleLike}
          className={`feed-action-btn feed-like-btn ${isLiked ? 'feed-action-liked' : ''}`}
        >
           <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
           <span>{likesCount}</span>
        </button>

        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            onViewComments?.(); 
          }}
          className="feed-action-btn"
        >
          <CommentIcon className="h-[1.05rem] w-[1.05rem] overflow-visible" color="currentColor" />
          <span>{commentsCount}</span>
        </button>

        <div className="feed-action-spacer" />

        <button 
          onClick={() => onShare(post)}
          className="feed-action-icon-btn"
          aria-label="Share post"
        >
          <Share2 className="h-4 w-4" />
        </button>

        <button
          onClick={handleSave}
          className={`feed-save-pill ${isSaved ? 'feed-save-saved' : ''}`}
          aria-label={isSaved ? "Unsave post" : "Save post"}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  );
});
