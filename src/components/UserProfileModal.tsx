import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { UserAvatar } from './UserAvatar';
import { ProfileSkeleton } from './skeletons/ProfileSkeleton';
import { X, MapPin, Calendar, Users, CheckCircle2, Star, Share2, Heart, Video, Play, MessageCircle, ChevronLeft, Image as ImageIcon, Layers } from 'lucide-react';
import { MediaViewer } from './MediaViewer';
import { getOrganizerStats, getOrganizerEvents, getPosts, getUserTickets, followUser, unfollowUser, isFollowing as checkIsFollowing, getProfile, getOrganizerProfile, supabase, type Event, type Post, type Profile, type OrganizerProfile } from '../utils/supabase/api';

interface UserProfile {
  id: string;
  name: string;
  type: 'Organizer' | 'Attendee' | 'Performer';
  avatar: string;
  verified: boolean;
  // Optional fields for backward compatibility or direct passing
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
  const [activeTab, setActiveTab] = useState<'events' | 'media'>('events');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [mediaTab, setMediaTab] = useState<'photos' | 'videos'>('photos');

  // Real data state
  const [stats, setStats] = useState<{ totalEvents: number; followers: number } | null>(null);
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

        // Load secondary data in background
        const loadSecondaryData = async () => {
          if (user.type === 'Organizer' || (profileData && profileData.is_organizer)) {
            const [statsData, eventsData, orgProfileData] = await Promise.all([
              getOrganizerStats(user.id),
              getOrganizerEvents(user.id),
              getOrganizerProfile(user.id)
            ]);
            setStats(statsData);
            setOrganizerEvents(eventsData || []);
            setOrganizerProfile(orgProfileData);
          } else {
            const tickets = await getUserTickets(user.id);
            setAttendedEvents(tickets?.map(t => t.event).filter(Boolean) || []);
            setOrganizerProfile(null);
          }

          const postsData = await getPosts({ authorId: user.id });
          setUserPosts(postsData || []);
        };

        // Don't await secondary data to show profile quickly
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
      toast.error('Please sign in to follow users');
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
      
      // Update stats locally
      if (stats) {
        setStats({
          ...stats,
          followers: stats.followers + (newStatus ? 1 : -1)
        });
      }

