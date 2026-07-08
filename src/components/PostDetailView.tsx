import { type ReactNode } from 'react';
import { PostDetailHeader } from './post-detail/PostDetailHeader';
import { PostDetailCaptionEditor } from './post-detail/PostDetailCaptionEditor';
import { PostDetailContent } from './post-detail/PostDetailContent';
import { PostDetailUserSection } from './post-detail/PostDetailUserSection';
import { PostDetailComments } from './post-detail/PostDetailComments';
import { PostDetailCommentInput } from './post-detail/PostDetailCommentInput';
import { usePostDetail } from '../hooks/usePostDetail';

interface PostDetailViewProps {
  post: any;
  currentUser: any;
  userProfile?: any;
  onBack: () => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void;
  onShare: (post: any, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
  renderHeader?: (props: { onShare: (e: React.MouseEvent) => void; onSave: (e: React.MouseEvent) => void; isOwner: boolean; onEditCaptionOpen: () => void; onDeletePost: () => void; onReport: () => void }) => ReactNode;
  renderUserBadge?: () => ReactNode;
  renderCommentInput?: (props: { commentText: string; onCommentTextChange: (text: string) => void; replyingTo: { id: number; name: string } | null; onCancelReply: () => void; onPostComment: () => void }) => ReactNode;
  videoProps?: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isVideoPaused: boolean;
    onPlaybackToggle: (e?: React.MouseEvent) => void;
    onFullscreen: (video: HTMLVideoElement | null) => void;
  };
  startTime?: number;
  initialMuted?: boolean;
  offsetTop?: number;
  offsetBottom?: number;
}

export function PostDetailView({
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
  renderHeader,
  renderUserBadge,
  renderCommentInput,
  videoProps,
  startTime: _startTime = 0,
  initialMuted = false,
  offsetTop = 0,
  offsetBottom = 0,
}: PostDetailViewProps) {
  const {
    commentText, setCommentText,
    replyingTo, setReplyingTo,
    textareaRef,
    setApi, current,
    isMuted, setIsMuted,
    mediaAspectRatios, setMediaAspectRatios,
    carouselHeight,
    isEditingCaption, setIsEditingCaption,
    captionDraft, setCaptionDraft,
    isSavingCaption, setIsSavingCaption,
    localVideoRef, instanceId, enterFullscreen,
    updateCarouselHeight,
    handlePostComment, handleReply,
    handleReportPost, handleReportComment,
    handleCommentProfileClick,
    isOwner, currentCaption,
  } = usePostDetail({
    post,
    currentUser,
    onBack,
    onComment,
    onProfileClick,
    initialMuted,
  });

  return (
    <div
      className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-in slide-in-from-right duration-300"
      style={{
        paddingTop: `calc(4rem + ${offsetTop}px + var(--eventz-safe-area-top))`,
        paddingBottom: `calc(6rem + ${offsetBottom}px + var(--eventz-safe-area-bottom))`,
      }}
    >
      {renderHeader ? renderHeader({
        onShare: (e) => onShare(post, e),
        onSave: (e) => onSave(post.id, e),
        isOwner,
        onEditCaptionOpen: () => { setCaptionDraft(currentCaption || ''); setIsEditingCaption(true); },
        onDeletePost: () => { onDelete(post.id); onBack(); },
        onReport: handleReportPost,
      }) : (
        <PostDetailHeader
          onBack={onBack}
          onShare={(e) => onShare(post, e)}
          onSave={(e) => onSave(post.id, e)}
          onEditCaptionOpen={() => { setCaptionDraft(currentCaption || ''); setIsEditingCaption(true); }}
          onDeletePost={() => { onDelete(post.id); onBack(); }}
          onReport={handleReportPost}
          isOwner={isOwner}
          post={post}
          offsetTop={offsetTop}
        />
      )}

      <PostDetailCaptionEditor
        isEditingCaption={isEditingCaption}
        captionDraft={captionDraft}
        setCaptionDraft={setCaptionDraft}
        isSavingCaption={isSavingCaption}
        setIsSavingCaption={setIsSavingCaption}
        onEditCaption={onEditCaption}
        post={post}
        onClose={() => setIsEditingCaption(false)}
      />

      <div className="max-w-2xl mx-auto">
        <div className="relative bg-black rounded-b-3xl overflow-hidden">
          {renderUserBadge?.()}
          <PostDetailContent
            post={post}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            mediaAspectRatios={mediaAspectRatios}
            setMediaAspectRatios={setMediaAspectRatios}
            updateCarouselHeight={updateCarouselHeight}
            carouselHeight={carouselHeight}
            setApi={setApi}
            current={current}
            videoProps={videoProps}
            localVideoRef={localVideoRef}
            instanceId={instanceId}
            enterFullscreen={enterFullscreen}
          />
        </div>

        <PostDetailUserSection
          post={post}
          onProfileClick={onProfileClick}
          onLike={onLike}
          textareaRef={textareaRef}
        />

        <PostDetailComments
          post={post}
          currentUser={currentUser}
          onLikeComment={onLikeComment}
          handleCommentProfileClick={handleCommentProfileClick}
          handleReply={handleReply}
          handleReportComment={handleReportComment}
        />
      </div>

      <PostDetailCommentInput
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        commentText={commentText}
        setCommentText={setCommentText}
        handlePostComment={handlePostComment}
        userProfile={userProfile}
        currentUser={currentUser}
        textareaRef={textareaRef}
        renderCommentInput={renderCommentInput}
        offsetBottom={offsetBottom}
      />
    </div>
  );
}
