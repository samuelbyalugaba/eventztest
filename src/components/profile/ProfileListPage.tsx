import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  getFollowedUserIds,
  getFollowers,
  getFollowersCount,
  getFollowing,
  getFollowingCount,
  getProfile,
  toggleFollow,
  type Profile,
} from '../../utils/supabase/api';
import { UserAvatar } from '../UserAvatar';
import verifiedBadge from '../../assets/verified-badge.png';

type ProfileListType = 'followers' | 'following';

interface ProfileListPageProps {
  type: ProfileListType;
}

const formatUsername = (username?: string | null) => {
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
};

export function ProfileListPage({ type }: ProfileListPageProps) {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const targetUserId = userId || user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const paths = useMemo(() => {
    const base = userId ? `/profile/${userId}` : '';
    return {
      followers: userId ? `${base}/followers` : '/followers',
      following: userId ? `${base}/following` : '/following',
    };
  }, [userId]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!targetUserId) return;
      setIsLoading(true);
      try {
        const [profileData, followersTotal, followingTotal, list, currentFollowingIds] = await Promise.all([
          getProfile(targetUserId),
          getFollowersCount(targetUserId),
          getFollowingCount(targetUserId),
          type === 'followers' ? getFollowers(targetUserId) : getFollowing(targetUserId),
          user?.id ? getFollowedUserIds(user.id) : Promise.resolve([]),
        ]);

        if (!alive) return;
        setProfile(profileData);
        setFollowersCount(followersTotal);
        setFollowingCount(followingTotal);
        setUsers((list || []).filter(Boolean));
        setFollowingIds(new Set(currentFollowingIds));
      } catch {
        if (alive) toast.error(`Failed to load ${type}`);
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [targetUserId, type, user?.id]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((item) => {
      const name = item.full_name || '';
      const username = item.username || '';
      return name.toLowerCase().includes(query) || username.toLowerCase().includes(query);
    });
  }, [searchQuery, users]);

  const handleToggleFollow = async (person: Profile) => {
    if (!user?.id || user.id === person.id || busyUserId) return;
    const wasFollowing = followingIds.has(person.id);
    setBusyUserId(person.id);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(person.id);
      else next.add(person.id);
      return next;
    });

    try {
      const nowFollowing = await toggleFollow(user.id, person.id);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (nowFollowing) next.add(person.id);
        else next.delete(person.id);
        return next;
      });
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(person.id);
        else next.delete(person.id);
        return next;
      });
      toast.error('Failed to update follow status');
    } finally {
      setBusyUserId(null);
    }
  };

  const emptyText = type === 'followers' ? 'No followers yet' : 'Not following anyone yet';

  return (
    <div className="min-h-screen bg-white pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-gray-900" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-950 leading-tight">
                {profile?.full_name || 'Profile'}
              </h1>
              {profile?.username && (
                <p className="text-xs text-gray-500 truncate">{formatUsername(profile.username)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 text-center">
          <button
            type="button"
            onClick={() => navigate(paths.followers, { replace: true })}
            className={`py-2.5 text-sm font-semibold border-b-2 transition ${
              type === 'followers'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-700'
            }`}
          >
            Followers <span className="text-gray-500 font-medium">{followersCount}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(paths.following, { replace: true })}
            className={`py-2.5 text-sm font-semibold border-b-2 transition ${
              type === 'following'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-700'
            }`}
          >
            Following <span className="text-gray-500 font-medium">{followingCount}</span>
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
          />
        </div>

        {isLoading ? (
          <div className="space-y-5">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="h-9 w-20 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-gray-900">{emptyText}</p>
            <p className="mt-1 text-sm text-gray-500">People will appear here once there is activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((person) => {
              const isSelf = user?.id === person.id;
              const isFollowingPerson = followingIds.has(person.id);

              return (
                <div
                  key={person.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/profile/${person.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') navigate(`/profile/${person.id}`);
                  }}
                  className="flex items-center gap-3 rounded-xl px-1 py-2.5 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <UserAvatar
                    src={person.avatar_url}
                    name={person.full_name || person.username || 'User'}
                    size="lg"
                    verified={!!person.verified}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-gray-950">
                        {person.full_name || person.username || 'User'}
                      </p>
                      {person.is_organizer && (
                        <img src={verifiedBadge} alt="Verified" className="h-3.5 w-3.5 flex-shrink-0" loading="lazy" decoding="async" />
                      )}
                    </div>
                    {person.username && (
                      <p className="truncate text-xs text-gray-500">{formatUsername(person.username)}</p>
                    )}
                  </div>
                  {!isSelf && (
                    <button
                      type="button"
                      disabled={busyUserId === person.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleFollow(person);
                      }}
                      className={`h-9 min-w-[78px] rounded-lg border px-3 text-xs font-semibold transition active:scale-95 disabled:opacity-60 ${
                        isFollowingPerson
                          ? 'border-gray-200 bg-gray-50 text-gray-900'
                          : 'border-purple-600 bg-purple-600 text-white'
                      }`}
                    >
                      {isFollowingPerson ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
