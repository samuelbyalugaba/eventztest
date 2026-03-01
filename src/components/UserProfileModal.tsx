import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { UserAvatar } from './UserAvatar';
import { ProfileSkeleton } from './skeletons/ProfileSkeleton';
import { X, MapPin, Calendar, Users, CheckCircle2, Star, Share2, Heart, Video, Play, MessageCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'events' | 'photos' | 'videos'>('events');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');

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
    if (!currentUser) return;
    
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
  const photos = userPosts.filter(p => p.image_urls && p.image_urls.length > 0);
  const videos = userPosts.filter(p => p.video_url);

  const upcomingEvents = organizerEvents.filter(e => new Date(e.date) >= new Date());
  const pastEvents = organizerEvents.filter(e => new Date(e.date) < new Date());

  // Convert photos to format expected by MediaViewer
  const photosForViewer = photos.flatMap((post) => 
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

  const videosForViewer = videos.map((post) => ({
    id: post.id,
    thumbnail: post.image_urls?.[0] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
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
    avatar: isOrganizerView ? (organizerProfile?.organizer_avatar_url || 'https://images.unsplash.com/photo-1475721027767-f4242310f17a?w=400&h=400&fit=crop') : (profile?.avatar_url || user.avatar),
    cover: isOrganizerView ? (organizerProfile?.cover_url || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=400&fit=crop') : (profile?.cover_url || user.coverImage),
    bio: isOrganizerView ? (organizerProfile?.bio || organizerProfile?.description || 'No bio available') : (profile?.bio || user.bio),
    location: isOrganizerView ? (organizerProfile?.location || 'Tanzania') : profile?.location,
    verified: isOrganizerView ? false : (profile?.verified ?? user.verified)
  };

  if (loading) {
    return <ProfileSkeleton onClose={onClose} />;
  }

  return (
    <>
      {/* User Profile Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          
          {/* Hero Section with Cover */}
          <div className="relative h-52 rounded-t-3xl overflow-hidden">
            <ImageWithFallback
              src={displayData.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'}
              alt={displayData.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
            
            {/* Top Actions */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
                <Share2 className="w-5 h-5 text-gray-900" />
              </button>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* User Name & Follow Button */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50">
                    <UserAvatar 
                       src={displayData.avatar}
                       name={displayData.name}
                       className="w-full h-full"
                    />
                 </div>
                 <div>
                    <h2 className="text-white font-bold drop-shadow-lg text-lg leading-tight">{displayData.name}</h2>
                    {displayData.verified && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-white fill-[#8A2BE2]" />
                        <span className="text-white/80 text-xs">Verified</span>
                      </div>
                    )}
                 </div>
              </div>
              <button
                onClick={handleFollow}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  isFollowing
                    ? 'bg-white/20 backdrop-blur-sm text-white border border-white/40'
                    : 'bg-white text-gray-900'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            
            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Events/Followers */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm">
                <div className="text-lg text-gray-900 font-bold">
                  {loading ? '-' : ((user.type === 'Organizer' || profile?.is_organizer) ? (stats?.totalEvents || 0) : attendedEvents.length)}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  {(user.type === 'Organizer' || profile?.is_organizer) ? 'Events' : 'Events Attended'}
                </div>
              </div>

              {/* Followers */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm">
                <div className="text-lg text-gray-900 font-bold">
                  {loading ? '-' : (stats?.followers || user.followers || 0)}
                </div>
                <div className="text-xs text-gray-600 font-semibold">Followers</div>
              </div>
            </div>

            {/* Message Button */}
            {onMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage();
                }}
                className="w-full mb-6 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Message</span>
              </button>
            )}

            {/* About */}
            <div className="mb-6">
              <h3 className="text-gray-900 mb-2">About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{displayData.bio || 'No bio available'}</p>
              {displayData.location && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{displayData.location}</span>
                </div>
              )}
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
                onClick={() => setActiveTab('photos')}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                  activeTab === 'photos'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px]">Photos</span>
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                  activeTab === 'videos'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Video className="w-6 h-6" />
                <span className="text-[11px]">Videos</span>
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

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div>
                {photos.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900">Photos</h3>
                      <span className="text-gray-500 text-sm">{photos.length} photos</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {photos.map((post) => {
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
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm">No photos to show</p>
                  </div>
                )}
              </div>
            )}

            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <div>
                {videos.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900">Videos</h3>
                      <span className="text-gray-500 text-sm">{videos.length} videos</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {videos.map((post, idx) => (
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
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No videos to show</p>
                  </div>
                )}
              </div>
            )}

          </div>
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
