import { Share2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { BackButton } from '../ui/BackButton';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailCoverProps {
  event: ApiEvent;
  coverAspectRatio: number;
  onCoverLoad: (ratio: number) => void;
  onShare: () => void;
  onClose: () => void;
}

export function EventDetailCover({ event, coverAspectRatio, onCoverLoad, onShare, onClose }: EventDetailCoverProps) {
  return (
    <div
      className="relative w-full overflow-hidden bg-gray-100"
      style={{
        aspectRatio: coverAspectRatio,
        maxHeight: '70dvh',
      }}
    >
      <ImageWithFallback
        src={event.image_url}
        alt={event.title}
        displayWidth={900}
        resize="contain"
        className="h-full w-full"
        imageClassName="object-contain"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            onCoverLoad(img.naturalWidth / img.naturalHeight);
          }
        }}
      />

      <BackButton
        onClick={onClose}
        className="absolute left-4 top-[calc(1rem+var(--eventz-safe-area-top))] flex items-center justify-center p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all shadow-lg z-20"
      />

      <button
        onClick={onShare}
        className="absolute right-4 top-[calc(1rem+var(--eventz-safe-area-top))] p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all shadow-lg z-20"
      >
        <Share2 className="w-5 h-5 text-gray-900" />
      </button>

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
    </div>
  );
}
