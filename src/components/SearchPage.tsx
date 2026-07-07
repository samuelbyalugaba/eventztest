import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../utils/supabase/api';
import { queryKeys } from '../queryKeys';
import { PremiumSearchModal } from './PremiumSearchModal';

export function SearchPage() {
  const navigate = useNavigate();
  const { data: events = [] } = useQuery({
    queryKey: queryKeys.events.publicList,
    queryFn: () => getEvents(),
    staleTime: 15 * 60 * 1000,
  });

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
