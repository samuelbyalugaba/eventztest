import type { Post } from '../../types';
import { FeedContent } from './FeedContent';

interface FeedScrollerProps {
  feedScrollRef: React.RefObject<HTMLDivElement | null>;
  setFeedScrollContainer: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>;
  feedHeaderHeight: number;
  isRestoringScroll: boolean;
  isLoading: boolean;
  filteredPosts: Post[];
  hasMore: boolean;
  isLoadingMore: boolean;
  isPaused?: boolean;
  currentUserId?: string | null;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onLike: (id: number) => Promise<void>;
  onSave: (id: number) => Promise<void>;
  onShare: (post: Post) => Promise<void>;
  onMessage: (user: any) => void;
  onUserBlocked: (userId: string) => void;
  onDelete: (postId: number) => Promise<void>;
  onEditCaption: (postId: number, caption: string) => Promise<void>;
  onViewPost: (post: Post, startTime?: number, isMuted?: boolean) => void;
  onViewComments: (post: Post) => void;
}

export function FeedScroller({
  feedScrollRef,
  setFeedScrollContainer,
  feedHeaderHeight,
  isRestoringScroll,
  isLoading,
  filteredPosts,
  hasMore,
  isLoadingMore,
  isPaused,
  currentUserId,
  onProfileClick,
  onLike,
  onSave,
  onShare,
  onMessage,
  onUserBlocked,
  onDelete,
  onEditCaption,
  onViewPost,
  onViewComments,
}: FeedScrollerProps) {
  return (
    <div
      ref={(el) => {
        (feedScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        setFeedScrollContainer(el);
      }}
      className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain touch-pan-y"
      style={{
        paddingTop: feedHeaderHeight > 0 ? `${feedHeaderHeight}px` : '7rem',
        WebkitOverflowScrolling: 'touch',
        visibility: isRestoringScroll ? 'hidden' : 'visible',
        pointerEvents: isRestoringScroll ? 'none' : 'auto',
      }}
    >
      <div id="top-sentinel" className="w-full h-px pointer-events-none" />
      <div className="max-w-2xl xl:max-w-[640px] mx-auto px-3 pt-3 pb-[calc(6.5rem+var(--eventz-safe-area-bottom))] space-y-0">
        <FeedContent
          isLoading={isLoading}
          filteredPosts={filteredPosts}
          isRestoringScroll={isRestoringScroll}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          isPaused={isPaused}
          currentUserId={currentUserId}
          onProfileClick={onProfileClick}
          onLike={onLike}
          onSave={onSave}
          onShare={onShare}
          onMessage={onMessage}
          onUserBlocked={onUserBlocked}
          onDelete={onDelete}
          onEditCaption={onEditCaption}
          onViewPost={onViewPost}
          onViewComments={onViewComments}
        />
      </div>
    </div>
  );
}
