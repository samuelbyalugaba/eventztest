import { MessageCircle, Heart } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { UserAvatar } from '../UserAvatar';
import verifiedBadge from '../../assets/verified-badge.png';

interface PostDetailCommentsProps {
  post: any;
  currentUser: any;
  onLikeComment?: (commentId: number) => void;
  handleCommentProfileClick: (comment: any, e: React.MouseEvent) => void;
  handleReply: (comment: any) => void;
  handleReportComment: (comment: any) => void;
}

export function PostDetailComments({
  post,
  currentUser,
  onLikeComment,
  handleCommentProfileClick,
  handleReply,
  handleReportComment,
}: PostDetailCommentsProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="px-5 pt-4 pb-2 border-b border-gray-50">
        <h3 className="text-gray-900 font-bold text-base">
          Comments ({(post.comments_count || post.comments?.length || 0).toLocaleString()})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!post.comments || post.comments.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No comments yet" />
        ) : (
          (() => {
            const parentComments = post.comments.filter((c: any) => !c.parent_id);
            const replies = post.comments.filter((c: any) => c.parent_id);

            return parentComments.map((comment: any) => (
              <div key={comment.id} className="mb-4 space-y-2.5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleCommentProfileClick(comment, e)}
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
                        onClick={(e) => handleCommentProfileClick(comment, e)}
                        className="comment-inline-button mr-1 inline-flex items-center gap-1 align-baseline font-bold text-gray-950 hover:text-purple-700 focus:outline-none"
                      >
                        {comment.user.name}
                        {(comment.user.is_organizer || comment.user.isOrganizer || comment.user.verified) && (
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
                    aria-label={comment.is_liked ? 'Unlike comment' : 'Like comment'}
                  >
                    <Heart className={`h-4 w-4 ${comment.is_liked ? 'fill-pink-600' : ''}`} />
                  </button>
                </div>

                {replies.filter((r: any) => r.parent_id === comment.id).map((reply: any) => (
                  <div key={reply.id} className="ml-12 flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => handleCommentProfileClick(reply, e)}
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
                          onClick={(e) => handleCommentProfileClick(reply, e)}
                          className="comment-inline-button mr-1 inline-flex items-center gap-1 align-baseline font-bold text-gray-950 hover:text-purple-700 focus:outline-none"
                        >
                          {reply.user.name}
                          {(reply.user.is_organizer || reply.user.isOrganizer || reply.user.verified) && (
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
            ));
          })()
        )}
      </div>
    </div>
  );
}
