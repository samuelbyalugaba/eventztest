import React, { useState } from 'react';
import { Post } from '../types';
import { toast } from 'sonner';
import { usePostMedia } from '../hooks/usePostMedia';
import { usePostVideo } from '../hooks/usePostVideo';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { usePostCarousel } from '../hooks/usePostCarousel';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useHaptic } from '../hooks/useHaptic';
import { EditCaptionModal } from './EditCaptionModal';
import { PostCardHeader } from './post-card/PostCardHeader';
import { PostCardMedia } from './post-card/PostCardMedia';
import { PostCardActions } from './post-card/PostCardActions';

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

const mediaControlButtonClass =
  'inline-flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-full bg-black/50 p-0 text-white leading-none backdrop-blur-md transition-colors hover:bg-black/70';

const mediaControlIconClass = 'block h-3.5 w-3.5 text-white';

export const PostCard = React.memo(function PostCard({
  post, onLike, onSave, onShare, onProfileClick, currentUserId,
  onMessage, onUserBlocked, onDelete, onEditCaption,
  onViewPost, onViewComments, isPaused = false,
}: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditCaptionOpen, setIsEditCaptionOpen] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const { isLowInternet } = useNetworkStatus();
  const triggerHaptic = useHaptic();
  const { setApi, carouselIndex, carouselHeight, updateCarouselHeight } = usePostCarousel();

  const { setMediaAspectRatios, mediaItems, hasMedia, isCarousel, currentMedia,
    isCurrentMediaVideo, videoPoster, currentVideoSrc, getMediaFrameStyle,
    displayProfile, postOwnerId } = usePostMedia(post, carouselIndex, updateCarouselHeight);

  const { videoRef, isMuted, setIsPlaying, requestVideoFullscreen,
    toggleVideoMute, isVideoLoading, videoError, setVideoError, markVideoReady }
    = usePostVideo(post.id, isLowInternet, isPaused, carouselIndex, isCurrentMediaVideo, currentVideoSrc);

  const { isLiked, likesCount, isSaved, showLikeAnimation, isOwnPost,
    handleLike, handleDoubleTap, handleSave, handleReportUser,
    handleBlockUser, handleMessageUser }
    = usePostInteractions(post, currentUserId, onLike, onSave, onMessage, onUserBlocked, triggerHaptic, postOwnerId, displayProfile);

  const handleEditOwnPost = async () => {
    if (!onEditCaption) { toast.error('Editing is unavailable'); return; }
    setIsEditCaptionOpen(true);
  };

  const handleSaveCaption = async (nextCaption: string) => {
    if (!onEditCaption || nextCaption === post.content.text) { setIsEditCaptionOpen(false); return; }
    try {
      setIsSavingCaption(true);
      await onEditCaption(post.id, nextCaption);
      setIsEditCaptionOpen(false);
      toast.success('Post updated');
    } catch (error) {
      console.error('Failed to update post caption:', error);
      toast.error('Failed to update post');
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleDeleteOwnPost = async () => {
    if (!onDelete) { toast.error('Deleting is unavailable'); return; }
    await onDelete(post.id);
  };

  const commentsCount = post.comments_count || 0;

  return (
    <>
      <article className="feed-post-card overflow-hidden">
        <PostCardHeader
          displayProfile={displayProfile} postUser={post.user} timestamp={post.timestamp}
          isOwnPost={isOwnPost} onProfileClick={onProfileClick}
          onEditCaption={handleEditOwnPost} onDeletePost={handleDeleteOwnPost}
          onMessage={handleMessageUser} onReport={handleReportUser} onBlock={handleBlockUser}
        />
        <PostCardMedia
          postId={post.id}
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          {...{ hasMedia, isCarousel, carouselIndex, carouselHeight, setApi,
            mediaItems, currentMedia, isCurrentMediaVideo, videoPoster, currentVideoSrc,
            getMediaFrameStyle, isMuted, setIsPlaying, toggleVideoMute,
            requestVideoFullscreen, isVideoLoading, videoError, setVideoError,
            isLowInternet, showLikeAnimation, handleDoubleTap, markVideoReady,
            updateCarouselHeight, setMediaAspectRatios, onViewPost,
            mediaControlButtonClass, mediaControlIconClass }}
        />
        {(post.content.text || (post.content.hashtags?.length ?? 0) > 0) && (
          <div className="feed-post-caption">
            {post.content.text && (
              <>
                <p className={`transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{post.content.text}</p>
                {(post.content.text.length > 100 || post.content.text.split('\n').length > 3) && (
                  <button onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-500 text-xs mt-1 hover:text-gray-700 font-medium">
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
            {(post.content.hashtags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(post.content.hashtags ?? []).slice(0, 4).map((tag) => (
                  <span key={tag} className="feed-post-hashtag">{tag.startsWith('#') ? tag : `#${tag}`}</span>
                ))}
              </div>
            )}
          </div>
        )}
        <PostCardActions
          {...{ isLiked, likesCount, commentsCount, isSaved, handleLike, handleSave, onShare, post, onViewComments }}
        />
      </article>
      <EditCaptionModal
        isOpen={isEditCaptionOpen} initialCaption={post.content.text || ''}
        isSaving={isSavingCaption} onClose={() => setIsEditCaptionOpen(false)}
        onSave={(caption) => void handleSaveCaption(caption)}
      />
    </>
  );
});
