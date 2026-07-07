import { useState, useEffect } from 'react';
import { ShareModal } from './ShareModal';
import { handleShare as shareUtil } from '../utils/share';
import { toast } from 'sonner';
import { supabase, toggleLikePost, incrementPostView, incrementUserMediaView, deletePost } from '../utils/supabase/api';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { PhotoViewer } from './media-viewer/PhotoViewer';
import { VideoPlayer } from './media-viewer/VideoPlayer';
import { TopControls } from './media-viewer/TopControls';
import { ActionButtons } from './media-viewer/ActionButtons';
import { BottomInfoBar } from './media-viewer/BottomInfoBar';
import type { Photo, VideoClip } from './media-viewer/types';

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
  const [showShareModal, setShowShareModal] = useState(false);

  const currentMedia = media[currentIndex];
  const isPost = !!(currentMedia as any).isPost;
  const isYoutubeVideo = type === 'video' && (
    (media[currentIndex] as VideoClip).videoUrl.includes('youtube.com') ||
    (media[currentIndex] as VideoClip).videoUrl.includes('youtu.be')
  );

  const {
    videoRef,
    progressBarRef,
    isPlaying,
    isMuted,
    progress,
    currentTime,
    duration,
    showFeedback,
    isBuffering,
    setIsBuffering,
    setIsPlaying,
    togglePlayPause,
    toggleMute,
    rewind,
    forward,
    handleVideoTap,
    handleProgressMouseDown,
    handleProgressTouchStart,
    formatTime,
  } = useVideoPlayer(currentIndex, type);

  useEffect(() => {
    if (type === 'photo') {
      setLikes((currentMedia as Photo).likes || 0);
    } else {
      setLikes((currentMedia as VideoClip).likes || 0);
    }
    setIsLiked((currentMedia as any).isLiked || false);
  }, [currentIndex, currentMedia, type]);

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
  }, [currentIndex, media.length, onClose, type, rewind, forward, togglePlayPause]);

  const toggleLike = async () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikes(likes + 1);
      toast.success('Liked', { duration: 1500 });
    } else {
      setIsLiked(false);
      setLikes(likes - 1);
    }

    if (currentMedia.isPost && currentMedia.postId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await toggleLikePost(currentMedia.postId, user.id);
        } catch (error) {
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

  const handleDelete = async () => {
    if (!(currentMedia as any).isPost || !(currentMedia as any).postId) return;
    const confirmed = window.confirm('Delete this post?');
    if (!confirmed) return;
    try {
      await deletePost((currentMedia as any).postId);
      toast.success('Post deleted');
      onClose();
    } catch (error) {
      toast.error('Failed to delete post');
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

  return (
    <div className="fixed inset-0 bg-black z-[100]">
      <div className="relative h-full w-full flex items-center justify-center">
        <div className="w-full h-full relative">
          {type === 'photo' ? (
            <PhotoViewer media={currentMedia as Photo} />
          ) : (
            <VideoPlayer
              videoRef={videoRef}
              media={currentMedia as VideoClip}
              isMuted={isMuted}
              isPlaying={isPlaying}
              isBuffering={isBuffering}
              showFeedback={showFeedback}
              onBufferingChange={setIsBuffering}
              onPlayingChange={setIsPlaying}
              onVideoTap={handleVideoTap}
            />
          )}
        </div>

        <TopControls
          onClose={onClose}
          type={type}
          isMuted={isMuted}
          isYoutubeVideo={isYoutubeVideo}
          isPost={isPost}
          onToggleMute={toggleMute}
          onDelete={handleDelete}
        />

        <ActionButtons
          isPost={isPost}
          isLiked={isLiked}
          likes={likes}
          onLike={toggleLike}
          onShare={handleShare}
        />

        <BottomInfoBar
          type={type}
          media={currentMedia}
          currentIndex={currentIndex}
          total={media.length}
          isPlaying={isPlaying}
          isYoutubeVideo={isYoutubeVideo}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          progressBarRef={progressBarRef}
          onProgressMouseDown={handleProgressMouseDown}
          onProgressTouchStart={handleProgressTouchStart}
          formatTime={formatTime}
        />
      </div>

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
