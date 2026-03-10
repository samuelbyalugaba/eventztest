import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventDetailModal } from './EventDetailModal';
import { getEventById } from '../utils/supabase/api';
import { toast } from 'sonner';

interface EventDetailWrapperProps {
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
  onPurchaseTicket: (event: any) => void;
  onPurchaseNormalTicket: (event: any) => void;
  onTierSelect?: (event: any, tierName: string) => void;
}

export function EventDetailWrapper({ 
  onStartConversation, 
  onPurchaseTicket, 
  onPurchaseNormalTicket,
  onTierSelect
}: EventDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          navigate('/events');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event');
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <EventDetailModal
      event={event}
      onClose={() => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/events');
        }
      }}
      onPurchaseTicket={onPurchaseTicket}
      onPurchaseNormalTicket={onPurchaseNormalTicket}
      onStartConversation={onStartConversation}
      onTierSelect={onTierSelect}
    />
  );
}
