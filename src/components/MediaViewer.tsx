import { X, Heart, Share2, Volume2, VolumeX, RotateCcw, RotateCw, Play, Pause } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useEffect, useRef } from 'react';
import { ShareModal } from './ShareModal';
import { handleShare as shareUtil } from '../utils/share';
import { toast } from 'sonner';
import { supabase, toggleLikePost, incrementPostView, incrementUserMediaView } from '../utils/supabase/api';

interface Photo {
  id: number;
  url: string;
  likes?: number;
  eventName?: string;
  isPost?: boolean;
  postId?: number;
  isLiked?: boolean;
}

interface VideoClip {
  id: number;
  thumbnail: string;
  views?: number;
  likes?: number;
  videoUrl: string;
  eventName?: string;
  isPost?: boolean;
  postId?: number;
  isLiked?: boolean;
}

interface MediaViewerProps {
  media: Photo[] | VideoClip[];
  initialIndex: number;
  onClose: () => void;
  type: 'photo' | 'video';
}

export function MediaViewer({ media, initialIndex, onClose, type }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'rewind' | 'forward' | 'play' | 'pause' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const currentMedia = media[currentIndex];

  useEffect(() => {
    if (type === 'photo') {
      setLikes((currentMedia as Photo).likes || 0);
    } else {
      setLikes((currentMedia as VideoClip).likes || 0);
    }
    setIsLiked((currentMedia as any).isLiked || false);
  }, [currentIndex, currentMedia, type]);

  // Increment view count
  useEffect(() => {
    if (media[currentIndex]) {
      const current = media[currentIndex] as (Photo & VideoClip);
      
      if (current.isPost && current.postId) {
        incrementPostView(current.postId);
      } else if (type === 'video') {
        incrementUserMediaView(current.id);
      }
    }
  }, [currentIndex, type, media]);

  // Update progress bar for videos
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const percentage = (video.currentTime / video.duration) * 100;
      setProgress(percentage);
      setCurrentTime(video.currentTime);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateDuration);
    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [currentIndex]);

  // Auto-play video on mobile
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(err => {
            console.log('Autoplay prevented:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [currentIndex, type]);

  // Auto-hide feedback
  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(null), 500);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (type === 'video') {
          rewind();
        } else if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (type === 'video') {
          forward();
        } else if (currentIndex < media.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && type === 'video') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, media.length, onClose, type, isPlaying]);

  const toggleLike = async () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikes(likes + 1);
      toast.success('Liked! ❤️', { duration: 1500 });
    } else {
      setIsLiked(false);
      setLikes(likes - 1);
    }

    // Handle API call if it's a post
    if (currentMedia.isPost && currentMedia.postId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await toggleLikePost(currentMedia.postId, user.id);
        } catch (error) {
          console.error('Error toggling like:', error);
          // Revert optimistic update
          if (!isLiked) {
            setIsLiked(false);
            setLikes(likes);
          } else {
            setIsLiked(true);
            setLikes(likes);
          }
          toast.error('Failed to update like');
        }
      }
    }
  };

  const handleShare = async () => {
    const title = type === 'photo' 
      ? `Photo from ${(currentMedia as Photo).eventName}` 
      : `Video from Event`;
    
    const shared = await shareUtil({
      title,
      text: 'Check out this amazing moment on EVENTZ!',
      url: window.location.href,
    });
    
    if (!shared) {
      setShowShareModal(true);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setShowFeedback('pause');
      } else {
        videoRef.current.play();
        setShowFeedback('play');
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const rewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setShowFeedback('rewind');
    }
  };

  const forward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      setShowFeedback('forward');
    }
  };

  // Handle tap zones for video
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (type !== 'video') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Left third = rewind 10s
    if (x < width / 3) {
      rewind();
    } 
    // Right third = forward 10s
    else if (x > (2 * width) / 3) {
      forward();
    } 
    // Center = play/pause
    else {
      togglePlayPause();
    }
  };

  // Handle progress bar scrubbing
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || type !== 'video') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (type !== 'video') return;
    e.stopPropagation();
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: MouseEvent) => {
    if (!isDragging || !videoRef.current || type !== 'video' || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (type !== 'video' || !videoRef.current) return;
    e.stopPropagation();
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleProgressTouchMove = (e: TouchEvent) => {
    if (!isDragging || !videoRef.current || type !== 'video' || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleProgressTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleProgressMouseMove);
      window.addEventListener('mouseup', handleProgressMouseUp);
      window.addEventListener('touchmove', handleProgressTouchMove);
      window.addEventListener('touchend', handleProgressTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleProgressMouseMove);
        window.removeEventListener('mouseup', handleProgressMouseUp);
        window.removeEventListener('touchmove', handleProgressTouchMove);
        window.removeEventListener('touchend', handleProgressTouchEnd);
      };
    }
  }, [isDragging]);

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-[100]">
      {/* Main Content - Full Screen */}
      <div className="relative h-full w-full flex items-center justify-center">
        {/* Media Content - Tap zones for videos */}
        <div 
          className="w-full h-full relative"
          onClick={handleVideoTap}
        >
          {type === 'photo' ? (
            <ImageWithFallback
              src={(currentMedia as Photo).url}
              fallbackSrc={(currentMedia as Photo).fallbackSrc}
              alt="Full size"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              {(currentMedia as VideoClip).videoUrl.includes('youtube.com') || (currentMedia as VideoClip).videoUrl.includes('youtu.be') ? (
                <iframe
                  src={`${(currentMedia as VideoClip).videoUrl}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&playsinline=1&loop=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: 'none' }}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={(currentMedia as VideoClip).videoUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => {
                    setIsBuffering(false);
                    setIsPlaying(true);
                  }}
                  onCanPlay={() => setIsBuffering(false)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                />
              )}
            </>
          )}

          {/* Buffering Indicator */}
          {isBuffering && type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}

          {/* Visual Feedback - Instagram Style */}
          {showFeedback && type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 animate-feedback">
                {showFeedback === 'rewind' && <RotateCcw className="w-6 h-6 text-white" />}
                {showFeedback === 'forward' && <RotateCw className="w-6 h-6 text-white" />}
                {showFeedback === 'play' && <Play className="w-6 h-6 text-white fill-white" />}
                {showFeedback === 'pause' && <Pause className="w-6 h-6 text-white fill-white" />}
              </div>
            </div>
          )}

          {/* Mobile Play Button (when autoplay blocked) */}
          {!isPlaying && type === 'video' && !isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-2xl">
                <Play className="w-10 h-10 text-gray-900 fill-gray-900 ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Close Button - Top Left ONLY */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Mute Button - Top Right (videos only) */}
        {type === 'video' && !((currentMedia as VideoClip).videoUrl.includes('youtube.com') || (currentMedia as VideoClip).videoUrl.includes('youtu.be')) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        )}

        {/* Right Side Actions - TikTok Style */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-6 z-30">
          {/* Like */}
          {((currentMedia as any).isPost) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              className="flex flex-col items-center gap-1 transition-transform active:scale-90"
            >
              <Heart
                className={`w-8 h-8 transition-all drop-shadow-lg ${
                  isLiked ? 'fill-[#FF3CAC] text-[#FF3CAC]' : 'text-white'
                }`}
              />
              <span className="text-white text-xs font-bold drop-shadow-lg">{likes}</span>
            </button>
          )}

          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
          >
            <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
          </button>
        </div>

        {/* Bottom Info & Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-24 px-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Event Name & Counter */}
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-1 line-clamp-2 drop-shadow-lg">
              {type === 'photo' 
                ? (currentMedia as Photo).eventName 
                : ((currentMedia as VideoClip).eventName || 'Highlight')}
            </h3>
            <p className="text-white/70 text-xs drop-shadow-lg">
              {currentIndex + 1} / {media.length}
            </p>
          </div>

          {/* Video Controls - Bottom Progress Bar */}
          {type === 'video' && !((currentMedia as VideoClip).videoUrl.includes('youtube.com') || (currentMedia as VideoClip).videoUrl.includes('youtu.be')) && (
            <div className="space-y-2">
              {/* Interactive Progress Bar */}
              <div 
                ref={progressBarRef}
                className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
                onMouseDown={handleProgressMouseDown}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleProgressTouchStart}
              >
                <div 
                  className="absolute inset-y-0 left-0 bg-[#8A2BE2] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
                {/* Scrubber handle */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>

              {/* Time Display */}
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Control Hints */}
              <div className="flex items-center justify-center gap-6 text-white/50 text-xs mt-2">
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Tap left -10s
                </span>
                <span className="flex items-center gap-1">
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  Tap center
                </span>
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  Tap right +10s
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={type === 'photo' 
          ? `Photo from ${(currentMedia as Photo).eventName}` 
          : `Video from Event`}
        text="Check out this amazing moment on EVENTZ!"
        url={window.location.href}
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes feedback {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
        
        .animate-feedback {
          animation: feedback 0.5s ease-out;
        }
      `}} />
    </div>
  );
}