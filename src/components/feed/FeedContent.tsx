import { MessageCircle } from 'lucide-react';
import { PostCard } from '../PostCard';
import { PostSkeleton } from '../PostSkeleton';
import { Post } from '../../types';

interface FeedContentProps {
  isLoading: boolean;
  filteredPosts: Post[];
  isRestoringScroll: boolean;
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

export function FeedContent({
  isLoading,
  filteredPosts,
  isRestoringScroll,
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
}: FeedContentProps) {
  return (
    <>
      {isLoading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : (
        <>
          {filteredPosts.map((post, index) => {
            const shouldAnimate = !isRestoringScroll && index < 8;

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                style={{
                  animation: shouldAnimate ? `slideUp 0.28s ease-out ${index * 0.03}s both` : undefined,
                  opacity: isRestoringScroll ? 1 : undefined,
                }}
              >
                <PostCard
                  post={post}
                  currentUserId={currentUserId}
                  onLike={(id) => onLike(id)}
                  onSave={(id) => onSave(id)}
                  onShare={(p) => onShare(p)}
                  onProfileClick={(user) => onProfileClick(user)}
                  onMessage={(user) => onMessage(user)}
                  onUserBlocked={onUserBlocked}
                  onDelete={onDelete}
                  onEditCaption={onEditCaption}
                  onViewPost={(startTime, isMuted) => onViewPost(post, startTime, isMuted)}
                  onViewComments={() => onViewComments(post)}
                  isPaused={isPaused}
                />
              </div>
            );
          })}
        </>
      )}

      {hasMore && (
        <div id="feed-sentinel" className={isLoadingMore ? 'py-6' : 'h-8'} aria-hidden={!isLoadingMore}>
          {isLoadingMore && (
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {!isLoading && filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-gray-900 text-lg font-semibold mb-2">Nothing here yet</h3>
          <p className="text-gray-600 text-center text-sm max-w-xs">
            Follow creators and explore events to see updates
          </p>
        </div>
      )}
    </>
  );
}
