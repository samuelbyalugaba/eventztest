import { X, Heart, Share2, Volume2, VolumeX, Play, Trash } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useRef, useEffect } from 'react';
import { ShareModal } from './ShareModal';
import { handleShare } from '../utils/share';
import { toast } from 'sonner';
import { incrementPostView, deletePost, supabase } from '../utils/supabase/api';

interface HighlightViewerModalProps {
  highlight: {
    id: number;
    type: string;
    mediaType: 'image' | 'video';
    title: string;
    description: string;
    image: string;
    video?: string;
    likes: number;
    comments: number;
    shares: number;
    timestamp: string;
    isLiked: boolean;
  };
  onClose: () => void;
  onLike: (id: number) => void;
  onShare: (highlight: any) => void;
}

export function HighlightViewerModal({ highlight, onClose, onLike, onShare }: HighlightViewerModalProps) {
  const [isLiked, setIsLiked] = useState(highlight.isLiked);
  const [likes, setLikes] = useState(highlight.likes);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update progress bar for videos
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const percentage = (video.currentTime / video.duration) * 100;
      setProgress(percentage);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  // Increment view count for videos
  useEffect(() => {
    if (highlight.mediaType === 'video' && highlight.type === 'post') {
      incrementPostView(highlight.id);
    }
  }, [highlight.id, highlight.mediaType, highlight.type]);

  // Auto-play video on mount for mobile support
  useEffect(() => {
    if (highlight.mediaType === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsBuffering(false);
          })
          .catch(_err => {
            setIsPlaying(false);
          });
      }
    }
  }, [highlight]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
    onLike(highlight.id);
    
    if (!isLiked) {
      toast.success('Added to favorites! ❤️', { duration: 2000 });
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
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

  const handleDelete = async () => {
    if (highlight.type !== 'post') return;
    const confirmed = window.confirm('Delete this post?');
    if (!confirmed) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authorized to delete this post');
        return;
      }
      await deletePost(highlight.id);
      toast.success('Post deleted');
      window.dispatchEvent(new Event('postsUpdated'));
      onClose();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleShareClick = async () => {
    const shared = await handleShare({
      title: highlight.title,
      text: 'Check out this amazing highlight on EVENTZ!',
      url: window.location.href,
    });
    
    if (!shared) {
      setShowShareModal(true);
    } else {
      onShare(highlight);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100]">
      {/* Main Content - Full Screen */}
      <div className="relative h-full w-full flex items-center justify-center">
        {/* Media Content - Tap to play/pause */}
        <div 
          className="w-full h-full relative"
          onClick={() => highlight.mediaType === 'video' && togglePlayPause()}
        >
          {highlight.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={highlight.video}
              onClick={togglePlayPause}
              autoPlay
              controls
              muted={isMuted}
              playsInline
              preload="auto"
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onCanPlay={() => setIsBuffering(false)}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageWithFallback
              src={highlight.image}
              alt={highlight.title}
              className="w-full h-full object-contain"
            />
          )}

          {/* Buffering Indicator */}
          {isBuffering && highlight.mediaType === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}

          {/* Mobile Play Button (when autoplay blocked) */}
          {!isPlaying && highlight.mediaType === 'video' && !isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-6 shadow-2xl">
                <Play className="w-16 h-16 text-gray-900 fill-gray-900 ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar - Top (Instagram Stories style) */}
        {highlight.mediaType === 'video' && (
          <div className="absolute top-2 left-4 right-4 z-30">
            <div className="h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Close Button - Top Left ONLY */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {highlight.mediaType === 'video' && (
            <button
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          )}
          {highlight.type === 'post' && (
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-red-600/70 flex items-center justify-center transition-colors"
              title="Delete"
            >
              <Trash className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Right Side Actions - TikTok Style */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-30">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
          >
            <Heart
              className={`w-8 h-8 transition-all drop-shadow-lg ${
                isLiked ? 'fill-[#FF3CAC] text-[#FF3CAC]' : 'text-white'
              }`}
            />
            <span className="text-white text-xs font-bold drop-shadow-lg">{likes}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShareClick}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
          >
            <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
            <span className="text-white text-xs font-bold drop-shadow-lg">{highlight.shares}</span>
          </button>
        </div>

        {/* Bottom Info - Left Side */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-24 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <h3 className="text-white font-semibold mb-1 line-clamp-2 drop-shadow-lg">
            {highlight.title}
          </h3>
          <p className="text-white/90 text-sm line-clamp-2 mb-2 drop-shadow-lg">
            {highlight.description}
          </p>
          <p className="text-white/70 text-xs drop-shadow-lg">{highlight.timestamp}</p>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={highlight.title}
        text="Check out this amazing highlight on EVENTZ!"
        url={window.location.href}
      />
    </div>
  );
}
