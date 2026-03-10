import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateEvent } from './CreateEvent';
import { OrganizerProfileSetup } from './OrganizerProfileSetupSimple';
import { AuthScreen } from './AuthScreen';
import { getEventById, getProfile } from '../utils/supabase/api';
import { toast } from 'sonner';

interface CreateEventWrapperProps {
  currentUser: any;
  isAuthenticated: boolean;
  onAuthSuccess: (token: string, user: any) => void;
}

export function CreateEventWrapper({ currentUser, isAuthenticated, onAuthSuccess }: CreateEventWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasOrganizerProfile, setHasOrganizerProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Check organizer status
  useEffect(() => {
    const checkProfile = async () => {
      if (currentUser) {
        try {
          const profile = await getProfile(currentUser.id);
          if (profile) {
            const isOrg = profile.is_organizer || false;
            setIsOrganizer(isOrg);
            setHasOrganizerProfile(isOrg || !!profile.organizer_type);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
      setCheckingProfile(false);
    };
    checkProfile();
  }, [currentUser]);

  // Fetch event for editing
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
          setLoading(false);
          return;
      }
      
      try {
        const fetchedEvent = await getEventById(parseInt(id));
        if (fetchedEvent) {
             // Verify ownership
             if (currentUser && fetchedEvent.organizer_id !== currentUser.id) {
                 toast.error("You don't have permission to edit this event");
                 navigate('/events');
                 return;
             }
             setEvent(fetchedEvent);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event');
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
        fetchEvent();
    }
  }, [id, currentUser, navigate]);

  if (!isAuthenticated) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
         <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Amazing Events</h2>
         <p className="text-gray-600 mb-6">Sign in to start organizing your own events</p>
         <AuthScreen onAuthSuccess={onAuthSuccess} embedded={true} />
       </div>
    );
  }

  if (checkingProfile || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isOrganizer || !hasOrganizerProfile) {
    return (
      <OrganizerProfileSetup 
        onComplete={() => {
            setIsOrganizer(true);
            setHasOrganizerProfile(true);
        }} 
        onBack={() => navigate('/profile')}
      />
    );
  }

  return (
    <CreateEvent 
        event={event} 
        onBack={() => navigate('/profile')} 
    />
  );
}
