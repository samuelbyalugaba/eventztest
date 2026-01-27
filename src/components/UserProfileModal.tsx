import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X, MapPin, Calendar, Users, CheckCircle2, Star, Share2, Heart, Video, Play, MessageCircle } from 'lucide-react';
import { MediaViewer } from './MediaViewer';

interface UserProfile {
  name: string;
  type: 'Organizer' | 'Attendee' | 'Performer';
  followers: string;
  following: string;
  eventsHosted?: number;
  eventsAttended?: number;
  avatar: string;
  coverImage: string;
  bio: string;
  location: string;
  verified: boolean;
  joinedDate: string;
  email?: string;
  phone?: string;
  instagram?: string;
  twitter?: string;
  upcomingEvents?: {
    id: number;
    title: string;
    date: string;
    time?: string;
    image: string;
    attendees: number;
    location?: string;
    price?: string;
  }[];
  stats?: {
    totalEvents: number;
    totalAttendees: number;
    avgRating: number;
    reviewsCount: number;
  };
  highlights?: {
    id: number;
    image: string;
    title: string;
    date: string;
    attendees: number;
  }[];
  photos?: {
    id: number;
    image: string;
    size: 'small' | 'large';
  }[];
}

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
}

export function UserProfileModal({ user, onClose, onFollow, onMessage }: UserProfileModalProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'photos' | 'videos'>('events');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    if (onFollow) {
      onFollow();
    }
  };

  // Convert photos to format expected by MediaViewer
  const photosForViewer = user.photos?.map((photo, index) => ({
    id: photo.id,
    url: photo.image,
    likes: 0,
    eventName: `Event ${index + 1}`,
  })) || [];

  return (
    <>
      {/* User Profile Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          
          {/* Hero Section with Cover */}
          <div className="relative h-52 rounded-t-3xl overflow-hidden">
            <ImageWithFallback
              src={user.coverImage}
              alt={user.name}
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
              <div className="flex items-center gap-2">
                <h2 className="text-white drop-shadow-lg">{user.name}</h2>
                {user.verified && (
                  <CheckCircle2 className="w-5 h-5 text-white fill-[#8A2BE2]" />
                )}
              </div>
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-full transition-all ${
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
                  {user.type === 'Organizer' ? user.eventsHosted : user.eventsAttended || 0}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  {user.type === 'Organizer' ? 'Events' : 'Events Attended'}
                </div>
              </div>

              {/* Followers */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm">
                <div className="text-lg text-gray-900 font-bold">{user.followers}</div>
                <div className="text-xs text-gray-600 font-semibold">Followers</div>
              </div>
            </div>

            {/* Message Button */}
            {onMessage && (
              <button
                onClick={onMessage}
                className="w-full mb-6 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Message</span>
              </button>
            )}

            {/* About */}
            <div className="mb-6">
              <h3 className="text-gray-900 mb-2">About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
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
                {user.type === 'Organizer' && user.highlights && user.highlights.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-gray-900 mb-3">Past Event Highlights</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {user.highlights.map((highlight) => (
                        <div key={highlight.id} className="relative rounded-2xl overflow-hidden h-32 group cursor-pointer">
                          <ImageWithFallback
                            src={highlight.image}
                            alt={highlight.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-xs drop-shadow-lg">{highlight.title}</p>
                            <p className="text-white/80 text-[10px]">{highlight.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Memories - For Attendees */}
                {user.type === 'Attendee' && user.highlights && user.highlights.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-gray-900">Events Attended</h3>
                      <span className="text-gray-500 text-sm">{user.highlights.length} events</span>
                    </div>
                    <div className="space-y-3">
                      {user.highlights.slice(0, showAllEvents ? user.highlights.length : 6).map((highlight) => (
                        <div key={highlight.id} className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <ImageWithFallback
                              src={highlight.image}
                              alt={highlight.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-gray-900 text-sm mb-1 line-clamp-1">{highlight.title}</h4>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                              <Calendar className="w-3 h-3" />
                              <span>{highlight.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                              <Users className="w-3 h-3" />
                              <span>{highlight.attendees.toLocaleString()} attended</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* View All / Show Less Button */}
                    {user.highlights.length > 6 && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowAllEvents(!showAllEvents)}
                          className="w-full bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group border border-purple-200"
                        >
                          <span className="font-medium">
                            {showAllEvents ? 'Show Less' : `View All ${user.highlights.length} Events`}
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
                {user.type === 'Organizer' && user.upcomingEvents && user.upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-gray-900 mb-4">Upcoming Events</h3>
                    <div className="space-y-4">
                      {user.upcomingEvents.map((event) => (
                        <div key={event.id} className="flex gap-3">
                          {/* Event Image */}
                          <ImageWithFallback
                            src={event.image}
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
                {(!user.highlights || user.highlights.length === 0) && (!user.upcomingEvents || user.upcomingEvents.length === 0) && (
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
                {user.photos && user.photos.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900">Photos</h3>
                      <span className="text-gray-500 text-sm">{user.photos.length} photos</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {user.photos.map((photo) => (
                        <div 
                          key={photo.id} 
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaViewerIndex(user.photos!.indexOf(photo));
                            setMediaViewerType('photo');
                            setShowMediaViewer(true);
                          }}
                        >
                          <ImageWithFallback
                            src={photo.image}
                            alt={`Photo ${photo.id}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
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

          </div>
        </div>
      </div>
      
      {/* Media Viewer - Rendered completely outside modal DOM */}
      {showMediaViewer && user.photos && (
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