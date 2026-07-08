import { Share2, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../ui/dropdown-menu';

interface PostDetailHeaderProps {
  onBack: () => void;
  onShare: (e: React.MouseEvent) => void;
  onSave: (e: React.MouseEvent) => void;
  onEditCaptionOpen: () => void;
  onDeletePost: () => void;
  onReport: () => void;
  isOwner: boolean;
  post: any;
  offsetTop: number;
}

export function PostDetailHeader({
  onBack,
  onShare,
  onSave,
  onEditCaptionOpen,
  onDeletePost,
  onReport,
  isOwner,
  post,
  offsetTop,
}: PostDetailHeaderProps) {
  return (
    <div
      className="fixed left-0 right-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-100"
      style={{ top: offsetTop, paddingTop: 'var(--eventz-safe-area-top)' }}
    >
      <div className="px-4 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onBack}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition-colors hover:bg-gray-100"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onShare}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 p-0 text-gray-700 transition-all hover:bg-cyan-100 hover:text-cyan-600"
              aria-label="Share post"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onSave}
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
              <DropdownMenuContent align="end" className="z-[100]">
                {isOwner ? (
                  <>
                    <DropdownMenuItem
                      onClick={onEditCaptionOpen}
                      className="cursor-pointer"
                    >
                      Edit caption
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDeletePost}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={onReport} className="cursor-pointer">
                    Report Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
