import { type GiftBanner } from './types';

interface GiftBannerOverlayProps {
  banners: GiftBanner[];
}

export function GiftBannerOverlay({ banners }: GiftBannerOverlayProps) {
  if (banners.length === 0) return null;

  return (
    <div className="absolute top-20 left-3 right-16 z-30 space-y-2 pointer-events-none">
      {banners.slice(-3).map((banner) => (
        <div
          key={banner.id}
          className="flex items-center gap-3 bg-yellow-500/15 backdrop-blur-xl rounded-2xl px-3 py-2.5 border border-yellow-500/20 animate-in slide-in-from-left duration-500 shadow-lg"
        >
          <div className="w-8 h-8 rounded-full bg-yellow-500/80 flex items-center justify-center text-lg shadow-lg">
            <span className="text-xs font-bold">{banner.gift.iconLabel}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-xs font-bold truncate">{banner.senderName}</span>
              <span className="text-white/50 text-2xs">sent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs font-bold">{banner.gift.name}</span>
              <span className="text-white/40 text-2xs">• TZS {banner.gift.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
