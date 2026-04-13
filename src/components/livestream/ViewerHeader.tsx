import { X, Users, Heart, Shield } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ViewerHeaderProps {
  host: string;
  hostAvatar?: string;
  isLive: boolean;
  viewerCount: number;
  likes: number;
  isLiked: boolean;
  isFollowing: boolean;
  onFollow: () => void;
  onClose: () => void;
}

export function ViewerHeader({
  host,
  hostAvatar,
  isLive,
  viewerCount,
  likes,
  isLiked,
  isFollowing,
  onFollow,
  onClose,
}: ViewerHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/10 shadow-2xl">
        <div className="relative">
          {hostAvatar ? (
            <ImageWithFallback
              src={hostAvatar}
              alt={host}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/60"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-purple-500/60">
              {(host || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          {isLive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-bold tracking-tight">{host}</span>
            <Shield className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-white/70">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600/90 text-[8px] font-black tracking-[0.15em] text-white">
                LIVE
              </span>
            </span>
            <span className="flex items-center gap-1 text-white/70">
              <Users className="w-3 h-3" />
              {viewerCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-white/70">
              <Heart className={`w-3 h-3 ${isLiked ? 'text-pink-500 fill-pink-500' : ''}`} />
              {likes.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onFollow}
          className={`px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-xl transition-all duration-300 ${
            isFollowing
              ? 'bg-white/10 text-white/90 border border-white/20'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-black/60 backdrop-blur-xl text-white/80 hover:text-white hover:bg-black/80 border border-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
