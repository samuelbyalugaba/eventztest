import { useState } from 'react';
import type { Post, HighlightClip } from '../types';

export function useFeedModals() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  const [likeAnimation, setLikeAnimation] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });
  const [playingVideo, setPlayingVideo] = useState<{ postId: number; clipIndex: number; clips: HighlightClip[] } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[]; currentIndex: number; postId: number } | null>(null);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<number | null>(null);

  return {
    selectedPost,
    setSelectedPost,
    showNotifications,
    setShowNotifications,
    showComments,
    setShowComments,
    selectedPostForComments,
    setSelectedPostForComments,
    showShareModal,
    setShowShareModal,
    shareModalData,
    setShareModalData,
    likeAnimation,
    setLikeAnimation,
    playingVideo,
    setPlayingVideo,
    fullScreenImage,
    setFullScreenImage,
    pendingDeletePostId,
    setPendingDeletePostId,
  };
}
