import { MessageCircle } from 'lucide-react';
import { PostCard } from '../PostCard';
import { PostSkeleton } from '../PostSkeleton';
import { UserAvatar } from '../UserAvatar';
import verifiedBadge from '../../assets/verified-badge.png';
import { Post } from '../../types';

interface ProfileSearchResult {
  id: string;
  full_name?: string;
  username: string;
  avatar_url?: string;
  verified?: boolean;
  is_organizer?: boolean;
}

interface FeedContentProps {
  exploreSearch: string;
  isSearchingProfiles: boolean;
  searchedProfiles: ProfileSearchResult[];
  isLoading: boolean;
  filteredPosts: Post[];
  isRestoringScroll: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  isPaused?: boolean;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onLike: (id: number) => Promise<void>;
  onSave: (id: number) => Promise<void>;
  onShare: (post: Post) => Promise<void>;
  onMessage: (user: any) => void;
  onViewPost: (post: Post, startTime?: number, isMuted?: boolean) => void;
  onViewComments: (post: Post) => void;
}

export function FeedContent({
  exploreSearch,
  isSearchingProfiles,
  searchedProfiles,
  isLoading,
  filteredPosts,
  isRestoringScroll,
  hasMore,
  isLoadingMore,
  isPaused,
  onProfileClick,
  onLike,
  onSave,
  onShare,
  onMessage,
  onViewPost,
  onViewComments,
}: FeedContentProps) {
  if (exploreSearch.trim().length >= 2) {
    return (
      <div className="mb-8 -mx-4">
        <div className="flex items-center justify-between px-5 mb-4">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">Profiles</h3>
          {isSearchingProfiles && (
            <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {searchedProfiles.length > 0 ? (
          <div className="flex overflow-x-auto gap-5 px-5 pb-2 scrollbar-hide">
            {searchedProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onProfileClick({
                  id: profile.id,
                  name: profile.full_name || profile.username,
                  username: profile.username,
                  avatar: profile.avatar_url,
                  verified: profile.verified,
                  isOrganizer: profile.is_organizer,
                })}
                className="flex flex-col items-center gap-2.5 flex-shrink-0 w-20 group"
              >
                <div className="relative">
                  <UserAvatar
                    src={profile.avatar_url}
                    name={profile.full_name || profile.username}
                    size="lg"
                    verified={profile.verified}
                    className="ring-2 ring-transparent group-hover:ring-purple-500/30 transition-all duration-300"
                  />
                  {profile.is_organizer && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm z-10">
                      <img
                        src={verifiedBadge}
                        alt="Creator badge"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="text-center w-full">
                  <p className="text-[12px] font-bold text-gray-900 truncate mb-0.5">
                    {profile.full_name?.split(' ')[0] || profile.username}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium truncate">@{profile.username}</p>
                </div>
              </button>
            ))}
          </div>
        ) : !isSearchingProfiles && (
          <div className="px-5">
            <div className="p-6 text-center bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
              <p className="text-xs text-gray-400">No matching profiles</p>
            </div>
          </div>
        )}
      </div>
    );
  }

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
                  onLike={(id) => onLike(id)}
                  onSave={(id) => onSave(id)}
                  onShare={(p) => onShare(p)}
                  onProfileClick={(user) => onProfileClick(user)}
                  onMessage={(user) => onMessage(user)}
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
