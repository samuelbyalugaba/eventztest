import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EventDetailModal } from './EventDetailModal';
import { getEventById } from '../utils/supabase/api';
import { toast } from 'sonner';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { RouteFallback } from './skeletons/PageSkeletons';

interface EventDetailWrapperProps {
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
}

type RouteTarget = {
  pathname?: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

export function EventDetailWrapper({ 
  onStartConversation
}: EventDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const routeState = location.state as { backgroundLocation?: RouteTarget; closeTo?: RouteTarget } | null;
  const closeTarget = routeState?.closeTo || routeState?.backgroundLocation || { pathname: '/events' };

  const handleClose = () => {
    navigate({
      pathname: closeTarget.pathname || '/events',
      search: closeTarget.search || '',
      hash: closeTarget.hash || '',
    }, { replace: true, state: closeTarget.state });
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const fetchedEvent = await getEventById(parseInt(id));
        if (fetchedEvent) {
          setEvent(fetchedEvent);
        } else {
          toast.error('Event not found');
          navigate('/events', { replace: true });
        }
      } catch (error) {
        toast.error('Failed to load event');
        navigate('/events', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

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
