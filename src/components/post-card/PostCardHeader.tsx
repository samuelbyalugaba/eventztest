import { Post } from '../../types';
import { UserAvatar } from '../UserAvatar';
import verifiedBadge from '../../assets/verified-badge.png';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageCircle,
  Flag,
  Ban,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface PostCardHeaderProps {
  displayProfile: {
    name: string;
    username: string;
    avatar: string;
    id: string;
    verified: boolean;
    isOrganizer?: boolean;
    isOrganizerPage?: boolean;
  };
  postUser: Post['user'];
  timestamp: string;
  isOwnPost: boolean;
  onProfileClick: (user: any) => void;
  onEditCaption: () => void;
  onDeletePost: () => void;
  onMessage: () => void;
  onReport: () => void;
  onBlock: () => void;
}

export function PostCardHeader({
  displayProfile,
  postUser,
  timestamp,
  isOwnPost,
  onProfileClick,
  onEditCaption,
  onDeletePost,
  onMessage,
  onReport,
  onBlock,
}: PostCardHeaderProps) {
  return (
    <div className="feed-post-head">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <UserAvatar
          src={displayProfile.avatar}
          name={displayProfile.name}
          size="md"
          verified={postUser.verified}
          className="feed-post-avatar cursor-pointer border border-[#EDEDED]"
          onClick={() => onProfileClick(displayProfile as any)}
        />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className="feed-post-name cursor-pointer truncate transition-colors hover:text-purple-600"
              onClick={() => onProfileClick(displayProfile as any)}
            >
              {displayProfile.name}
            </span>
            {(displayProfile.isOrganizer || postUser.isOrganizerPage) && (
              <img
                src={verifiedBadge}
                alt="Creator badge"
                className="w-3.5 h-3.5 object-contain"
              />
            )}
          </div>
          <span className="feed-post-time">{timestamp}</span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="feed-post-more hover:bg-gray-50"
            aria-label="Post options"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-[90] min-w-[180px] rounded-xl border-gray-100 bg-white p-1.5 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {isOwnPost ? (
            <>
              <DropdownMenuItem
                onClick={() => void onEditCaption()}
                className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Edit caption
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void onDeletePost()}
                className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete post
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={onMessage}
                className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
              >
                <MessageCircle className="h-4 w-4" />
                Message User
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void onReport()}
                className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
              >
                <Flag className="h-4 w-4" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void onBlock()}
                className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Ban className="h-4 w-4" />
                Block User
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
