import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getPosts, getProfile, hasActiveVirtualTicket, toggleSaveEvent, incrementEventView } from '../utils/supabase/api';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { handleShare } from '../utils/share';
import { formatPrice } from '../utils/currencies';
import { formatEventPrice } from '../utils/eventPriceFormat';

export function useEventDetailModal(event: ApiEvent, onPurchaseTicket: (event: ApiEvent) => void) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSaved, setIsSaved] = useState(event.isSaved || false);
  const [coverAspectRatio, setCoverAspectRatio] = useState(4 / 5);
  const [hasVirtualAccess, setHasVirtualAccess] = useState(false);
  const [isCheckingVirtualAccess, setIsCheckingVirtualAccess] = useState(false);

  const virtualPriceNumber = (() => {
    const priceString = event.streaming?.virtualPrice || '0';
    return parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
  })();

  const requiresVirtualAccess = !!event.streaming?.available && virtualPriceNumber > 0;

  const externalTicketing = !!(
    event.streaming?.features?.includes('external_ticketing') ||
    event.streaming?.externalTicketing?.enabled
  );

  const externalTicketingPhone = String(
    event.streaming?.externalTicketing?.phone ||
    (event.streaming as any)?.externalTicketingPhone ||
    event.organizer?.phone ||
    ''
  ).trim();

  const externalTicketingHref = externalTicketingPhone
    ? `tel:${externalTicketingPhone.replace(/[^\d+]/g, '')}`
    : '';

  const handleExternalTicketing = () => {
    if (externalTicketingHref) {
      window.location.href = externalTicketingHref;
      return;
    }
    toast.info('Contact the organizer for ticketing details');
  };

  const isEventPast = (() => {
    try {
      const dateStr = event.date;
      const timeStr = event.time ? event.time.replace(' ', '') : '23:59';
      return new Date(`${dateStr} ${timeStr}`) < new Date();
    } catch {
      return false;
    }
  })();

  const [organizerDisplayName, setOrganizerDisplayName] = useState(
    event.organizer?.full_name || 'Event Organizer',
  );
  const [eventPosts, setEventPosts] = useState<any[]>([]);
  const [displayViews, setDisplayViews] = useState(Number(event.views) || 0);
  const incrementedViewEventRef = useRef<number | null>(null);

  const isFreeEvent = formatEventPrice(event, event.price_range).toLowerCase() === 'free';

  const locationMapsUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : '';

  useEffect(() => {
    setCoverAspectRatio(4 / 5);
  }, [event.id, event.image_url]);

  useEffect(() => {
    setDisplayViews(Number(event.views) || 0);
  }, [event.id, event.views]);

  useEffect(() => {
    if (incrementedViewEventRef.current === event.id) return;
    incrementedViewEventRef.current = event.id;
    setDisplayViews((current) => current + 1);
    void incrementEventView(event.id);
  }, [event.id]);

  useEffect(() => {
    const fetchOrganizerDetails = async () => {
      if (event.organizer_id) {
        try {
          const profile = await getProfile(event.organizer_id);
          if (profile && profile.full_name) {
            setOrganizerDisplayName(profile.full_name);
          }
        } catch {}
      }
    };
    fetchOrganizerDetails();

    const loadEventPosts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const posts = await getPosts({ currentUserId: user?.id, eventId: event.id });
        setEventPosts(posts || []);
      } catch {}
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
      } catch (error) {
        console.error('Failed to check virtual access:', error);
        toast.error('Failed to load event details');
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
      eventSnapshot?: ApiEvent;
    } | null;

    const closeTo = routeState?.closeTo || routeState?.backgroundLocation || { pathname: '/events' };
    const eventRouteState = {
      ...routeState,
      closeTo,
      eventSnapshot: event,
    };
    const returnToEvent = location.pathname.startsWith('/event/')
      ? {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          state: eventRouteState,
        }
      : { pathname: `/event/${event.id}`, state: eventRouteState };

    navigate(`/profile/${event.organizer_id}`, {
      state: { returnToEvent },
    });
  };

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
        isLiked: post.is_liked || false,
      })),
    ),
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
      isLiked: post.is_liked || false,
    })),
  ];

  const handleToggleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save events');
        return;
      }

      const newSavedState = !isSaved;
      setIsSaved(newSavedState);

      const saved = await toggleSaveEvent(event.id, user.id);

      if (saved !== newSavedState) {
        setIsSaved(saved);
      }

      window.dispatchEvent(new Event('savedEventsUpdated'));

      toast.success(saved ? 'Event saved!' : 'Event removed from saved', {
        description: saved ? 'View in your profile under Saved Events' : 'Check your profile to see all saved events',
        duration: 2000,
      });

      window.dispatchEvent(new Event('savedEventsUpdated'));
    } catch (error) {
      setIsSaved(!isSaved);
      toast.error('Failed to update saved status');
    }
  };

  const handleShareEvent = async () => {
    const eventUrl = `${window.location.origin}/event/${event.id}`;

    const shared = await handleShare({
      title: event.title,
      text: `${event.date} at ${event.location}\nPrice: ${formatPrice(event.price_range)}`,
      url: eventUrl,
    });

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

  return {
    isSaved,
    coverAspectRatio,
    setCoverAspectRatio,
    hasVirtualAccess,
    isCheckingVirtualAccess,
    requiresVirtualAccess,
    externalTicketing,
    externalTicketingPhone,
    externalTicketingHref,
    handleExternalTicketing,
    isEventPast,
    isFreeEvent,
    organizerDisplayName,
    eventPosts,
    displayViews,
    showShareModal,
    setShowShareModal,
    showMediaViewer,
    setShowMediaViewer,
    mediaViewerIndex,
    setMediaViewerIndex,
    mediaViewerType,
    setMediaViewerType,
    showLiveStream,
    setShowLiveStream,
    handleOrganizerProfileClick,
    photosForViewer,
    videosForViewer,
    handleToggleSave,
    handleShareEvent,
    handleWatchLive,
    locationMapsUrl,
  };
}
