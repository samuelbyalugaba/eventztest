import { Heart, Calendar, MapPin } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { CommentIcon } from '../icons/CommentIcon';
import verifiedBadge from '../../assets/verified-badge.png';

interface PostDetailUserSectionProps {
  post: any;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function PostDetailUserSection({
  post,
  onProfileClick,
  onLike,
  textareaRef,
}: PostDetailUserSectionProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar
          src={post.user.avatar}
          name={post.user.name}
          className="w-14 h-14 rounded-full object-cover cursor-pointer flex-shrink-0"
          onClick={(e) => onProfileClick(post.user, e)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            <span
              className="text-gray-900 font-bold cursor-pointer hover:text-purple-600 transition-colors truncate min-w-0"
              onClick={(e) => onProfileClick(post.user, e)}
            >
              {post.user.name}
            </span>
            {(post.user.isOrganizer || post.user.verified) && (
              <img src={verifiedBadge} alt="Verified" className="w-4 h-4 flex-shrink-0 select-none" loading="lazy" decoding="async" />
            )}
          </div>
          <span className="text-gray-500 text-sm">{post.timestamp || 'Just now'}</span>
        </div>
      </div>

      {post.content?.text && (
        <div className="text-gray-800 text-sm leading-relaxed">
          {post.content.text}
        </div>
      )}

      {post.event && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1">
              <h3 className="text-gray-900 font-bold text-lg mb-2">{post.event.name || post.event.title}</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{post.event.date}</span>
                  {post.event.time && <span className="text-gray-500">• {post.event.time}</span>}
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span>{post.event.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="feed-post-actions !px-0 !py-2">
        <button
          onClick={(e) => onLike(post.id, e)}
          className={`feed-action-btn feed-like-btn ${post.isLiked ? 'feed-action-liked' : ''}`}
        >
          <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
          <span>{(post.likes_count || post.likes || 0).toLocaleString()}</span>
        </button>
        <button
          onClick={() => textareaRef.current?.focus()}
          className="feed-action-btn"
        >
          <CommentIcon className="h-[1.05rem] w-[1.05rem] overflow-visible" color="currentColor" />
          <span>{(post.comments_count || post.comments?.length || 0).toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}
