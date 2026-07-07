import type { Post, HighlightClip } from '../../types';
import type { Notification } from '../../utils/supabase/api';
import { PostDetailModal } from '../PostDetailModal';
import { NotificationsPanel } from './NotificationsPanel';
import { LikeAnimation } from './FeedAnimations';
import { VideoPlayerOverlay } from './VideoPlayerOverlay';
import { FullScreenImageModal } from './FullScreenImageModal';
import { ShareModal } from '../ShareModal';
import { CommentsSheet } from '../CommentsSheet';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface FeedModalsProps {
  selectedPost: Post | null;
  onClosePostModal: () => void;
  currentUser: any;
  currentUserProfile?: any;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void | Promise<void>;
  onShare: (post: Post, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  onProfileClick: (user: Post['user'], e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
  showNotifications: boolean;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  notificationsLoading: boolean;
  onCloseNotifications: () => void;
  onRefreshNotifications: () => void;
  likeAnimation: { show: boolean; x: number; y: number };
  playingVideo: { postId: number; clipIndex: number; clips: HighlightClip[] } | null;
  onClosePlayingVideo: () => void;
  fullScreenImage: { images: string[]; currentIndex: number; postId: number } | null;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onCloseFullScreenImage: () => void;
  showShareModal: boolean;
  shareModalData: { title: string; text: string; url?: string } | null;
  onCloseShareModal: () => void;
  showComments: boolean;
  selectedPostForComments: Post | null;
  onCloseComments: () => void;
  onOpenUserProfile: (user: any, e?: React.MouseEvent) => void;
  pendingDeletePostId: number | null;
  setPendingDeletePostId: React.Dispatch<React.SetStateAction<number | null>>;
  onConfirmDeletePost: () => void;
}

export function FeedModals({
  selectedPost,
  onClosePostModal,
  currentUser,
  currentUserProfile,
  onLike,
  onSave,
  onShare,
  onDelete,
  onEditCaption,
  onProfileClick,
  onComment,
  onLikeComment,
  showNotifications,
  notifications,
  setNotifications,
  notificationsLoading,
  onCloseNotifications,
  onRefreshNotifications,
  likeAnimation,
  playingVideo,
  onClosePlayingVideo,
  fullScreenImage,
  posts,
  setPosts,
  onCloseFullScreenImage,
  showShareModal,
  shareModalData,
  onCloseShareModal,
  showComments,
  selectedPostForComments,
  onCloseComments,
  onOpenUserProfile,
  pendingDeletePostId,
  setPendingDeletePostId,
  onConfirmDeletePost,
}: FeedModalsProps) {
  return (
    <>
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          currentUserProfile={currentUserProfile}
          onClose={onClosePostModal}
          onLike={onLike}
          onSave={onSave}
          onShare={onShare}
          onDelete={onDelete}
          onEditCaption={onEditCaption}
          onProfileClick={onProfileClick}
          onComment={onComment}
          onLikeComment={onLikeComment}
        />
      )}

      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          setNotifications={setNotifications}
          notificationsLoading={notificationsLoading}
          currentUser={currentUser}
          currentUserProfile={currentUserProfile}
          onClose={onCloseNotifications}
          onRefreshNotifications={onRefreshNotifications}
        />
      )}

      <LikeAnimation show={likeAnimation.show} x={likeAnimation.x} y={likeAnimation.y} />

      {playingVideo && (
        <VideoPlayerOverlay
          playingVideo={playingVideo}
          onClose={onClosePlayingVideo}
        />
      )}

      {fullScreenImage && (
        <FullScreenImageModal
          images={fullScreenImage.images}
          currentIndex={fullScreenImage.currentIndex}
          postId={fullScreenImage.postId}
          posts={posts}
          setPosts={setPosts}
          onClose={onCloseFullScreenImage}
        />
      )}

      {shareModalData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={onCloseShareModal}
          title={shareModalData.title}
          text={shareModalData.text}
          url={shareModalData.url}
        />
      )}

      {showComments && selectedPostForComments && (
        <CommentsSheet
          isOpen={showComments}
          onClose={onCloseComments}
          post={selectedPostForComments}
          currentUser={currentUser}
          userProfile={currentUserProfile}
          onComment={onComment}
          onLikeComment={onLikeComment}
          onOpenUserProfile={onOpenUserProfile}
        />
      )}

      <ConfirmDialog
        open={pendingDeletePostId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePostId(null);
        }}
        title="Delete post?"
        description="This removes the post from Eventz. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirmDeletePost}
      />
    </>
  );
}
