import { Post } from '../../types';
import { Heart, Share2, Bookmark } from 'lucide-react';
import { CommentIcon } from '../icons/CommentIcon';

interface PostCardActionsProps {
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  isSaved: boolean;
  handleLike: () => void;
  handleSave: () => void;
  onShare: (post: Post) => Promise<void>;
  post: Post;
  onViewComments?: () => void;
}

export function PostCardActions({
  isLiked,
  likesCount,
  commentsCount,
  isSaved,
  handleLike,
  handleSave,
  onShare,
  post,
  onViewComments,
}: PostCardActionsProps) {
  return (
    <div className="feed-post-actions">
      <button
        onClick={handleLike}
        className={`feed-action-btn feed-like-btn ${isLiked ? 'feed-action-liked' : ''}`}
      >
        <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
        <span>{likesCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewComments?.();
        }}
        className="feed-action-btn"
      >
        <CommentIcon
          className="h-[1.05rem] w-[1.05rem] overflow-visible"
          color="currentColor"
        />
        <span>{commentsCount}</span>
      </button>

      <div className="feed-action-spacer" />

      <button
        onClick={() => onShare(post)}
        className="feed-action-icon-btn"
        aria-label="Share post"
      >
        <Share2 className="h-4 w-4" />
      </button>

      <button
        onClick={handleSave}
        className={`feed-save-pill ${isSaved ? 'feed-save-saved' : ''}`}
        aria-label={isSaved ? 'Unsave post' : 'Save post'}
      >
        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
