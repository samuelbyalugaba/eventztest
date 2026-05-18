import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, DollarSign, Share2, Bookmark, Users, Tv, Play, Eye, Bell, Ticket, ChevronLeft, Sparkles } from 'lucide-react';
import { formatDateDMY } from '../utils/format';
import { toast } from 'sonner';
import { MediaViewer } from './MediaViewer';
import { LiveStreamViewerNew as LiveStreamViewer } from './livestream/LiveStreamViewerNew';
import { ShareModal } from './ShareModal';
import { handleShare } from '../utils/share';
import { supabase } from '../utils/supabase/client';
import { getPosts, toggleSaveEvent, incrementEventView, getProfile, hasActiveVirtualTicket, type Event as ApiEvent } from '../utils/supabase/api';
import { validateYouTubeUrl, getYouTubeVideoId } from '../utils/sanitize';
import { extractCurrencyFromPrice, currencies, formatPrice } from '../utils/currencies';

export interface EventDetailModalProps {
  event: ApiEvent;
  onClose: () => void;
  onPurchaseTicket: (event: ApiEvent) => void;
  onPurchaseNormalTicket: (event: ApiEvent) => void;
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
  onTierSelect?: (event: ApiEvent, tierName: string) => void;
}

const locations = [
  { id: 'all', name: 'All Locations', flag: '' },
  { id: 'atlanta', name: 'Atlanta, USA', flag: '' },
  { id: 'dar', name: 'Dar es Salaam, Tanzania', flag: '' },
  { id: 'zanzibar', name: 'Zanzibar, Tanzania', flag: '' },
  { id: 'newyork', name: 'New York, USA', flag: '' },
];

