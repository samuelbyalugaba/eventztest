import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { preloadCamera } from '../../utils/cameraPreloader';

export function ProfileFab() {
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => { preloadCamera(); await import('../CreatePostPage'); navigate('/compose/post'); }}
      className="fixed bottom-[calc(6.25rem+var(--eventz-safe-area-bottom))] right-5 w-12 h-12 rounded-full bg-primary shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center z-40 group"
      title="Share a post"
    >
      <Camera className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
    </button>
  );
}
