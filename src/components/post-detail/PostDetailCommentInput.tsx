import { type ReactNode } from 'react';
import { X, Send } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';

interface PostDetailCommentInputProps {
  replyingTo: { id: number; name: string } | null;
  setReplyingTo: (value: { id: number; name: string } | null) => void;
  commentText: string;
  setCommentText: (value: string) => void;
  handlePostComment: () => void;
  userProfile?: any;
  currentUser: any;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  renderCommentInput?: (props: {
    commentText: string;
    onCommentTextChange: (text: string) => void;
    replyingTo: { id: number; name: string } | null;
    onCancelReply: () => void;
    onPostComment: () => void;
  }) => ReactNode;
  offsetBottom: number;
}

export function PostDetailCommentInput({
  replyingTo,
  setReplyingTo,
  commentText,
  setCommentText,
  handlePostComment,
  userProfile,
  currentUser,
  textareaRef,
  renderCommentInput,
  offsetBottom,
}: PostDetailCommentInputProps) {
  return (
    <div
      className="fixed left-0 right-0 z-20 border-t border-gray-100 bg-white"
      style={{ bottom: offsetBottom }}
    >
      <div className="max-w-2xl mx-auto p-3">
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-gray-50 rounded-lg text-xs">
            <span className="text-gray-500">Replying to <span className="font-semibold text-gray-900">{replyingTo.name}</span></span>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        )}
        {renderCommentInput ? renderCommentInput({
          commentText,
          onCommentTextChange: setCommentText,
          replyingTo,
          onCancelReply: () => setReplyingTo(null),
          onPostComment: handlePostComment,
        }) : (
          <div className="flex items-end gap-2.5 rounded-[1.45rem] border border-gray-200 bg-gray-50 px-3 py-2.5 transition-all focus-within:border-gray-300 focus-within:bg-white">
            <UserAvatar
              src={userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
              name={userProfile?.full_name || currentUser?.user_metadata?.full_name || userProfile?.username || "User"}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
            <textarea
              ref={textareaRef as React.Ref<HTMLTextAreaElement>}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
              className="min-h-[20px] max-h-[110px] flex-1 resize-none border-none bg-transparent p-0 py-1.5 text-sm font-medium text-gray-900 placeholder-gray-400"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={handlePostComment}
              disabled={!commentText.trim()}
              aria-label="Post comment"
              className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all ${commentText.trim() ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95' : 'cursor-not-allowed bg-transparent text-gray-300'}`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
