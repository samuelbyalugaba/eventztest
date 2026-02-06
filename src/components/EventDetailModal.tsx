import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, DollarSign, Share2, Bookmark, Users, X, Radio, Tv, Play, Eye, CheckCircle2, Star, Bell, Ticket } from 'lucide-react';
import { OrganizerProfile } from './OrganizerProfile';
import { toast } from 'sonner';
import { MediaViewer } from './MediaViewer';
import { LiveStreamViewer } from './LiveStreamViewer';
import { ShareModal } from './ShareModal';
import { handleShare } from '../utils/share';
import { supabase } from '../utils/supabase/client';
import { getEventAttendees, getPosts, toggleSaveEvent, incrementEventView, getOrganizerProfile, Event as ApiEvent } from '../utils/supabase/api';
import { validateYouTubeUrl, getYouTubeVideoId } from '../utils/sanitize';

export interface EventDetailModalProps {
  event: ApiEvent;
  onClose: () => void;
  onPurchaseTicket: (event: ApiEvent) => void;
  onPurchaseNormalTicket: (event: ApiEvent) => void;
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
  onTierSelect?: (event: ApiEvent) => void;
}

const locations = [
  { id: 'all', name: 'All Locations', flag: '🌍' },
  { id: 'atlanta', name: 'Atlanta, USA', flag: '🇺🇸' },
  { id: 'dar', name: 'Dar es Salaam, Tanzania', flag: '🇹🇿' },
  { id: 'zanzibar', name: 'Zanzibar, Tanzania', flag: '🇹🇿' },
  { id: 'newyork', name: 'New York, USA', flag: '🇺🇸' },
];

