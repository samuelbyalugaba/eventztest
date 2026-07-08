import { useState, useEffect } from 'react';
import { Post } from '../types';
import { toast } from 'sonner';
import { reportContent, blockUser } from '../utils/supabase/api';
import { confirmBlockUser } from '../utils/moderation';
import { useReportReason } from '../contexts/ReportReasonContext';

export function usePostInteractions(
  post: Post,
  currentUserId: string | null | undefined,
  onLike: (postId: number) => Promise<void>,
  onSave: (postId: number) => Promise<void>,
  onMessage: ((user: any) => void) | undefined,
  onUserBlocked: ((userId: string) => void) | undefined,
  triggerHaptic: () => void,
  postOwnerId: string,
  displayProfile: { name: string; [key: string]: any }
) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const { askReportReason } = useReportReason();

  const isOwnPost =
    !!currentUserId && !!postOwnerId && String(currentUserId) === String(postOwnerId);

  useEffect(() => {
    setIsSaved(post.isSaved);
  }, [post.isSaved]);

  const handleLike = async () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    if (newIsLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }

    try {
      await onLike(post.id);
    } catch {
      console.warn('Failed to toggle like for post', post.id);
      setIsLiked(!newIsLiked);
      setLikesCount((prev) => (!newIsLiked ? prev + 1 : prev - 1));
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
    } catch {
      console.warn('Failed to toggle save for post', post.id);
      setIsSaved(!isSaved);
    }
  };

  const handleReportUser = async () => {
    if (!postOwnerId) {
      toast.error('Could not find this profile');
      return;
    }

    const reason = await askReportReason(displayProfile.name);
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

  return {
    isLiked,
    likesCount,
    isSaved,
    showLikeAnimation,
    isOwnPost,
    handleLike,
    handleDoubleTap,
    handleSave,
    handleReportUser,
    handleBlockUser,
    handleMessageUser,
  };
}
