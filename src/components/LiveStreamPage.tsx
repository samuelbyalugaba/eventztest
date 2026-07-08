import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveStreamViewerNew as LiveStreamViewer } from './livestream/LiveStreamViewerNew';
import { EventDetailModal } from './EventDetailModal';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { getEventById, hasActiveVirtualTicket, type Event as ApiEvent } from '../utils/supabase/api';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { queryClient } from '../queryClient';
import { LivePageSkeleton } from './skeletons/PageSkeletons';

export function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const fetchedEvent = await getEventById(parseInt(id));
        if (fetchedEvent) {
          setEvent(fetchedEvent as unknown as ApiEvent);
          const eventData = fetchedEvent as any;
          const isLive = eventData.streaming?.isLive === true;
          if (isLive) {
            const priceString = eventData.streaming?.virtualPrice ?? '';
            const priceNumber = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
            if (priceNumber <= 0) {
              setShowViewer(true);
            } else {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const hasAccess = await hasActiveVirtualTicket(user.id, parseInt(id));
                if (hasAccess) {
                  setShowViewer(true);
                }
              }
            }
          }
        } else {
          toast.error('Event not found');
          navigate('/live');
        }
      } catch (error) {
        console.error('Failed to load stream:', error);
        toast.error('Failed to load stream');
        navigate('/live');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  const handlePurchaseTicket = (_event: ApiEvent) => {
    setShowTicketModal(true);
  };

  if (loading) {
    return <LivePageSkeleton />;
  }

  if (!event) return null;

  if (showViewer) {
    const eventData = event as any;
    return (
      <LiveStreamViewer
        stream={{
          id: event.id,
          title: event.title,
          thumbnail: event.image_url,
          viewers: eventData.streaming?.liveViewers || 0,
          host: eventData.organizer?.full_name || 'Event Organizer',
          host_avatar: eventData.organizer?.avatar_url,
          quality: eventData.streaming?.quality || 'HD',
          playback_url: eventData.streaming?.playback_url,
          organizer_id: event.organizer_id || eventData.organizer?.id || 'unknown',
        }}
        onClose={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate('/live');
          }
        }}
      />
    );
  }

  return (
    <>
      <EventDetailModal
        event={event}
        onClose={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate('/live');
          }
        }}
        onPurchaseTicket={handlePurchaseTicket}
        onPurchaseNormalTicket={() => setShowPurchaseModal(true)}
        onTierSelect={() => setShowPurchaseModal(true)}
      />

      {showPurchaseModal && (
        <SimplifiedTicketModal
          event={{
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            ticketTiers: (event as any).ticket_tiers,
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
