import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { UserAvatar } from './UserAvatar';
import { ProfileSkeleton } from './skeletons/ProfileSkeleton';
import { X, MapPin, Calendar, Users, CheckCircle2, Star, Share2, Heart, Video, Play, MessageCircle, ChevronLeft, Image as ImageIcon, LayoutGrid, Layers } from 'lucide-react';
import { getOrganizerStats, getOrganizerEvents, getPosts, getUserTickets, followUser, unfollowUser, isFollowing as checkIsFollowing, getProfile, getOrganizerProfile, getFollowersCount, getFollowingCount, supabase, type Event, type Post, type Profile, type OrganizerProfile } from '../utils/supabase/api';

interface UserProfile {
  id: string;
  name: string;
  type: 'Organizer' | 'Attendee' | 'Performer';
  avatar: string;
  verified: boolean;
  coverImage?: string;
  bio?: string;
  followers?: number;
}

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
}

export function UserProfileModal({ user, onClose, onFollow, onMessage }: UserProfileModalProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'media' | 'posts' | 'upcoming' | 'attended'>('posts');
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Real data state
  const [stats, setStats] = useState<{ totalEvents: number; followers: number } | null>(null);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUser(authUser);

        // Fetch essential data first (Parallel)
        const [profileData, followingStatus] = await Promise.all([
          getProfile(user.id),
          authUser ? checkIsFollowing(authUser.id, user.id) : Promise.resolve(false)
        ]);

        setProfile(profileData);
        setIsFollowing(followingStatus);

        // Determine if organizer
        let isOrganizer = user.type === 'Organizer' || (profileData && profileData.is_organizer);
        
        // Load secondary data
        const loadSecondaryData = async () => {
          if (isOrganizer) {
            const [statsData, eventsData, orgProfileData] = await Promise.all([
              getOrganizerStats(user.id),
              getOrganizerEvents(user.id),
              getOrganizerProfile(user.id)
            ]);
            setStats(statsData);
            setOrganizerEvents(eventsData || []);
            setOrganizerProfile(orgProfileData);
            setActiveTab('posts'); // Default tab
          } else {
            const tickets = await getUserTickets(user.id);
            setAttendedEvents(tickets?.map(t => t.event).filter(Boolean) || []);
            setOrganizerProfile(null);
            setActiveTab('posts'); // Default tab
          }
          
          // Get follower/following counts
          const [followersCount, followingCount] = await Promise.all([
             getFollowersCount(user.id),
             getFollowingCount(user.id)
          ]);
          setFollowStats({ followers: followersCount, following: followingCount });

          const postsData = await getPosts({ authorId: user.id });
          setUserPosts(postsData || []);
        };

        loadSecondaryData();

      } catch (error) {
        console.error('Error fetching user profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user.id) {
      fetchData();
    }
  }, [user.id, user.type]);

  const handleFollow = async () => {
    if (!currentUser) {
      // toast.error('Please sign in to follow users');
      return;
    }
    
    const newStatus = !isFollowing;
    setIsFollowing(newStatus);
    
    try {
      if (newStatus) {
        await followUser(currentUser.id, user.id);
      } else {
        await unfollowUser(currentUser.id, user.id);
      }
      
      setFollowStats(prev => ({
        ...prev,
        followers: prev.followers + (newStatus ? 1 : -1)
      }));

      if (onFollow) {
        onFollow();
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      setIsFollowing(!newStatus);
    }
  };

  // Determine display data based on role
  const isOrganizerView = user.type === 'Organizer' || !!profile?.is_organizer;
  
  const displayData = {
    name: isOrganizerView ? (organizerProfile?.organizer_name || user.name || 'Organizer') : (profile?.full_name || user.name),
    avatar: isOrganizerView ? organizerProfile?.organizer_avatar_url : (profile?.avatar_url || user.avatar),
    // Removed cover photo usage
    bio: isOrganizerView ? (organizerProfile?.bio || organizerProfile?.description || 'No bio available') : (profile?.bio || user.bio),
    location: isOrganizerView ? (organizerProfile?.location || 'Tanzania') : profile?.location,
    verified: isOrganizerView ? false : (profile?.verified ?? user.verified),
    username: profile?.username || 'user'
  };

  if (loading) {
    return <ProfileSkeleton onClose={onClose} />;
  }

  const upcomingEvents = organizerEvents.filter(e => new Date(e.date) >= new Date());

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
      
      {/* Header Section */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
             <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
               <ChevronLeft className="w-6 h-6 text-gray-900" />
             </button>
             
             <div className="w-20 h-20 rounded-full overflow-hidden bg-white ring-1 ring-gray-200">
                {displayData.avatar ? (
                  <ImageWithFallback
                    src={displayData.avatar}
                    alt={displayData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserAvatar 
                    name={displayData.name} 
                    className="w-full h-full text-2xl" 
                  />
                )}
             </div>

             <div className="flex-1 min-w-0">
                 <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                   {displayData.name}
                 </h1>
                 <p className="text-gray-500 font-medium text-xs flex items-center gap-1">
                   @{displayData.username}
                 </p>
                 {displayData.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{displayData.location}</span>
                    </div>
                 )}
             </div>
          </div>

          <div className="flex flex-col gap-2 items-center">
             <button className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                <Share2 className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between px-4 mb-8">
            <div className="text-center flex-1 border-r border-gray-100">
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {isOrganizerView ? (stats?.totalEvents || 0) : attendedEvents.length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  {isOrganizerView ? 'Hosted' : 'Attended'}
              </div>
            </div>
            <div className="text-center flex-1 border-r border-gray-100">
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {followStats.followers}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Followers
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {followStats.following}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Following
              </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button 
            className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                isFollowing 
                ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            onClick={handleFollow}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button 
            className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            onClick={onMessage}
          >
            Message
          </button>
        </div>

        {/* Bio */}
        {displayData.bio && (
            <div className="mb-6">
               <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                 {displayData.bio}
               </p>
            </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-100">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 min-w-[80px] py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap border-b-2 ${
                activeTab === 'posts'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Posts
            </button>

            {isOrganizerView ? (
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 min-w-[80px] py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap border-b-2 ${
                  activeTab === 'upcoming'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Upcoming
              </button>
            ) : (
               <button
                onClick={() => setActiveTab('attended')}
                className={`flex-1 min-w-[80px] py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap border-b-2 ${
                  activeTab === 'attended'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Attended
              </button>
            )}
        </div>

        {/* Tab Content */}
        <div className="pb-20">
            {activeTab === 'posts' && (
                <div className="grid grid-cols-3 gap-1">
                    {userPosts.map((post) => (
                        <div key={post.id} className="aspect-square bg-gray-100 relative overflow-hidden group">
                           {(post.image_urls && post.image_urls.length > 0) ? (
                              <ImageWithFallback
                                src={post.image_urls[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                           ) : post.video_url ? (
                              <div className="w-full h-full bg-black flex items-center justify-center">
                                 <Play className="w-8 h-8 text-white/80" />
                              </div>
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                 <ImageIcon className="w-6 h-6" />
                              </div>
                           )}
                           {(post.image_urls && post.image_urls.length > 1) && (
                              <div className="absolute top-2 right-2">
                                 <Layers className="w-4 h-4 text-white drop-shadow-md" />
                              </div>
                           )}
                        </div>
                    ))}
                    {userPosts.length === 0 && (
                        <div className="col-span-3 py-12 text-center text-gray-500 text-sm">
                           No posts yet
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'upcoming' && isOrganizerView && (
                <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                        <div key={event.id} className="flex gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100">
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <ImageWithFallback
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <h4 className="text-gray-900 font-medium text-sm line-clamp-1">{event.title}</h4>
                             <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                               <Calendar className="w-3 h-3" />
                               {new Date(event.date).toLocaleDateString()}
                             </p>
                             {event.location && (
                                <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                   <MapPin className="w-3 h-3" />
                                   {event.location}
                                </p>
                             )}
                          </div>
                        </div>
                    ))}
                    {upcomingEvents.length === 0 && (
                        <div className="py-12 text-center text-gray-500 text-sm">
                           No upcoming events
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'attended' && !isOrganizerView && (
                <div className="space-y-4">
                    {attendedEvents.map((event) => (
                        <div key={event.id} className="flex gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100">
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <ImageWithFallback
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <h4 className="text-gray-900 font-medium text-sm line-clamp-1">{event.title}</h4>
                             <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                               <Calendar className="w-3 h-3" />
                               {new Date(event.date).toLocaleDateString()}
                             </p>
                          </div>
                        </div>
                    ))}
                    {attendedEvents.length === 0 && (
                        <div className="py-12 text-center text-gray-500 text-sm">
                           No attended events yet
                        </div>
                    )}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