export function EventDetailModal({ event, onClose, onPurchaseTicket, onPurchaseNormalTicket, onStartConversation, onTierSelect }: EventDetailModalProps) {
  const [isSaved, setIsSaved] = useState(event.isSaved || false);
  
  const isEventPast = (() => {
    try {
      const dateStr = event.date;
      const timeStr = event.time ? event.time.replace(' ', '') : '23:59';
      return new Date(`${dateStr} ${timeStr}`) < new Date();
    } catch (e) {
      return false;
    }
  })();

  const [organizerDisplayName, setOrganizerDisplayName] = useState(event.organizer?.full_name || 'Organizer');
  const [recentAttendees, setRecentAttendees] = useState<any[]>([]);
  const [eventPosts, setEventPosts] = useState<any[]>([]);

  useEffect(() => {
    // Increment view count
    incrementEventView(event.id);

    const fetchOrganizerDetails = async () => {
      if (event.organizer_id) {
        try {
          const orgProfile = await getOrganizerProfile(event.organizer_id);
          if (orgProfile?.organizer_name) {
             setOrganizerDisplayName(orgProfile.organizer_name);
          }
        } catch (e) {
          console.error('Error fetching organizer profile:', e);
        }
      }
    };
    fetchOrganizerDetails();

    const fetchAttendees = async () => {
      try {
        const attendees = await getEventAttendees(event.id);
        setRecentAttendees(attendees || []);
      } catch (error) {
        console.error('Error fetching attendees:', error);
      }
    };
    fetchAttendees();

    const loadEventPosts = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const posts = await getPosts({ currentUserId: user?.id, eventId: event.id });
          setEventPosts(posts || []);
      } catch (err) {
          console.error('Error loading event posts:', err);
      }
    };
    loadEventPosts();
  }, [event.id]);

  const [showOrganizerProfile, setShowOrganizerProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [showLiveStream, setShowLiveStream] = useState(false);

  // Convert event highlights to format expected by MediaViewer
  const photosForViewer = [
    ...(event.event_highlights?.filter(h => h.mediaType === 'image').map((highlight, index) => ({
      id: index,
      url: highlight.image || event.image_url,
      eventName: event.title,
    })) || []),
    ...eventPosts.filter(p => p.image_urls && p.image_urls.length > 0).map((post, index) => ({
      id: 1000 + post.id,
      url: post.image_urls[0],
      likes: post.likes_count || 0,
      eventName: event.title,
      isPost: true,
      postId: post.id,
      isLiked: post.is_liked || false
    }))
  ];

  const videosForViewer = [
    ...(event.event_highlights?.filter(h => h.mediaType === 'video').map((highlight, _index) => ({
      id: _index + 500,
      thumbnail: highlight.image || event.image_url,
      videoUrl: highlight.video || '',
      eventName: event.title,
    })) || []),
    ...eventPosts.filter(p => p.video_url).map((post, _index) => ({
      id: 2000 + post.id,
      thumbnail: post.image_urls?.[0] || '',
      views: post.views || 0,
      likes: post.likes_count || 0,
      videoUrl: post.video_url,
      eventName: event.title,
      isPost: true,
      postId: post.id,
      isLiked: post.is_liked || false
    }))
  ];

  // Handle save/unsave event
  const handleToggleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save events');
        return;
      }

      const newSavedState = !isSaved;
      // Optimistic update
      setIsSaved(newSavedState);
      
      const saved = await toggleSaveEvent(event.id, user.id);
      
      // Verify server state matches optimistic update
      if (saved !== newSavedState) {
        setIsSaved(saved);
      }

      // Dispatch event to update Profile
      window.dispatchEvent(new Event('savedEventsUpdated'));

      toast.success(saved ? 'Event saved!' : 'Event removed from saved', {
        description: saved ? 'View in your profile under Saved Events' : 'Check your profile to see all saved events',
        duration: 2000,
      });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('savedEventsUpdated'));
    } catch (error) {
      console.error('Error toggling save:', error);
      setIsSaved(!isSaved); // Revert on error
      toast.error('Failed to update saved status');
    }
  };

  // Share function - uses native share API or fallback modal
  const handleShareEvent = async () => {
    const shared = await handleShare({
      title: event.title,
      text: `${event.date} at ${event.location}\nPrice: ${event.price_range}`,
      url: window.location.href,
    });
    
    // If native share not available, show custom modal
    if (!shared) {
      setShowShareModal(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      {/* Live Stream Viewer Overlay */}
      {showLiveStream && event.streaming && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => e.stopPropagation()}>
          <LiveStreamViewer 
            stream={{
              id: event.id,
              title: event.title,
              thumbnail: event.image_url,
              viewers: event.streaming.liveViewers,
              host: organizerDisplayName,
              quality: event.streaming.quality || 'HD',
              playback_url: event.streaming.playback_url
            }}
            onClose={() => setShowLiveStream(false)}
          />
        </div>
      )}

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-in slide-in-from-bottom max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 relative">
        {/* Cover Image with Overlays */}
        <div className="relative w-full h-96">
          <ImageWithFallback
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover rounded-t-3xl"
          />
          
          {/* Organizer Badge */}
          {event.organizer && (
            <button
              onClick={() => setShowOrganizerProfile(true)}
              className="absolute top-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg z-20 hover:bg-white transition-all cursor-pointer group"
            >
              <p className="text-gray-900 text-sm group-hover:text-[#8A2BE2] transition-colors">by {organizerDisplayName}</p>
            </button>
          )}
          
          {/* Organizer Profile Modal */}
          {showOrganizerProfile && event.organizer && (
            <OrganizerProfile
              organizerName={organizerDisplayName}
              organizerId={event.organizer_id || event.organizer.id}
              onClose={() => setShowOrganizerProfile(false)}
              onMessage={async (organizer) => {
                setShowOrganizerProfile(false);
                if (onStartConversation) {
                  await onStartConversation(organizer);
                }
              }}
              onTicketPurchase={onPurchaseTicket ? () => onPurchaseTicket(event) : undefined}
            />
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all shadow-lg z-20"
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
          
          {/* Minimal gradient overlay - poster fully visible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-t-3xl"></div>
        </div>

        <div className="px-6 py-6">
          {/* Event Title with Action Buttons - Professional Layout */}
          <div className="mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-gray-900 text-lg flex-1">{event.title}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleToggleSave}
                  className={`p-2 border rounded-lg transition-all ${
                    isSaved 
                      ? 'bg-purple-50 border-purple-600 text-purple-600' 
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isSaved ? 'Unsave event' : 'Save event'}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-purple-600' : ''}`} />
                </button>
                <button 
                  onClick={handleShareEvent}
                  className="p-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Share event"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Event Details Section - Professional Layout Below Image */}
          <div className="mb-6 space-y-4">
            {/* Date & Time */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Date & Time</p>
                <p className="text-gray-900">{event.date}</p>
                <p className="text-gray-700 text-sm">{event.time}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Location</p>
                <p className="text-gray-900">{event.location}</p>
                <p className="text-gray-700 text-sm">{locations.find(l => l.id === event.city)?.name}</p>
              </div>
            </div>
          </div>

          {/* About the Event */}
          <div className="mb-6">
            <h2 className="text-gray-900 mb-3">About the Event</h2>
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>

          {/* Event Photos & Highlights */}
          {event.event_highlights && event.event_highlights.length > 0 && (
            <div className="mb-6">
              <h2 className="text-gray-900 mb-3">Event Photos & Highlights</h2>
              <div className="grid grid-cols-3 gap-2">
                {event.event_highlights.map((highlight, idx) => (
                  <div 
                    key={idx} 
                    className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (highlight.mediaType === 'video') {
                        const videoIndex = event.event_highlights!.filter(h => h.mediaType === 'video').findIndex(h => h === highlight);
                        setMediaViewerIndex(videoIndex);
                        setMediaViewerType('video');
                      } else {
                        const photoIndex = event.event_highlights!.filter(h => h.mediaType === 'image').findIndex(h => h === highlight);
                        setMediaViewerIndex(photoIndex);
                        setMediaViewerType('photo');
                      }
                      setShowMediaViewer(true);
                    }}
                  >
                    {highlight.mediaType === 'video' ? (
                      <>
                        {validateYouTubeUrl(highlight.video || '') ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeVideoId(highlight.video || '')}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                            style={{ border: 'none', pointerEvents: 'none' }}
                          />
                        ) : (
                          <>
                            <video
                              src={highlight.video}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md group-hover:bg-white transition-colors">
                                <Play className="w-3 h-3 text-gray-900 ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <ImageWithFallback
                        src={highlight.image!}
                        alt={highlight.caption}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price & Attendees Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Ticket Price</p>
                <p className="text-gray-900">{event.price_range}</p>
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <Users className="w-5 h-5" />
                <span className="text-sm">{(event.attendees || 0).toLocaleString()} attending</span>
              </div>
            </div>
          </div>

          {/* Ticket Tiers Section - DYNAMIC PRICING */}
          {event.ticket_tiers && event.ticket_tiers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Ticket Options
              </h3>
              <div className="space-y-3">
                {event.ticket_tiers.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-colors group">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{tier.name}</span>
                        {tier.available < 10 && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                            Only {tier.available} left
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-2">
                        {tier.features.slice(0, 2).map((feature, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {feature}
                          </span>
                        ))}
                        {tier.features.length > 2 && (
                          <span className="text-xs text-gray-400">+{tier.features.length - 2} more</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="block text-lg font-bold text-purple-600">{tier.price}</span>
                      <button
                        onClick={() => !isEventPast && onTierSelect && onTierSelect(event, tier.name)}
                        disabled={isEventPast}
                        className={`px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors ${isEventPast ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HD Live Streaming Section - CORE DIFFERENTIATOR */}
          {event.streaming?.available ? (
            <div className="mb-6 border-2 border-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 via-white to-cyan-50">
              {/* Streaming Header */}
              <div className="bg-gradient-to-r from-purple-600 to-cyan-500 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Tv className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white mb-1">HD Live Streaming Available</h2>
                      <p className="text-white/90 text-sm">Watch from anywhere in the world</p>
                    </div>
                  </div>
                  {event.streaming.isLive && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full animate-pulse">
                      <Radio className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">LIVE</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                {/* Live Viewer Count */}
                {event.streaming.isLive && event.streaming.liveViewers && event.streaming.liveViewers > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-purple-100 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-600" />
                    <span className="text-purple-900">{event.streaming.liveViewers.toLocaleString()} people watching now</span>
                  </div>
                )}

                {/* Streaming Quality & Price */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-white rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <Tv className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-900">Quality</span>
                    </div>
                    <p className="text-purple-600">{event.streaming.quality} Streaming</p>
                  </div>
                  
                  <div className="p-4 bg-white rounded-xl border border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-900">Virtual Ticket</span>
                    </div>
                    <p className="text-cyan-600">{event.streaming.virtualPrice}</p>
                  </div>
                </div>

                {/* Streaming Features */}
                {event.streaming.features && event.streaming.features.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-900 mb-3">Streaming Features</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {event.streaming.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Replay Availability */}
                {event.streaming.replayAvailable && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg mb-4">
                    <Play className="w-5 h-5 text-pink-600" />
                    <span className="text-gray-900">Replay available for 48 hours after event</span>
                  </div>
                )}

                {/* Virtual Ticket CTA */}
                  <button 
                    onClick={() => !isEventPast && onPurchaseTicket(event)}
                    disabled={isEventPast}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-700 hover:to-cyan-600'}`}
                  >
                    <Tv className="w-5 h-5" />
                    <span>{isEventPast ? 'Event Ended' : `Get Virtual Ticket - ${event.streaming.virtualPrice}`}</span>
                  </button>

                {/* Info Badge */}
                <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                  <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">i</div>
                  <p>You'll receive an email with your unique access link immediately after purchase.</p>
                </div>
              </div>
            </div>
          ) : (
            (!event.ticket_tiers || event.ticket_tiers.length === 0) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">Get Tickets</h3>
                {(event as any).ticketsSold && (event as any).ticketsSold > 100 && (
                  <span className="text-orange-500 text-sm font-medium animate-pulse">Selling fast! 🔥</span>
                )}
              </div>
              
              <div className="space-y-3">
                {/* Standard Ticket */}
                <button
                  onClick={() => !isEventPast && onPurchaseNormalTicket(event)}
                  disabled={isEventPast}
                  className={`w-full bg-white border-2 border-purple-100 rounded-xl p-4 flex items-center justify-between transition-all shadow-sm group ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-600 hover:shadow-md'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                      <Ticket className="w-5 h-5 text-purple-600 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-900 font-medium">Standard Entry</p>
                      <p className="text-gray-500 text-xs">General admission access</p>
                    </div>
                  </div>
                  <span className="text-purple-600 font-bold">{event.price_range}</span>
                </button>
                
                {/* VIP Ticket Option - If applicable */}
                {(event as any).vipPrice && (
                  <button
                    onClick={() => !isEventPast && onPurchaseTicket(event)}
                    disabled={isEventPast}
                    className={`w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-4 flex items-center justify-between transition-all transform ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">VIP Experience</p>
                        <p className="text-gray-400 text-xs">Premium access & perks</p>
                      </div>
                    </div>
                    <span className="text-yellow-400 font-bold">{(event as any).vipPrice}</span>
                  </button>
                )}
              </div>
            </div>
            )
          )}

          {/* Spacer */}
          <div className="h-6"></div>
        </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="p-4 border-t border-gray-100 bg-white flex gap-3 z-30 rounded-b-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           {event.streaming?.isLive ? (
             <button 
               onClick={() => setShowLiveStream(true)}
               className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 animate-pulse shadow-lg shadow-red-200"
             >
               <Tv className="w-5 h-5" />
               Watch Live
             </button>
           ) : (
             !isEventPast && (
               <button 
                 onClick={() => onPurchaseNormalTicket(event)}
                 className="flex-1 bg-[#8A2BE2] text-white py-3 rounded-xl font-medium hover:bg-[#7b26c9] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
               >
                 <Ticket className="w-5 h-5" />
                 {event.price_range === 'Free' ? 'Register' : `Get Tickets - ${event.price_range}`}
               </button>
             )
           )}
           
           {isEventPast && (
              <div className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium text-center cursor-not-allowed">
                Event Ended
              </div>
           )}

           <button 
              onClick={handleToggleSave}
              className={`w-14 bg-white border-2 ${isSaved ? 'border-[#FF4081] bg-[#FF4081]/10' : 'border-gray-200'} text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all`}
            >
              <Bell className={`w-6 h-6 ${isSaved ? 'fill-[#FF4081] text-[#FF4081]' : 'text-gray-400'}`} />
            </button>
        </div>

        {/* Media Viewer - Rendered outside modal for engaging photo/video viewing */}
        {showMediaViewer && event.event_highlights && (
          <MediaViewer
            media={mediaViewerType === 'photo' ? photosForViewer : videosForViewer}
            initialIndex={mediaViewerIndex}
            onClose={() => setShowMediaViewer(false)}
            type={mediaViewerType}
          />
        )}

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={event.title}
          text={`${event.date} at ${event.location}\nPrice: ${event.price_range}`}
          url={window.location.href}
        />
      </div>
    </div>
  );
}
