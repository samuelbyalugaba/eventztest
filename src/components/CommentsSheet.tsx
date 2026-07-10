import { useState, useRef } from 'react';
import { X, MessageCircle, Heart, Send } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { UserAvatar } from './UserAvatar';
import verifiedBadge from '../assets/verified-badge.png';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { toast } from 'sonner';
import { reportContent } from '../utils/supabase/api';
import { ReportReasonModal } from './ui/ReportReasonModal';
import { useVisualViewport } from '../utils/useVisualViewport';


interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  currentUser: any;
  userProfile?: any;
  onComment: (postId: number, text: string, parentId?: number) => void;
  onLikeComment?: (commentId: number) => void;
  onOpenUserProfile?: (user: any) => void;
}

export function CommentsSheet({
  isOpen,
  onClose,
  post,
  currentUser,
  userProfile,
  onComment,
  onLikeComment,
  onOpenUserProfile
}: CommentsSheetProps) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number, name: string } | null>(null);
  const [showReportReason, setShowReportReason] = useState(false);
  const [reportTargetComment, setReportTargetComment] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { offsetBottom } = useVisualViewport();

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

  const handleOpenCommentUser = (comment: any) => {
    const user = comment.user;
    const userId = user?.id || comment.user_id;
    if (!userId || userId === 'unknown') return;
    if (!onOpenUserProfile) return;

    onClose();
    onOpenUserProfile({
      id: userId,
      name: user?.name || 'User',
      username: user?.username || '',
      avatar: user?.avatar || '',
      verified: !!user?.verified,
      isOrganizer: !!(user?.isOrganizer || user?.is_organizer),
    });
  };

  const handleReportComment = async (comment: any) => {
    if (!currentUser) {
      toast.error('Please sign in to report content');
      return;
    }
    setReportTargetComment(comment);
    setShowReportReason(true);
  };

  const handleReportReasonConfirm = async (reason: string) => {
    if (!reason || !reportTargetComment) return;
    try {
      await reportContent({
        contentType: 'comment',
        contentId: reportTargetComment.id,
        reason,
        details: reportTargetComment.text,
        reportedUserId: reportTargetComment.user?.id || reportTargetComment.user_id,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  const comments = post.comments || [];
  const parentComments = comments.filter((c: any) => !c.parent_id);
  const replies = comments.filter((c: any) => c.parent_id);
  const inputBottomPadding = `calc(0.85rem + ${offsetBottom}px + var(--eventz-safe-area-bottom))`;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent hideDefaultClose side="bottom" className="h-[82dvh] max-h-[min(82dvh,760px)] p-0 rounded-t-3xl overflow-hidden flex flex-col border-none bg-white shadow-2xl">
        <SheetHeader className="flex-shrink-0 border-b border-gray-100 px-4 pb-3 pt-2">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-gray-300" />
          <div className="flex h-9 items-center justify-center">
            <SheetTitle className="text-base font-bold text-gray-950">
              Comments ({comments.length})
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close comments"
              className="absolute right-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-hide">
          {comments.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No comments yet"
              description="Be the first to comment."
            />
          ) : (
            parentComments.map((comment: any) => (
              <div key={comment.id} className="mb-4 space-y-2.5">
                {/* Parent Comment */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenCommentUser(comment)}
                    className="h-9 w-9 flex-shrink-0 rounded-full text-left focus:outline-none"
                    aria-label={`Open ${comment.user.name}'s profile`}
                  >
                    <UserAvatar
                      src={comment.user.avatar}
                      name={comment.user.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  </button>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs leading-[18px] text-gray-900">
                      <button
                        type="button"
                        onClick={() => handleOpenCommentUser(comment)}
                        className="comment-inline-button mr-1 inline-flex items-center gap-1 align-baseline font-bold text-gray-950 hover:text-purple-700 focus:outline-none"
                      >
                        {comment.user.name}
                        {comment.user.is_organizer && (
                          <img src={verifiedBadge} alt="Verified" className="h-3.5 w-3.5 select-none" loading="lazy" decoding="async" />
                        )}
                      </button>
                      {comment.text}
                    </p>
                    <div className="mt-0.5 flex h-4 items-center gap-4">
                      <span className="text-xs font-semibold leading-none text-gray-400">{comment.timestamp}</span>
                      <button 
                        onClick={() => handleReply(comment)}
                        className="comment-inline-button text-xs font-semibold leading-none text-gray-500 transition-colors hover:text-gray-800"
                      >
                        Reply
                      </button>
                      {String(comment.user?.id || comment.user_id) !== String(currentUser?.id || '') && (
                        <button
                          onClick={() => handleReportComment(comment)}
                          className="comment-inline-button text-xs font-semibold leading-none text-gray-500 transition-colors hover:text-red-600"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => onLikeComment?.(comment.id)}
                    className={`comment-icon-button mt-1 flex flex-shrink-0 items-center justify-center rounded-full transition-colors ${comment.is_liked ? 'text-pink-600' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    <Heart className={`h-4 w-4 ${comment.is_liked ? 'fill-pink-600' : ''}`} />
                  </button>
                </div>

                {/* Replies */}
                {replies.filter((r: any) => r.parent_id === comment.id).map((reply: any) => (
                  <div key={reply.id} className="ml-12 flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCommentUser(reply)}
                      className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full text-left focus:outline-none"
                      aria-label={`Open ${reply.user.name}'s profile`}
                    >
                      <UserAvatar
                        src={reply.user.avatar}
                        name={reply.user.name}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    </button>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs leading-[18px] text-gray-900">
                        <button
                          type="button"
                          onClick={() => handleOpenCommentUser(reply)}
                          className="comment-inline-button mr-1 inline-flex items-center gap-1 align-baseline font-bold text-gray-950 hover:text-purple-700 focus:outline-none"
                        >
                          {reply.user.name}
                          {reply.user.is_organizer && (
                            <img src={verifiedBadge} alt="Verified" className="h-3 w-3 select-none" loading="lazy" decoding="async" />
                          )}
                        </button>
                        {reply.text}
                      </p>
                      <div className="mt-0.5 flex h-4 items-center gap-4">
                        <span className="text-2xs font-semibold leading-none text-gray-400">{reply.timestamp}</span>
                        <button 
                          onClick={() => handleReply(comment)}
                          className="comment-inline-button text-2xs font-semibold leading-none text-gray-500 transition-colors hover:text-gray-800"
                        >
                          Reply
                        </button>
                        <button 
                          onClick={() => onLikeComment?.(reply.id)}
                          className={`comment-inline-button text-2xs font-semibold leading-none transition-colors ${reply.is_liked ? 'text-pink-600' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                          Like{reply.likes_count > 0 ? ` (${reply.likes_count})` : ''}
                        </button>
                        {String(reply.user?.id || reply.user_id) !== String(currentUser?.id || '') && (
                          <button
                            onClick={() => handleReportComment(reply)}
                            className="comment-inline-button text-2xs font-semibold leading-none text-gray-500 transition-colors hover:text-red-600"
                          >
                            Report
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Input Section */}
        <div
          className="flex-shrink-0 border-t border-gray-100 bg-white px-4 pt-3"
          style={{ paddingBottom: inputBottomPadding }}
        >
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
              <span className="text-gray-500 font-medium">Replying to <span className="font-bold text-gray-900">@{replyingTo.name}</span></span>
              <button 
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2.5 rounded-[1.45rem] border border-gray-200 bg-gray-50 px-3 py-2.5 transition-all focus-within:border-gray-300 focus-within:bg-white">
            <UserAvatar
              src={userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
              name={userProfile?.full_name || currentUser?.user_metadata?.full_name || userProfile?.username || "User"}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
            <textarea
              ref={textareaRef}
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
              className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                commentText.trim()
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95'
                  : 'cursor-not-allowed bg-transparent text-gray-300'
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SheetContent>
      <ReportReasonModal
        open={showReportReason}
        onOpenChange={setShowReportReason}
        label="this comment"
        onConfirm={handleReportReasonConfirm}
      />
    </Sheet>
  );
}
