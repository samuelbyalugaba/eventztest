import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Post, HighlightClip } from '../types';
import { handleShare } from '../utils/share';
import { deletePost } from '../utils/supabase/api';
import { removePostFromFeedCache } from '../hooks/useFeedData';

export function useFeedModals(
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>,
  refreshNotifications?: (opts?: { silent?: boolean }) => void,
) {
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

  const sharePost = useCallback(async (post: Post, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shared = await handleShare({ title: `Check out this post from ${post.user.name}`, text: post.content.text || 'Check out this amazing post on EVENTZ!', url: postUrl });
    if (!shared) {
      setShareModalData({ title: `Post from ${post.user.name}`, text: post.content.text || 'Check out this amazing post on EVENTZ!', url: postUrl });
      setShowShareModal(true);
    }
  }, []);

  const deletePostById = useCallback(async (postId: number) => {
    let previousPosts: Post[] = [];
    setPosts(prev => { previousPosts = prev; return prev.filter(p => p.id !== postId); });
    setSelectedPost(prev => (prev && prev.id === postId) ? null : prev);
    try {
      await deletePost(postId);
      removePostFromFeedCache(postId);
      window.dispatchEvent(new CustomEvent('postsUpdated', { detail: { deletedPostId: postId } }));
      toast.success('Post deleted');
    }
    catch (error) { console.error('Error deleting post:', error); toast.error('Failed to delete post'); setPosts(previousPosts); }
  }, [setPosts]);

  const handleDeletePost = useCallback(async (postId: number) => {
    setPendingDeletePostId(postId);
  }, []);

  const handleConfirmDeletePost = useCallback(async () => {
    if (!pendingDeletePostId) return;
    const postId = pendingDeletePostId;
    setPendingDeletePostId(null);
    await deletePostById(postId);
  }, [deletePostById, pendingDeletePostId]);

  const handleClosePostModal = useCallback(() => setSelectedPost(null), []);
  const handleClosePlayingVideo = useCallback(() => setPlayingVideo(null), []);
  const handleCloseFullScreenImage = useCallback(() => setFullScreenImage(null), []);
  const handleCloseNotifications = useCallback(() => setShowNotifications(false), []);
  const handleRefreshNotifications = useCallback(() => {
    if (refreshNotifications) refreshNotifications({ silent: true });
  }, [refreshNotifications]);
  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setShareModalData(null);
  }, []);
  const handleCloseComments = useCallback(() => {
    setShowComments(false);
    setSelectedPostForComments(null);
  }, []);

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
    sharePost,
    deletePostById,
    handleDeletePost,
    handleConfirmDeletePost,
    handleClosePostModal,
    handleClosePlayingVideo,
    handleCloseFullScreenImage,
    handleCloseNotifications,
    handleRefreshNotifications,
    handleCloseShareModal,
    handleCloseComments,
  };
}
