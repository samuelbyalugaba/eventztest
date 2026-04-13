import { useState, useRef } from 'react';
import { X, MessageCircle, Star, Heart } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

interface CommentsSheetComment {
  id: number;
  user: {
    name: string;
    avatar: string;
    is_organizer: boolean;
  };
  text: string;
  timestamp: string;
  parent_id?: number;
  likes_count?: number;
  is_liked?: boolean;
}

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  currentUser: any;
  userProfile?: any;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
}

export function CommentsSheet({
  isOpen,
  onClose,
  post,
  currentUser,
  userProfile,
  onComment,
  onLikeComment
}: CommentsSheetProps) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number, name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    const finalText = replyingTo ? `@${replyingTo.name} ${commentText}` : commentText;
    onComment(post.id, finalText, replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
  };

  const handleReply = (comment: any) => {
    setReplyingTo({ id: comment.id, name: comment.user.name });
    textareaRef.current?.focus();
  };

  const comments = post.comments || [];
  const parentComments = comments.filter((c: any) => !c.parent_id);
  const replies = comments.filter((c: any) => c.parent_id);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-[32px] overflow-hidden flex flex-col border-none shadow-2xl">
        <SheetHeader className="px-6 py-4 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold text-gray-900">
              Comments ({comments.length})
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
          {comments.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm font-medium">No comments yet</p>
              <p className="text-gray-300 text-xs mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            parentComments.map((comment: any) => (
              <div key={comment.id} className="space-y-4">
                {/* Parent Comment */}
                <div className="flex gap-3">
                  <UserAvatar
                    src={comment.user.avatar}
                    name={comment.user.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900 text-sm font-bold flex items-center gap-1">
                        {comment.user.name}
                        {comment.user.is_organizer && (
                          <Star className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                        )}
                      </span>
                      <span className="text-gray-400 text-[10px]">{comment.timestamp}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                    <div className="flex items-center gap-6 mt-2.5">
                      <button 
                        onClick={() => handleReply(comment)}
                        className="text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
                      >
                        Reply
                      </button>
                      <button 
                        onClick={() => onLikeComment?.(comment.id)}
                        className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${comment.is_liked ? 'text-pink-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${comment.is_liked ? 'fill-pink-600' : ''}`} />
                        {comment.likes_count > 0 && comment.likes_count}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.filter((r: any) => r.parent_id === comment.id).map((reply: any) => (
                  <div key={reply.id} className="flex gap-3 ml-12">
                    <UserAvatar
                      src={reply.user.avatar}
                      name={reply.user.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-900 text-sm font-bold flex items-center gap-1">
                          {reply.user.name}
                          {reply.user.is_organizer && (
                            <Star className="w-3 h-3 text-purple-600 fill-purple-600" />
                          )}
                        </span>
                        <span className="text-gray-400 text-[10px]">{reply.timestamp}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{reply.text}</p>
                      <div className="flex items-center gap-6 mt-2.5">
                        <button 
                          onClick={() => handleReply(comment)}
                          className="text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
                        >
                          Reply
                        </button>
                        <button 
                          onClick={() => onLikeComment?.(reply.id)}
                          className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${reply.is_liked ? 'text-pink-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${reply.is_liked ? 'fill-pink-600' : ''}`} />
                          {reply.likes_count > 0 && reply.likes_count}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Input Section */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-2 mb-3 bg-gray-50 rounded-xl text-xs">
              <span className="text-gray-500 font-medium">Replying to <span className="font-bold text-gray-900">@{replyingTo.name}</span></span>
              <button 
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-3 bg-gray-50 rounded-[24px] px-4 py-3 border border-gray-100 focus-within:bg-white focus-within:border-purple-200 focus-within:ring-4 focus-within:ring-purple-50 transition-all">
            <UserAvatar
              src={userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
              name={userProfile?.full_name || currentUser?.user_metadata?.full_name || userProfile?.username || "User"}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
              className="flex-1 bg-transparent border-none p-0 text-sm text-gray-900 placeholder-gray-400 focus:ring-0 resize-none min-h-[20px] max-h-[120px] py-2 font-medium"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={handlePostComment}
              disabled={!commentText.trim()}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                commentText.trim()
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95'
                  : 'text-gray-300 bg-gray-100 cursor-not-allowed'
              }`}
            >
              Post
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
