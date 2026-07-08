import { useState, useRef, useEffect, useCallback } from 'react';
import { type CarouselApi } from '../components/ui/carousel';
import { useFullscreen } from './useFullscreen';
import { toast } from 'sonner';
import { reportContent } from '../utils/supabase/api';
import { askForReportReason } from '../utils/moderation';

export function usePostDetail({
  post,
  currentUser,
  onBack,
  onComment,
  onProfileClick,
  initialMuted = false,
}: {
  post: any;
  currentUser: any;
  onBack: () => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  initialMuted?: boolean;
}) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<Record<string, number>>({});
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const instanceId = useRef(`pv-${Math.random().toString(36).slice(2, 8)}`);
  const enterFullscreen = useFullscreen();

  const updateCarouselHeight = useCallback(() => {
    if (!api) return;
    const index = api.selectedScrollSnap();
    const slide = api.slideNodes()[index] as HTMLElement | undefined;
    const frame = slide?.querySelector('[data-media-frame="true"]') as HTMLElement | null;
    if (!frame) return;
    const next = Math.ceil(frame.getBoundingClientRect().height);
    if (next > 0) setCarouselHeight((prev) => (prev === next ? prev : next));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap() + 1);
      requestAnimationFrame(updateCarouselHeight);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, updateCarouselHeight]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        if (
          document.fullscreenElement === v ||
          (document as any).webkitFullscreenElement === v ||
          (document as any).msFullscreenElement === v
        ) {
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

  const handlePostComment = useCallback(() => {
    if (!commentText.trim()) return;
    const finalText = replyingTo ? `@${replyingTo.name} ${commentText}` : commentText;
    onComment(post.id, finalText, replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
  }, [commentText, replyingTo, onComment, post.id]);

  const handleReply = useCallback((comment: any) => {
    setReplyingTo({ id: comment.id, name: comment.user.name });
    textareaRef.current?.focus();
  }, []);

  const handleReportPost = useCallback(async () => {
    if (!currentUser) {
      toast.error('Please sign in to report content');
      return;
    }
    const reason = askForReportReason('this post');
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'post',
        contentId: post.id,
        reason,
        reportedUserId: post.user?.id || post.user_id,
      });
      toast.success('Report submitted');
      onBack();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  }, [currentUser, post.id, post.user?.id, post.user_id, onBack]);

  const handleReportComment = useCallback(async (comment: any) => {
    if (!currentUser) {
      toast.error('Please sign in to report content');
      return;
    }
    const reason = askForReportReason('this comment');
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'comment',
        contentId: comment.id,
        reason,
        details: comment.text,
        reportedUserId: comment.user?.id || comment.user_id,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  }, [currentUser]);

  const handleCommentProfileClick = useCallback((comment: any, e: React.MouseEvent) => {
    const user = comment.user;
    const userId = user?.id || comment.user_id;
    if (!userId || userId === 'unknown') return;

    onProfileClick({
      id: userId,
      name: user?.name || 'User',
      username: user?.username || '',
      avatar: user?.avatar || '',
      verified: !!user?.verified,
      isOrganizer: !!(user?.isOrganizer || user?.is_organizer),
    }, e);
  }, [onProfileClick]);

  const isOwner = currentUser && (
    String(currentUser.id) === String(post.user?.id) ||
    String(currentUser.id) === String(post.user_id)
  );

  const currentCaption = post?.content?.text ?? post?.content ?? '';

  return {
    commentText, setCommentText,
    replyingTo, setReplyingTo,
    textareaRef,
    api, setApi, current, setCurrent,
    isMuted, setIsMuted,
    mediaAspectRatios, setMediaAspectRatios,
    carouselHeight, setCarouselHeight,
    isEditingCaption, setIsEditingCaption,
    captionDraft, setCaptionDraft,
    isSavingCaption, setIsSavingCaption,
    localVideoRef, instanceId, enterFullscreen,
    updateCarouselHeight,
    handlePostComment, handleReply,
    handleReportPost, handleReportComment,
    handleCommentProfileClick,
    isOwner, currentCaption,
  };
}
