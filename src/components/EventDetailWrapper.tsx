import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EventDetailModal } from './EventDetailModal';
import { getEventById, type Event as ApiEvent } from '../utils/supabase/api';
import { toast } from 'sonner';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { queryClient } from '../queryClient';
import { DetailPageSkeleton } from './skeletons/PageSkeletons';

const EVENT_DETAIL_KEY = (id: number) => ['event', 'detail', id] as const;

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

export function EventDetailWrapper({ 
  onStartConversation
}: EventDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = id ? parseInt(id, 10) : null;
  const routeState = location.state as EventRouteState | null;

  const routeSnapshot = eventId && routeState?.eventSnapshot?.id === eventId
    ? routeState.eventSnapshot
    : undefined;

  const { data: event, isPending: loading, isError } = useQuery({
    queryKey: EVENT_DETAIL_KEY(eventId!),
    queryFn: () => getEventById(eventId!),
    enabled: eventId !== null && !Number.isNaN(eventId),
    initialData: routeSnapshot,
    staleTime: 60_000,
    retry: 1,
  });

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
    if (!eventId || Number.isNaN(eventId)) {
      navigate('/events', { replace: true });
    }
  }, [eventId, navigate]);

  useEffect(() => {
    if (loading) return;
    if (isError) {
      if (!event) {
        toast.error('Failed to load event');
        navigate('/events', { replace: true });
      }
      return;
    }
    if (event === null) {
      toast.error('Event not found');
      navigate('/events', { replace: true });
    }
  }, [loading, isError, event, navigate]);

  if (loading) {
    return <DetailPageSkeleton />;
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
            queryClient.invalidateQueries({ queryKey: ['profile'] });
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
