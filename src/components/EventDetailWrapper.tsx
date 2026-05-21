import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EventDetailModal } from './EventDetailModal';
import { getEventById, type Event as ApiEvent } from '../utils/supabase/api';
import { toast } from 'sonner';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { RouteFallback } from './skeletons/PageSkeletons';
import { getCachedEventDetail, setCachedEventDetail } from '../store/eventDetailCache';

interface EventDetailWrapperProps {
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
}

type RouteTarget = {
  pathname?: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

type EventRouteState = {
  backgroundLocation?: RouteTarget;
  closeTo?: RouteTarget;
  eventSnapshot?: ApiEvent;
};

const getImmediateEvent = (eventId: number | null, routeState: EventRouteState | null) => {
  if (!eventId || Number.isNaN(eventId)) return null;
  if (routeState?.eventSnapshot?.id === eventId) return routeState.eventSnapshot;
  return getCachedEventDetail(eventId);
};

export function EventDetailWrapper({ 
  onStartConversation
}: EventDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = id ? parseInt(id, 10) : null;
  const routeState = location.state as EventRouteState | null;
  const immediateEvent = getImmediateEvent(eventId, routeState);
  const [event, setEvent] = useState<ApiEvent | null>(immediateEvent);
  const [loading, setLoading] = useState(!immediateEvent);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const closeTarget = routeState?.closeTo || routeState?.backgroundLocation || { pathname: '/events' };

  const handleClose = () => {
    navigate({
      pathname: closeTarget.pathname || '/events',
      search: closeTarget.search || '',
      hash: closeTarget.hash || '',
    }, { replace: true, state: closeTarget.state });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchEvent = async () => {
      if (!eventId || Number.isNaN(eventId)) {
        navigate('/events', { replace: true });
        return;
      }

      const cachedOrSnapshot = getImmediateEvent(eventId, routeState);
      if (cachedOrSnapshot) {
        setEvent(cachedOrSnapshot);
        setCachedEventDetail(cachedOrSnapshot);
        setLoading(false);
      } else {
        setEvent(null);
        setLoading(true);
      }

      try {
        const fetchedEvent = await getEventById(eventId);
        if (cancelled) return;

        if (fetchedEvent) {
          setEvent(fetchedEvent);
          setCachedEventDetail(fetchedEvent);
        } else if (!cachedOrSnapshot) {
          toast.error('Event not found');
          navigate('/events', { replace: true });
        }
      } catch (error) {
        if (!cachedOrSnapshot) {
          toast.error('Failed to load event');
          navigate('/events', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId, location.state, navigate, routeState]);

  if (loading) {
    return <RouteFallback />;
  }

  if (!event) return null;

  return (
    <>
      <EventDetailModal
        event={event}
        onClose={handleClose}
        onPurchaseTicket={() => setShowTicketModal(true)}
        onPurchaseNormalTicket={() => setShowPurchaseModal(true)}
        onStartConversation={onStartConversation}
        onTierSelect={() => setShowPurchaseModal(true)}
      />

      {showPurchaseModal && (
        <SimplifiedTicketModal
          event={{
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            ticketTiers: event.ticket_tiers,
            price_range: event.price_range,
            image_url: event.image_url,
          }}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            window.dispatchEvent(new Event('savedEventsUpdated'));
          }}
        />
      )}

      {showTicketModal && (
        <VirtualTicketPurchaseModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={event}
        />
      )}
    </>
  );
}
