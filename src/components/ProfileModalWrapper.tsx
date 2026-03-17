import { useLocation, useNavigate } from 'react-router-dom';
import { Profile } from './Profile';

interface ProfileModalWrapperProps {
  onLogout?: () => Promise<void>;
  onCreateEvent?: () => void;
  onEditEvent?: (event: any) => void;
  onStartOrganizerSetup?: () => void;
  onViewPost?: (post: any) => void;
}

export function ProfileModalWrapper({ onLogout, onCreateEvent, onEditEvent, onStartOrganizerSetup, onViewPost }: ProfileModalWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as any)?.backgroundLocation;

  return (
    <div className="fixed inset-0 z-[70] bg-white overflow-y-auto">
      <Profile
        onLogout={onLogout}
        onCreateEvent={onCreateEvent}
        onEditEvent={onEditEvent}
        onStartOrganizerSetup={onStartOrganizerSetup}
        onViewPost={onViewPost}
        onBack={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else if (backgroundLocation) {
            navigate(backgroundLocation);
          } else {
            navigate('/feed');
          }
        }}
      />
    </div>
  );
}

