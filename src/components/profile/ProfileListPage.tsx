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
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-950 leading-tight">
                {profile?.full_name || 'Profile'}
              </h1>
              {profile?.username && (
                <p className="text-sm text-gray-500 truncate">{formatUsername(profile.username)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 text-center">
          <button
            type="button"
            onClick={() => navigate(paths.followers, { replace: true })}
            className={`py-3 text-lg font-semibold border-b-4 transition ${
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
            className={`py-3 text-lg font-semibold border-b-4 transition ${
              type === 'following'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-700'
            }`}
          >
            Following <span className="text-gray-500 font-medium">{followingCount}</span>
          </button>
        </div>
      </header>

      <main className="px-5 py-5">
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search..."
            className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
          />
        </div>

        {isLoading ? (
          <div className="space-y-5">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="h-11 w-24 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
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
                  className="flex items-center gap-4 rounded-2xl px-1 py-3 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <UserAvatar
                    src={person.avatar_url}
                    name={person.full_name || person.username || 'User'}
                    size="2xl"
                    verified={!!person.verified}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-lg font-semibold text-gray-950">
                        {person.full_name || person.username || 'User'}
                      </p>
                      {person.is_organizer && (
                        <img src={verifiedBadge} alt="Verified" className="h-4 w-4 flex-shrink-0" loading="lazy" decoding="async" />
                      )}
                    </div>
                    {person.username && (
                      <p className="truncate text-sm text-gray-500">{formatUsername(person.username)}</p>
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
                      className={`h-11 min-w-[94px] rounded-xl border px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
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
