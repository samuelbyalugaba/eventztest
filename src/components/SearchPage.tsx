import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../utils/supabase/api';
import { PremiumSearchModal } from './PremiumSearchModal';
import { eventsStore } from '../store/eventStore';

export function SearchPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>(() => eventsStore.getEvents());

  useEffect(() => {
    const cached = eventsStore.getEvents();
    if (cached.length > 0) return;

    const load = async () => {
      try {
        const data = await getEvents();
        setEvents((data || []).map((e: any) => ({ ...e, isSaved: false })));
      } catch {
        /* events stay empty — modal still works */
      }
    };
    void load();
  }, []);

  const handleClose = () => {
    navigate('/events');
  };

  const handleEventSelect = (event: any) => {
    navigate(`/event/${event.id}`, { state: { eventSnapshot: event } });
  };

  const handlePersonSelect = (person: any) => {
    navigate(`/profile/${person.id}`);
  };

  const handleVenueSelect = () => {
    navigate('/events');
  };

  return (
    <PremiumSearchModal
      onClose={handleClose}
      events={events}
      onEventSelect={handleEventSelect}
      onPersonSelect={handlePersonSelect}
      onVenueSelect={handleVenueSelect}
    />
  );
}