export function EventDetailModal({ event, onClose, onPurchaseTicket, onPurchaseNormalTicket, onTierSelect }: EventDetailModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSaved, setIsSaved] = useState(event.isSaved || false);
  const [hasVirtualAccess, setHasVirtualAccess] = useState(false);
  const [isCheckingVirtualAccess, setIsCheckingVirtualAccess] = useState(false);
  const virtualPriceNumber = (() => {
    const priceString = event.streaming?.virtualPrice || '0';
    return parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
  })();
  const requiresVirtualAccess = !!event.streaming?.available && virtualPriceNumber > 0;
  
  const isEventPast = (() => {
    try {
      const dateStr = event.date;
      const timeStr = event.time ? event.time.replace(' ', '') : '23:59';
      return new Date(`${dateStr} ${timeStr}`) < new Date();
    } catch (e) {
      return false;
    }
  })();

  const [organizerDisplayName, setOrganizerDisplayName] = useState(event.organizer?.full_name || 'Event Organizer');
  const [eventPosts, setEventPosts] = useState<any[]>([]);

  // Extract the event's currency from price_range or virtualPrice to ensure consistency
  const getEventCurrency = (): string => {
    // Try to get currency from virtualPrice first (most specific)
    if (event.streaming?.virtualPrice) {
      const code = extractCurrencyFromPrice(event.streaming.virtualPrice);
      return code;
    }
    // Then try price_range
    if (event.price_range) {
      const code = extractCurrencyFromPrice(event.price_range);
      return code;
    }
    // Then try ticket tiers
    if (event.ticket_tiers && event.ticket_tiers.length > 0) {
      const code = extractCurrencyFromPrice(event.ticket_tiers[0].price);
      return code;
    }
    // Default to TZS
    return 'TZS';
  };

  // Format price using the event's currency for consistency
  const formatEventPrice = (price: string | number | null | undefined, allowTierFallback: boolean = true): string => {
    if (price === null || price === undefined) return 'Free';
    
    // Handle number inputs directly
    if (typeof price === 'number') {
      if (price === 0 || Number.isNaN(price)) return 'Free';
      const eventCurrencyCode = getEventCurrency();
      const currency = currencies.find(c => c.code === eventCurrencyCode);
      const symbol = currency ? currency.symbol : 'TSh';
      return `${symbol} ${price.toLocaleString()}`;
    }
    
    const priceStr = String(price).trim();
    
    // Only return "Free" if explicitly "free"
    if (priceStr.toLowerCase() === 'free') {
      return 'Free';
    }
    
    // If empty string, return Free (unless we can calculate from tiers)
    if (priceStr === '') {
      if (!allowTierFallback || !event.ticket_tiers || event.ticket_tiers.length === 0) {
        return 'Free';
      }
      // Continue to calculate from tiers below if tiers exist
    }
    
    // Extract numeric value (remove all non-numeric except decimal point)
    const numeric = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    
    // Only return Free if numeric is explicitly 0 AND the string represents just "0"
    // Don't return Free for empty strings here - handle that above
    if (numeric === 0 && priceStr !== '' && priceStr.match(/^[\s0.]+$/)) {
      return 'Free';
    }
    // If empty but has ticket tiers, try to calculate from tiers
    if (allowTierFallback && priceStr === '' && event.ticket_tiers && event.ticket_tiers.length > 0) {
      // Calculate from tiers
      const prices = event.ticket_tiers.map(t => {
        const tierPrice = parseFloat(String(t.price).replace(/[^0-9.]/g, '')) || 0;
        return tierPrice;
      }).filter(p => p > 0);
      
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const eventCurrencyCode = getEventCurrency();
        const currency = currencies.find(c => c.code === eventCurrencyCode);
        const symbol = currency ? currency.symbol : 'TSh';
        return min === max ? `${symbol} ${min.toLocaleString()}` : `${symbol} ${min.toLocaleString()} - ${symbol} ${max.toLocaleString()}`;
      }
    }
    
    // Check if it's a price range (contains " - " or "-" but not at the start)
    const hasDash = priceStr.includes(' - ') || priceStr.includes('-');
    const dashIndex = priceStr.indexOf('-');
    const isRange = hasDash && dashIndex > 0;
    
    if (isRange) {
      // Handle price ranges like "TSh 2,500 - 70,000" or "$ 100 - $ 200"
      // Split on " - " first, then try single "-" if needed
      let parts = priceStr.split(' - ');
      if (parts.length === 1) {
        parts = priceStr.split(/\s*-\s*/);
      }
      if (parts.length === 2) {
        // Format each part separately
        const formattedParts = parts.map(part => {
          const trimmed = part.trim();
          // Check if part already has currency
          const hasCurrency = currencies.some(c => 
            trimmed.includes(c.symbol) || trimmed.includes(c.code)
          );
          
          if (hasCurrency) {
            return formatPrice(trimmed);
          } else {
            // Extract numeric value
            const numeric = parseFloat(trimmed.replace(/[^0-9.]/g, '')) || 0;
            if (!numeric || Number.isNaN(numeric)) return trimmed;
            
            // Use event's currency
            const eventCurrencyCode = getEventCurrency();
            const currency = currencies.find(c => c.code === eventCurrencyCode);
            const symbol = currency ? currency.symbol : 'TSh';
            return `${symbol} ${numeric.toLocaleString()}`;
          }
        });
        return formattedParts.join(' - ');
      }
    }
    
    // Single price - check if price already has currency
    const hasCurrency = currencies.some(c => 
      priceStr.includes(c.symbol) || priceStr.includes(c.code)
    );
    
    // If price already has currency, use formatPrice (preserves it)
    if (hasCurrency) {
      return formatPrice(price);
    }
    
    // Otherwise, use the numeric value already extracted above
    // Only return Free if numeric is explicitly 0 or NaN
    // (We already checked for explicit "0" strings above, so numeric === 0 here means it's a valid 0)
    if (Number.isNaN(numeric)) {
      return 'Free';
    }
    
    // If numeric is 0, it's a free tier (already handled above, but double-check)
    if (numeric === 0) {
      return 'Free';
    }
    
    // Format with event's currency
    const eventCurrencyCode = getEventCurrency();
    const currency = currencies.find(c => c.code === eventCurrencyCode);
    const symbol = currency ? currency.symbol : 'TSh';
    
    return `${symbol} ${numeric.toLocaleString()}`;
  };

  useEffect(() => {
    // Increment view count
    incrementEventView(event.id);

    const fetchOrganizerDetails = async () => {
      if (event.organizer_id) {
        try {
          const profile = await getProfile(event.organizer_id);
          if (profile && profile.full_name) {
             setOrganizerDisplayName(profile.full_name);
          }
        } catch (e) {
        }
      }
    };
    fetchOrganizerDetails();

    const loadEventPosts = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const posts = await getPosts({ currentUserId: user?.id, eventId: event.id });
          setEventPosts(posts || []);
      } catch (err) {
      }
    };
    loadEventPosts();
  }, [event.id, event.organizer_id]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!requiresVirtualAccess) {
        setHasVirtualAccess(true);
        return;
      }
      setIsCheckingVirtualAccess(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasVirtualAccess(false);
          return;
        }
        const ok = await hasActiveVirtualTicket(user.id, event.id);
        setHasVirtualAccess(ok);
      } catch {
        setHasVirtualAccess(false);
      } finally {
        setIsCheckingVirtualAccess(false);
      }
    };
    checkAccess();
  }, [event.id, requiresVirtualAccess]);

  useEffect(() => {
    const onPurchased = (e: Event) => {
      const eventId = (e as any)?.detail?.eventId;
      if (Number(eventId) !== Number(event.id)) return;
      setHasVirtualAccess(true);
    };
    window.addEventListener('virtualAccessPurchased', onPurchased as EventListener);
    return () => window.removeEventListener('virtualAccessPurchased', onPurchased as EventListener);
  }, [event.id]);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [showLiveStream, setShowLiveStream] = useState(false);

  const handleOrganizerProfileClick = () => {
    if (!event.organizer_id) return;

    const routeState = location.state as {
      backgroundLocation?: { pathname?: string; search?: string; hash?: string; state?: unknown };
      closeTo?: { pathname?: string; search?: string; hash?: string; state?: unknown };
    } | null;
    const closeTo = routeState?.closeTo || routeState?.backgroundLocation || { pathname: '/events' };
    const returnToEvent = location.pathname.startsWith('/event/')
      ? {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          state: { closeTo },
        }
      : { pathname: `/event/${event.id}`, state: { closeTo } };

    navigate(`/profile/${event.organizer_id}`, {
      replace: true,
      state: { returnToEvent },
    });
  };

  // Convert event highlights to format expected by MediaViewer
  const photosForViewer = [
    ...(event.event_highlights?.filter(h => h.mediaType === 'image').map((highlight, index) => ({
      id: index,
      url: highlight.image || event.image_url,
      eventName: event.title,
    })) || []),
    ...eventPosts.filter(p => p.image_urls && p.image_urls.length > 0).flatMap((post) => 
      post.image_urls.map((url: string, imgIndex: number) => ({
        id: post.id * 1000 + imgIndex,
        url: url,
        likes: post.likes_count || 0,
        eventName: event.title,
        isPost: true,
        postId: post.id,
        isLiked: post.is_liked || false
      }))
    )
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
      setIsSaved(!isSaved); // Revert on error
      toast.error('Failed to update saved status');
    }
  };

  // Share function - uses native share API or fallback modal
  const handleShareEvent = async () => {
    // Construct deep link URL
    const eventUrl = `${window.location.origin}/event/${event.id}`;

    const shared = await handleShare({
      title: event.title,
      text: `${event.date} at ${event.location}\nPrice: ${formatPrice(event.price_range)}`,
      url: eventUrl,
    });
    
    // If native share not available, show custom modal
    if (!shared) {
      setShowShareModal(true);
    }
  };
  
  const handleWatchLive = async () => {
    if (!event.streaming?.isLive) return;
    if (requiresVirtualAccess && !hasVirtualAccess) {
      onPurchaseTicket(event);
      toast.error('Virtual Access required to watch this live stream');
      return;
    }
    setShowLiveStream(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-right duration-300 flex flex-col">
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
              playback_url: event.streaming.playback_url,
              organizer_id: event.organizer_id || event.organizer?.id || 'unknown'
            }}
            onClose={() => setShowLiveStream(false)}
          />
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-white pb-6">
        {/* Cover Image with Overlays */}
        <div className="relative w-full h-96">
          <ImageWithFallback
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          
          {/* Back Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all shadow-lg z-20"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </button>

          {/* Share Button (moved to top right for better reachability) */}
          <button
            onClick={handleShareEvent}
            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all shadow-lg z-20"
          >
            <Share2 className="w-5 h-5 text-gray-900" />
          </button>
          
          {/* Minimal gradient overlay - poster fully visible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        </div>

        <div className="px-6 py-6">
          {/* Event Title with Action Buttons - Professional Layout */}
          <div className="mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-gray-900 text-2xl font-bold">{event.title}</h2>
                {(event.organizer || event.organizer_id) && (
                  <button
                    onClick={handleOrganizerProfileClick}
                    className="mt-2 text-sm text-gray-600 hover:text-[#8A2BE2] transition-colors text-left"
                  >
                    by <span className="font-semibold text-purple-600">{organizerDisplayName}</span>
                  </button>
                )}
              </div>
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
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-purple-600' : ''}`} />
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
                <p className="text-gray-900">{formatDateDMY(event.date)}</p>
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
                <p className="text-gray-900">{formatEventPrice(event.price_range)}</p>
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
                Ticket Prices
              </h3>
              <div className="space-y-2">
                {event.ticket_tiers.map((tier, index) => (
                  <div 
                    key={index} 
                    onClick={() => onTierSelect && onTierSelect(event, tier.name)}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <Ticket className="w-4 h-4" />
                       </div>
                       <div>
                        <span className="font-medium text-gray-900 block">{tier.name}</span>
                        {tier.available < 10 && (
                          <span className="text-xs text-red-500 font-medium">
                            Only {tier.available} left
                          </span>
                        )}
                       </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      {(() => {
                        // Try to use priceNumeric if available (more reliable)
                        if (tier.priceNumeric !== undefined && tier.priceNumeric !== null && !isNaN(tier.priceNumeric)) {
                          if (tier.priceNumeric === 0) return 'Free';
                          const eventCurrencyCode = getEventCurrency();
                          const currency = currencies.find(c => c.code === eventCurrencyCode);
                          const symbol = currency ? currency.symbol : 'TSh';
                          return `${symbol} ${tier.priceNumeric.toLocaleString()}`;
                        }
                        // Fallback to tier.price string
                        return formatEventPrice(tier.price);
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HD Live Streaming Section - CORE DIFFERENTIATOR */}
          {event.streaming?.available && (
            <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Tv className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold text-sm">Virtual Access</h3>
                    <p className="text-gray-500 text-xs">HD Live Stream</p>
                  </div>
                </div>
                {event.streaming.isLive && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-600 rounded-full">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-xs font-medium">LIVE</span>
                  </div>
                )}
              </div>

              {/* Live Viewer Count */}
              {event.streaming.isLive && (event.streaming.liveViewers || 0) > 0 && (
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span>{(event.streaming.liveViewers ?? 0).toLocaleString()} watching now</span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-xl border border-gray-100">
                <span className="text-gray-600 text-sm">Virtual Ticket</span>
                <span className="text-gray-900 font-semibold">{formatEventPrice(event.streaming.virtualPrice, false)}</span>
              </div>

              {/* Virtual Ticket CTA */}
              {requiresVirtualAccess ? (
                <button 
                  onClick={() => !isEventPast && onPurchaseTicket(event)}
                  disabled={isEventPast}
                  className={`w-full bg-gray-900 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                >
                  <Tv className="w-4 h-4" />
                  <span className="text-sm font-medium">{isEventPast ? 'Event Ended' : hasVirtualAccess ? 'Access Granted' : 'Get Access'}</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (!isEventPast) {
                      setHasVirtualAccess(true);
                      if (event.streaming?.isLive) {
                        setShowLiveStream(true);
                      } else {
                        toast.success('Free virtual access granted!');
                      }
                    }
                  }}
                  disabled={isEventPast}
                  className={`w-full bg-gray-900 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                >
                  <Tv className="w-4 h-4" />
                  <span className="text-sm font-medium">{isEventPast ? 'Event Ended' : event.streaming?.isLive ? 'Watch Live' : 'Free Access'}</span>
                </button>
              )}
            </div>
          )}

          {(!event.ticket_tiers || event.ticket_tiers.length === 0) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">Get Tickets</h3>
                {(event as any).ticketsSold && (event as any).ticketsSold > 100 && (
                  <span className="text-orange-500 text-sm font-medium animate-pulse">Selling fast</span>
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
                  <span className="text-purple-600 font-bold">{formatEventPrice(event.price_range)}</span>
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
                        <Sparkles className="w-5 h-5 text-yellow-400" />
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
          )}

          {/* Spacer */}
          <div className="h-6"></div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="p-4 border-t border-gray-100 bg-white flex gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 safe-area-bottom">
         {event.streaming?.isLive ? (
           <button 
             onClick={handleWatchLive}
             disabled={isCheckingVirtualAccess}
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
              {event.price_range === 'Free' ? 'Register' : 'Get Tickets Now'}
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
        text={`${event.date} at ${event.location}\nPrice: ${formatPrice(event.price_range)}`}
        url={`${window.location.origin}/event/${event.id}`}
      />
    </div>
  );
}
