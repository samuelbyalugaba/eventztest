import { Share2, Bookmark, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useVisualViewport } from '../utils/useVisualViewport';
import { PostDetailView } from './PostDetailView';
import type { Post } from '../types';

interface PostDetailModalProps {
  post: Post;
  currentUser: any;
  currentUserProfile?: any;
  onClose: () => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void;
  onShare: (post: Post, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  onProfileClick: (user: Post['user'], e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
}

export function PostDetailModal({
  post,
  currentUser,
  currentUserProfile,
  onClose,
  onLike,
  onSave,
  onShare,
  onDelete,
  onEditCaption,
  onProfileClick,
  onComment,
  onLikeComment,
}: PostDetailModalProps) {
  const { offsetTop, offsetBottom } = useVisualViewport();

  return (
    <PostDetailView
      post={post}
      currentUser={currentUser}
      userProfile={currentUserProfile}
      onBack={onClose}
      onLike={onLike}
      onSave={onSave}
      onShare={onShare}
      onDelete={onDelete}
      onEditCaption={onEditCaption}
      onProfileClick={onProfileClick}
      onComment={onComment}
      onLikeComment={onLikeComment}
      offsetTop={offsetTop}
      offsetBottom={offsetBottom}
      renderUserBadge={() => (
        <button
          className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/35 backdrop-blur-sm rounded-full pr-3 py-1.5"
          onClick={(e) => onProfileClick(post.user, e)}
        >
          <UserAvatar
            src={post.user.avatar}
            name={post.user.name}
            size="sm"
            verified={post.user.verified}
            className="ring-2 ring-white/20"
          />
          <span className="text-white text-sm font-semibold max-w-[160px] truncate">{post.user.name}</span>
        </button>
      )}
      renderHeader={({ onShare: handleShare, onSave: handleSave, isOwner: isOwnerInner, onEditCaptionOpen, onDeletePost, onReport }) => (
        <div
          className="fixed left-0 right-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-100"
          style={{ top: offsetTop, paddingTop: 'var(--eventz-safe-area-top)' }}
        >
          <div className="px-4 h-16 flex items-center">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={onClose}
                className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition-colors hover:bg-gray-100"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 p-0 text-gray-700 transition-all hover:bg-cyan-100 hover:text-cyan-600"
                  aria-label="Share post"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {isOwnerInner && (
                  <button
                    onClick={onDeletePost}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 p-0 text-gray-700 transition-all hover:bg-red-100 hover:text-red-600"
                    aria-label="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl p-0 transition-all ${post.isSaved ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-600'}`}
                  aria-label={post.isSaved ? 'Unsave post' : 'Save post'}
                >
                  <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-white' : ''}`} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 p-0 text-gray-700 transition-all hover:bg-gray-200" aria-label="More post actions">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[100] bg-white min-w-[150px] shadow-lg rounded-xl p-1 border border-gray-100">
                    {isOwnerInner ? (
                      <>
                        <DropdownMenuItem onClick={onEditCaptionOpen} className="cursor-pointer">Edit caption</DropdownMenuItem>
                        <DropdownMenuItem onClick={onDeletePost} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer md:hidden">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Post
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={onReport} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        Report Post
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      )}
      renderCommentInput={({ commentText, onCommentTextChange, replyingTo: _replyingTo, onCancelReply: _onCancelReply, onPostComment }) => (
        <div className="flex items-end gap-3 bg-gray-50 rounded-3xl px-4 py-2">
          <UserAvatar
            src={currentUserProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
            name={currentUserProfile?.full_name || currentUser?.user_metadata?.full_name || currentUserProfile?.username || "User"}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5"
          />
          <textarea
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            placeholder="Add a comment..."
            rows={1}
            className="flex-1 bg-transparent border-none p-0 text-sm text-gray-900 placeholder-gray-400 resize-none min-h-[20px] max-h-[80px] py-1.5"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
            }}
          />
          <button
            onClick={onPostComment}
            disabled={!commentText.trim()}
            aria-label="Post comment"
            className={`p-1.5 rounded-full transition-all mb-0.5 ${commentText.trim() ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    />
  );
}
