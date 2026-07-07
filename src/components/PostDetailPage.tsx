import { useState, useRef, useEffect, useCallback } from 'react';
import { useFullscreen } from '../hooks/useFullscreen';
import { PostDetailView } from './PostDetailView';
import type { Post } from '../types';

interface PostDetailPageProps {
  post: Post;
  currentUser: any;
  userProfile?: any;
  onBack: () => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void;
  onShare: (post: Post, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  onProfileClick: (user: Post['user'], e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
  startTime?: number;
  initialMuted?: boolean;
}

export function PostDetailPage({
  post,
  currentUser,
  userProfile,
  onBack,
  onLike,
  onSave,
  onShare,
  onDelete,
  onEditCaption,
  onProfileClick,
  onComment,
  onLikeComment,
  startTime = 0,
  initialMuted = false,
}: PostDetailPageProps) {
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enterFullscreen = useFullscreen();

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleMetadata = () => {
        if (startTime > 0) video.currentTime = startTime;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsVideoPaused(false);
            window.dispatchEvent(new CustomEvent('video-play', { detail: { id: post.id } }));
          }).catch(() => setIsVideoPaused(true));
        }
      };
      if (video.readyState >= 1) {
        handleMetadata();
      } else {
        video.addEventListener('loadedmetadata', handleMetadata, { once: true });
      }
      return () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
      };
    }
  }, [post.id, startTime]);

  const handleVideoPlaybackToggle = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsVideoPaused(false)).catch(() => setIsVideoPaused(true));
    } else {
      video.pause();
      setIsVideoPaused(true);
    }
  }, []);

  const requestVideoFullscreen = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video) return;
    if (await enterFullscreen(video)) video.controls = true;
  }, [enterFullscreen]);

  return (
    <PostDetailView
      post={post}
      currentUser={currentUser}
      userProfile={userProfile}
      onBack={onBack}
      onLike={onLike}
      onSave={onSave}
      onShare={onShare}
      onDelete={onDelete}
      onEditCaption={onEditCaption}
      onProfileClick={onProfileClick}
      onComment={onComment}
      onLikeComment={onLikeComment}
      startTime={startTime}
      initialMuted={initialMuted}
      videoProps={{
        videoRef,
        isVideoPaused,
        onPlaybackToggle: handleVideoPlaybackToggle,
        onFullscreen: requestVideoFullscreen,
      }}
    />
  );
}
