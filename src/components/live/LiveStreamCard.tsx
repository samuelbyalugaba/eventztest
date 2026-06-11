import { memo } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { MapPin, Eye } from 'lucide-react';

interface LiveStream {
  id: number;
  title: string;
  category: string;
  thumbnail: string;
  isLive: boolean;
  viewers?: number;
  host: string;
  organizer_id: string;
  location: string;
  isPaid?: boolean;
  host_avatar?: string;
  playback_url?: string;
}

interface LiveStreamCardProps {
  stream: LiveStream;
  variant: 'featured' | 'creator';
  onClick: (stream: LiveStream) => void;
}

export const LiveStreamCard = memo(function LiveStreamCard({ stream, variant, onClick }: LiveStreamCardProps) {
  if (variant === 'featured') {
    return (
      <div
        onClick={() => onClick(stream)}
        className="relative flex-shrink-0 w-[70vw] sm:w-[300px] snap-center group cursor-pointer overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 ring-1 ring-black/5"
        style={{ aspectRatio: '16/9' }}
      >
        <ImageWithFallback
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
          width={400}
          height={225}
          quality={80}
          resize="cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="absolute top-2.5 left-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 shadow-lg shadow-red-600/20 backdrop-blur-sm border border-red-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
            <span className="text-white text-[10px] font-black tracking-widest uppercase leading-none">Live</span>
          </div>
        </div>
        
        <div className="absolute top-2.5 right-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold">
            <Eye className="w-3 h-3 text-white/80" />
            <span>{stream.viewers?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
          <h3 className="text-white text-sm font-bold mb-1 line-clamp-1 drop-shadow-sm">{stream.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80 text-[11px] font-medium">
              <MapPin className="w-3.5 h-3.5 text-white/60" />
              <span className="line-clamp-1 max-w-[120px]">{stream.location || stream.host}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Creator variant
  return (
    <div
      onClick={() => onClick(stream)}
      className="relative flex-shrink-0 w-[38vw] sm:w-[164px] snap-center group cursor-pointer overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100 ring-1 ring-black/5"
      style={{ aspectRatio: '3/4' }}
    >
      <ImageWithFallback
        src={stream.thumbnail}
        alt={stream.title}
        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
        width={200}
        height={266}
        quality={80}
        resize="cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="absolute top-2.5 left-2.5">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 shadow-lg shadow-red-600/20 backdrop-blur-sm border border-red-500/20">
          <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
          <span className="text-white text-[8px] font-black tracking-widest uppercase">Live</span>
        </div>
      </div>
      
      <div className="absolute top-2.5 right-2.5">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[8px] font-semibold">
          <Eye className="w-2.5 h-2.5 text-white/80" />
          <span>{stream.viewers?.toLocaleString() || 0}</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-0.5 group-hover:translate-y-0 transition-transform">
        <h3 className="text-white text-[11px] font-bold mb-1 line-clamp-2 drop-shadow-sm group-hover:text-purple-200 transition-colors">{stream.title}</h3>
        <div className="flex items-center gap-1.5 text-white/70 text-[9px] font-medium">
          <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[8px] border border-white/10">
            {stream.host.charAt(0)}
          </div>
          <span className="line-clamp-1">{stream.host}</span>
        </div>
      </div>
    </div>
  );
});

interface StreamSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function StreamSectionHeader({ icon, title, subtitle }: StreamSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5 px-1">
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <h2 className="text-gray-900 text-[15px] font-bold tracking-tight">{title}</h2>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-100 to-transparent ml-6 hidden sm:block"></div>
    </div>
  );
}
