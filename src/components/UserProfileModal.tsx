import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { UserAvatar } from './UserAvatar';
import { EventDetailModal } from './EventDetailModal';
import { PostDetailModal } from './PostDetailModal';
import { ProfileSkeleton } from './skeletons/ProfileSkeleton';
import { MapPin, Calendar, Share2, Video, LayoutGrid, Layers, ChevronLeft } from 'lucide-react';
import { 
  getOrganizerStats, 
  getOrganizerEvents, 
  getPosts, 
  getUserTickets, 
  followUser, 
  unfollowUser, 
  isFollowing as checkIsFollowing, 
  getProfile, 
  getFollowersCount, 
  getFollowingCount, 
  getFollowers, 
  getFollowing, 
  supabase, 
  toggleLikePost,
  toggleSavePost,
   deletePost,
   getPostComments,
   incrementPostView,
   type Event, 
   type Profile 
 } from '../utils/supabase/api';
 import { handleShare } from '../utils/share';
 import { formatTimeAgo } from '../utils/format';
import { mapPostsToViewModel } from '../utils/postMapper';
import { UserListModal } from './UserListModal';
import { toast } from 'sonner';
import { Post } from '../types';

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
  onViewPost?: (post: any) => void;
}

export function UserProfileModal({ user, onClose, onFollow, onMessage, onViewPost }: UserProfileModalProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'media' | 'posts' | 'upcoming' | 'attended'>('posts');

  // Real data state
  const [stats, setStats] = useState<{ totalEvents: number; followers: number } | null>(null);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Follow List Modal State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followList, setFollowList] = useState<any[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const toggleLike = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      const isLiked = await toggleLikePost(postId, currentUser.id);
      
      setUserPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isLiked, likes: (p.likes || 0) + (isLiked ? 1 : -1) } 
          : p
      ));
      
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => ({
          ...prev,
          isLiked,
          likes: (prev.likes || 0) + (isLiked ? 1 : -1)
        }));
      }

      if (isLiked) {
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const toggleSave = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      toast.error('Please login to save posts');
      return;
    }

    try {
      const isSaved = await toggleSavePost(postId, currentUser.id);
      
      setUserPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isSaved } : p
      ));

      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => ({ ...prev, isSaved }));
      }

      toast.success(isSaved ? 'Saved to collection' : 'Removed from collection');
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update save status');
    }
  };

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleShowFollowers = async () => {
    setIsLoadingFollowList(true);
    setShowFollowersModal(true);
    try {
      const followers = await getFollowers(user.id);
      setFollowList(followers || []);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleShowFollowing = async () => {
    setIsLoadingFollowList(true);
    setShowFollowingModal(true);
    try {
      const following = await getFollowing(user.id);
      setFollowList(following || []);
    } catch (err) {
      console.error('Error fetching following:', err);
      toast.error('Failed to load following');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleShowEvents = () => {
    if (isOrganizerView) {
      setActiveTab('upcoming');
    } else {
      setActiveTab('attended');
    }
    toast.success(`Viewing ${isOrganizerView ? 'hosted' : 'attended'} events`);
  };

  useEffect(() => {
    if (selectedPost) {
      incrementPostView(selectedPost.id);
      
      const fetchComments = async () => {
        try {
          const comments = await getPostComments(selectedPost.id);
          const mappedComments = (comments || []).map((c: any) => ({
            id: c.id,
            user: {
              name: c.user?.full_name || c.user?.username || 'User',
              avatar: c.user?.avatar_url || ''
            },
            text: c.text,
            timestamp: formatTimeAgo(c.created_at)
          }));
          
          setSelectedPost((prev: any) => prev && prev.id === selectedPost.id ? { ...prev, comments: mappedComments } : prev);
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      };
      
      fetchComments();
    }
  }, [selectedPost?.id]);

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
            const [statsData, eventsData] = await Promise.all([
              getOrganizerStats(user.id),
              getOrganizerEvents(user.id)
            ]);
            setStats(statsData);
            setOrganizerEvents(eventsData || []);
            setActiveTab('posts'); // Default tab
          } else {
            const tickets = await getUserTickets(user.id);
            setAttendedEvents(tickets?.map(t => t.event).filter(Boolean) || []);
            setActiveTab('posts'); // Default tab
          }
          
          // Get follower/following counts
          const [followersCount, followingCount] = await Promise.all([
             getFollowersCount(user.id),
             getFollowingCount(user.id)
          ]);
          setFollowStats({ followers: followersCount, following: followingCount });

          const postsData = await getPosts({ authorId: user.id });
          if (postsData && Array.isArray(postsData)) {
            setUserPosts(mapPostsToViewModel(postsData));
          }
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
    name: profile?.full_name || user.name || 'User',
    avatar: profile?.avatar_url || user.avatar,
    // Removed cover photo usage
    bio: profile?.bio || profile?.description || user.bio,
    location: profile?.location || 'Tanzania',
    verified: isOrganizerView ? false : (profile?.verified ?? user.verified),
    username: profile?.username?.replace(/^@/, '') || 'user'
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
          <div className="flex items-center gap-3">
             <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
               <ChevronLeft className="w-6 h-6 text-gray-900" />
             </button>
             
             <div className="w-10 h-10 flex-shrink-0">
                {displayData.avatar ? (
                  <ImageWithFallback
                    src={displayData.avatar}
                    alt={displayData.name}
                    className="w-full h-full object-cover rounded-full ring-1 ring-gray-100 cursor-pointer hover:ring-purple-200 transition-all"
                  />
                ) : (
                  <UserAvatar 
                    name={displayData.name} 
                    className="w-full h-full text-sm rounded-full" 
                  />
                )}
             </div>

             <div className="flex-1 min-w-0">
                 <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">
                   {displayData.name}
                 </h1>
                 <p className="text-gray-500 font-medium text-[10px] flex items-center gap-1">
                   @{displayData.username}
                 </p>
             </div>
          </div>

          <div className="flex items-center gap-1">
             <button className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                <Share2 className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="px-1 mb-6">
             <div className="flex justify-between items-center mb-6">
                <div 
                  className="text-center cursor-pointer active:scale-95 transition-transform flex-1"
                  onClick={handleShowEvents}
                >
                  <div className="text-lg font-bold text-gray-900 leading-none">
                      {isOrganizerView ? (stats?.totalEvents || 0) : attendedEvents.length}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wider">
                      {isOrganizerView ? 'Hosted' : 'Attended'}
                  </div>
                </div>
                <div 
                  className="text-center cursor-pointer active:scale-95 transition-transform flex-1"
                  onClick={handleShowFollowers}
                >
                  <div className="text-lg font-bold text-gray-900 leading-none">
                      {followStats.followers}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wider">
                      Followers
                  </div>
                </div>
                <div 
                  className="text-center cursor-pointer active:scale-95 transition-transform flex-1"
                  onClick={handleShowFollowing}
                >
                  <div className="text-lg font-bold text-gray-900 leading-none">
                      {followStats.following}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wider">
                      Following
                  </div>
                </div>
             </div>

             <div className="flex gap-2">
                <button 
                  className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      isFollowing 
                      ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                  }`}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button 
                  className="flex-1 py-2 bg-gray-50 text-gray-900 border border-gray-100 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
                  onClick={onMessage}
                >
                  Message
                </button>
             </div>
        </div>

        {/* Bio & Location */}
        {(displayData.bio || displayData.location) && (
            <div className="mb-6 px-1">
               {displayData.bio && (
                 <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 mb-2">
                   {displayData.bio}
                 </p>
               )}
               {displayData.location && (
                 <div className="flex items-center gap-1.5 text-xs text-gray-500">
                   <MapPin className="w-3.5 h-3.5" />
                   <span>{displayData.location}</span>
                 </div>
               )}
            </div>
        )}

        {/* Tabs */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'posts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Posts
            </button>

            {isOrganizerView ? (
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'upcoming'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Upcoming
              </button>
            ) : (
               <button
                onClick={() => setActiveTab('attended')}
                className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'attended'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Attended
              </button>
            )}
        </div>

        {/* Tab Content */}
        <div className="pb-20">
            {activeTab === 'posts' && (
                <div className="grid grid-cols-3 gap-0.5 animate-in fade-in zoom-in duration-300">
                    {userPosts.map((post) => (
                        <div 
                          key={post.id} 
                          className="aspect-[4/5] bg-gray-100 relative overflow-hidden group cursor-pointer"
                          onClick={() => {
                            if (onViewPost) {
                              onViewPost(post);
                            } else {
                              setSelectedPost(post);
                            }
                          }}
                        >
                           {post.highlights && post.highlights.length > 0 && post.highlights[0].videoUrl ? (
                              <video 
                                src={post.highlights[0].videoUrl} 
                                className="w-full h-full object-cover"
                                playsInline
                                loop
                                muted
                              />
                           ) : (post.content.images && post.content.images.length > 0) ? (
                              <ImageWithFallback
                                src={post.content.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2">
                                <p className="text-xs text-gray-500 line-clamp-3 text-center">{post.content.text || ''}</p>
                              </div>
                           )}
                           {(post.content.images && post.content.images.length > 1) && (
                              <div className="absolute top-2 right-2">
                                 <Layers className="w-4 h-4 text-white drop-shadow-md" />
                              </div>
                           )}
                           {(post.highlights && post.highlights.length > 0) && (
                              <div className="absolute top-2 right-2">
                                 <Video className="w-4 h-4 text-white drop-shadow-md" />
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
                        <div 
                          key={event.id} 
                          className="flex gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100"
                          onClick={() => setSelectedEvent(event)}
                        >
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
                        <div 
                          key={event.id} 
                          className="flex gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100"
                          onClick={() => setSelectedEvent(event)}
                        >
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

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStartConversation={onMessage ? () => onMessage() : undefined}
          onPurchaseTicket={() => {}}
          onPurchaseNormalTicket={() => {}}
        />
      )}

      <UserListModal 
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title="Followers"
        users={followList}
        loading={isLoadingFollowList}
        onUserSelect={() => {
          // Recurse by changing the user of THIS modal if needed, 
          // but better to just show the profile in a new layer or update current
          // For now, let's keep it simple
        }}
      />

      <UserListModal 
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title="Following"
        users={followList}
        loading={isLoadingFollowList}
        onUserSelect={() => {
          // Same here
        }}
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onLike={(id) => toggleLike(id)}
          onSave={(id) => toggleSave(id)}
          onShare={async (p) => {
             await handleShare({
                title: `Check out this post from ${p.user.name}`,
                text: p.content.text || '',
                url: window.location.href
             });
          }}
          onDelete={async (id) => {
             try {
                await deletePost(id);
                setUserPosts(prev => prev.filter(p => p.id !== id));
                setSelectedPost(null);
                toast.success('Post deleted');
             } catch (err) {
                toast.error('Failed to delete post');
             }
          }}
          onProfileClick={() => {}}
          onComment={() => {}}
        />
      )}
    </div>
  );
}