      if (onFollow) {
        onFollow();
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      setIsFollowing(!newStatus);
    }
  };

  // Derived data
  // For the Grid: One item per post
  const photoPosts = userPosts.filter(p => p.image_urls && p.image_urls.length > 0);
  const videoPosts = userPosts.filter(p => p.video_url);

  const upcomingEvents = organizerEvents.filter(e => new Date(e.date) >= new Date());
  const pastEvents = organizerEvents.filter(e => new Date(e.date) < new Date());

  // For the Viewer: Flatten all photos
  const photosForViewer = photoPosts.flatMap((post) => 
    post.image_urls.map((url, idx) => ({
      id: post.id * 100 + idx,
      url: url,
      likes: post.likes_count || 0,
      eventName: post.event?.title || 'Post',
      isPost: true,
      postId: post.id,
      isLiked: post.is_liked
    }))
  );

  const videosForViewer = videoPosts.map((post) => ({
    id: post.id,
    thumbnail: post.image_urls?.[0],
    videoUrl: post.video_url!,
    likes: post.likes_count || 0,
    eventName: post.event?.title || 'Post',
    isPost: true,
    postId: post.id,
    isLiked: post.is_liked
  }));

  // Determine display data based on role
  const isOrganizerView = user.type === 'Organizer' || !!profile?.is_organizer;
  
  const displayData = {
    name: isOrganizerView ? (organizerProfile?.organizer_name || user.name || 'Organizer') : (profile?.full_name || user.name),
    avatar: isOrganizerView ? organizerProfile?.organizer_avatar_url : (profile?.avatar_url || user.avatar),
    cover: isOrganizerView ? organizerProfile?.cover_url : (profile?.cover_url || user.coverImage),
    bio: isOrganizerView ? (organizerProfile?.bio || organizerProfile?.description || 'No bio available') : (profile?.bio || user.bio),
    location: isOrganizerView ? (organizerProfile?.location || 'Tanzania') : profile?.location,
    verified: isOrganizerView ? false : (profile?.verified ?? user.verified)
  };

  if (loading) {
    return <ProfileSkeleton onClose={onClose} />;
  }

  return (
    <>
      {/* User Profile Page (Full Screen) */}
      <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
          
          {/* Hero Section with Cover */}
          <div className="relative h-64 md:h-80 w-full">
            {displayData.cover ? (
              <ImageWithFallback
                src={displayData.cover}
                alt={displayData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-800 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/40 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/40 transition-colors border border-white/10">
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Profile Info Overlay */}
            <div className="absolute -bottom-16 left-0 right-0 px-6 flex flex-col items-center">
               <div className="w-32 h-32 rounded-full p-1 bg-white shadow-xl relative z-10">
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <ImageWithFallback 
                       src={displayData.avatar}
                       name={displayData.name}
                       className="w-full h-full object-cover"
                    />
                  </div>
                  {displayData.verified && (
                    <div className="absolute bottom-1 right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-[#8A2BE2] fill-white" />
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-20 px-6 pb-24 max-w-2xl mx-auto">
            
            {/* Name & Bio */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{displayData.name}</h1>
              {displayData.location && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{displayData.location}</span>
                </div>
              )}
              
              {/* Follow Button */}
              <div className="flex justify-center gap-3 mb-6">
                <button
                  onClick={handleFollow}
                  className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                    isFollowing
                      ? 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                      : 'bg-[#8A2BE2] text-white hover:bg-[#7a26c9] hover:shadow-purple-200'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                {onMessage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage();
                    }}
                    className="p-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex justify-center divide-x divide-gray-200 mb-6 border-y border-gray-100 py-4">
                <div className="px-6 text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {loading ? '-' : ((user.type === 'Organizer' || profile?.is_organizer) ? (stats?.totalEvents || 0) : attendedEvents.length)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                    {(user.type === 'Organizer' || profile?.is_organizer) ? 'Events' : 'Attended'}
                  </div>
                </div>
                <div className="px-6 text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {loading ? '-' : (stats?.followers || user.followers || 0)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Followers</div>
                </div>
                <div className="px-6 text-center">
                   <div className="text-xl font-bold text-gray-900">1.2k</div>
                   <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Following</div>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
                {displayData.bio || 'No bio available'}
              </p>
            </div>

            {/* Modern Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                  activeTab === 'events'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-[11px]">Events</span>
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                  activeTab === 'media'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px]">Media</span>
              </button>
            </div>

            {/* Tab Content */}
            {/* Events Tab */}
            {activeTab === 'events' && (
              <div>
                {/* Past Event Highlights - For Organizers */}
                {(user.type === 'Organizer' || profile?.is_organizer) && pastEvents.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-gray-900 mb-3">Past Event Highlights</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {pastEvents.slice(0, 4).map((event) => (
                        <div key={event.id} className="relative rounded-2xl overflow-hidden h-32 group cursor-pointer">
                          <ImageWithFallback
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-xs drop-shadow-lg line-clamp-1">{event.title}</p>
                            <p className="text-white/80 text-[10px]">{event.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Memories - For Attendees */}
                {(user.type === 'Attendee' && !profile?.is_organizer) && attendedEvents.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-gray-900">Events Attended</h3>
                      <span className="text-gray-500 text-sm">{attendedEvents.length} events</span>
                    </div>
                    <div className="space-y-3">
                      {attendedEvents.slice(0, showAllEvents ? attendedEvents.length : 6).map((event) => (
                        <div key={event.id} className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <ImageWithFallback
                              src={event.image_url}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-gray-900 text-sm mb-1 line-clamp-1">{event.title}</h4>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                              <Calendar className="w-3 h-3" />
                              <span>{event.date}</span>
                            </div>
                            {event.attendees && (
                              <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <Users className="w-3 h-3" />
                                <span>{event.attendees.toLocaleString()} attended</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* View All / Show Less Button */}
                    {attendedEvents.length > 6 && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowAllEvents(!showAllEvents)}
                          className="w-full bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group border border-purple-200"
                        >
                          <span className="font-medium">
                            {showAllEvents ? 'Show Less' : `View All ${attendedEvents.length} Events`}
                          </span>
                          <svg
                            className={`w-5 h-5 transition-transform duration-300 ${showAllEvents ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Upcoming Events - Only for Organizers */}
                {(user.type === 'Organizer' || profile?.is_organizer) && upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-gray-900 mb-4">Upcoming Events</h3>
                    <div className="space-y-4">
                      {upcomingEvents.map((event) => (
                        <div key={event.id} className="flex gap-3">
                          {/* Event Image */}
                          <ImageWithFallback
                            src={event.image_url}
                            alt={event.title}
                            className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                          />
                          
                          {/* Event Details */}
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                              <h4 className="text-gray-900 mb-2 line-clamp-2">{event.title}</h4>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  <span>{event.date}{event.time ? ` • ${event.time}` : ''}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 flex-shrink-0" />
                                    <span className="line-clamp-1">{event.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button className="self-start mt-2 bg-[#8A2BE2] text-white px-5 py-2 rounded-full text-sm hover:bg-[#7526c7] transition-colors">
                              Get Ticket
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(((user.type === 'Organizer' || profile?.is_organizer) && pastEvents.length === 0 && upcomingEvents.length === 0) || ((user.type === 'Attendee' && !profile?.is_organizer) && attendedEvents.length === 0)) && (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No events to show</p>
                  </div>
                )}
              </div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                {/* Media Tabs */}
                <div className="flex items-center justify-center gap-8 border-b border-gray-100 mb-6">
                  <button
                    onClick={() => setMediaTab('photos')}
                    className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                      mediaTab === 'photos'
                        ? 'text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Photos
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                      {photoPosts.length}
                    </span>
                    {mediaTab === 'photos' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setMediaTab('videos')}
                    className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                      mediaTab === 'videos'
                        ? 'text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Videos
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                  {videoPosts.length}
                </span>
                    {mediaTab === 'videos' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
                    )}
                  </button>
                </div>

                {/* Photos Content */}
                {mediaTab === 'photos' && (
                  photoPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 animate-in fade-in zoom-in duration-300">
                      {photoPosts.map((post) => {
                        const imageUrl = post.image_urls[0];
                        return (
                          <div 
                            key={post.id} 
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              const idx = photosForViewer.findIndex(p => Math.floor(p.id / 100) === post.id);
                              setMediaViewerIndex(idx >= 0 ? idx : 0);
                              setMediaViewerType('photo');
                              setShowMediaViewer(true);
                            }}
                          >
                            <ImageWithFallback
                              src={imageUrl}
                              alt={`Photo ${post.id}`}
                              className="w-full h-full object-cover"
                            />
                            {post.image_urls.length > 1 && (
                              <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-900 font-medium mb-1">No photos yet</p>
                      <p className="text-gray-500 text-sm max-w-xs mx-auto">This user hasn't shared any photos yet</p>
                    </div>
                  )
                )}

                {/* Videos Content */}
                {mediaTab === 'videos' && (
                  videoPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 animate-in fade-in zoom-in duration-300">
                      {videoPosts.map((post, idx) => (
                        <div 
                          key={post.id} 
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaViewerIndex(idx);
                            setMediaViewerType('video');
                            setShowMediaViewer(true);
                          }}
                        >
                          <video 
                            src={post.video_url} 
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            loop
                            preload="metadata"
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium pointer-events-none">
                            {post.duration || '0:00'}
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-current" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Video className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-900 font-medium mb-1">No videos yet</p>
                      <p className="text-gray-500 text-sm max-w-xs mx-auto">This user hasn't shared any videos yet</p>
                    </div>
                  )
                )}
              </div>
            )}

          </div>
      </div>
      
      {/* Media Viewer - Rendered completely outside modal DOM */}
      {showMediaViewer && (
        <MediaViewer
          media={mediaViewerType === 'photo' ? photosForViewer : videosForViewer}
          initialIndex={mediaViewerIndex}
          onClose={() => setShowMediaViewer(false)}
          type={mediaViewerType}
        />
      )}
    </>
  );
}
