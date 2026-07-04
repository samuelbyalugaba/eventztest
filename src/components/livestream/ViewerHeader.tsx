import { X, Users, Shield } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ViewerHeaderProps {
  host: string;
  hostAvatar?: string;
  isLive: boolean;
  viewerCount: number;
  isFollowing: boolean;
  onFollow: () => void;
  onClose: () => void;
}

export function ViewerHeader({
  host,
  hostAvatar,
  isLive,
  viewerCount,
  isFollowing,
  onFollow,
  onClose,
}: ViewerHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 w-full min-w-0">
      <div className="flex min-w-0 items-center gap-2 bg-black/60 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl border border-white/10 shadow-2xl">
        <div className="relative">
          {hostAvatar ? (
            <ImageWithFallback
              src={hostAvatar}
              alt={host}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/60"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs font-bold ring-2 ring-primary/60">
              {(host || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          {isLive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-white text-xs font-bold tracking-tight max-w-[38vw] sm:max-w-[220px]">{host}</span>
            <Shield className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-center gap-2 text-2xs">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600/90 text-2xs font-black tracking-[0.15em] text-white">
              LIVE
            </span>
            <span className="flex items-center gap-1 text-white/70">
              <Users className="w-3 h-3" />
              {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onFollow}
          className={`px-2.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-xl transition-all duration-300 ${
            isFollowing
              ? 'bg-white/10 text-white/90 border border-white/20'
              : 'bg-primary text-white shadow-lg'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-xl text-white/80 hover:text-white hover:bg-black/80 border border-white/10 transition-all"
          aria-label="Close livestream"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
