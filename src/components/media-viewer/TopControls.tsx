import { X, Volume2, VolumeX, Trash } from 'lucide-react';

interface TopControlsProps {
  onClose: () => void;
  type: 'photo' | 'video';
  isMuted: boolean;
  isYoutubeVideo: boolean;
  isPost: boolean;
  onToggleMute: () => void;
  onDelete: () => void;
}

export function TopControls({
  onClose,
  type,
  isMuted,
  isYoutubeVideo,
  isPost,
  onToggleMute,
  onDelete,
}: TopControlsProps) {
  return (
    <>
      <button
        onClick={onClose}
        className="absolute left-4 top-[calc(1rem+var(--eventz-safe-area-top))] z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="absolute right-4 top-[calc(1rem+var(--eventz-safe-area-top))] z-30 flex items-center gap-2">
        {type === 'video' && !isYoutubeVideo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        )}
        {isPost && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md hover:bg-red-600/70 flex items-center justify-center transition-colors"
            title="Delete"
          >
            <Trash className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </>
  );
}
