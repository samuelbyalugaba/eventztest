import { Calendar, MapPin, Tv } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Event as ApiEvent } from '../utils/supabase/api';

interface EventCardProps {
  event: ApiEvent;
  onClick: (event: ApiEvent) => void;
  className?: string;
}

export function EventCard({ event, onClick, className = '' }: EventCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'entertainment': return 'bg-purple-500 text-white';
      case 'business & tech': return 'bg-cyan-500 text-white';
      case 'culture': return 'bg-amber-600 text-white';
      case 'education': return 'bg-blue-500 text-white';
      case 'religion': return 'bg-red-600 text-white';
      case 'sports & fitness': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div
      onClick={() => onClick(event)}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer ${className}`}
    >
      {/* Event Image */}
      <div className="relative w-full h-40 overflow-hidden">
        <ImageWithFallback
          src={event.image_url}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-3 py-1 rounded-full text-xs ${getCategoryColor(event.category)}`}>
            {event.category}
          </span>
        </div>
        {/* Streaming Badge */}
        {event.streaming?.available && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full">
              <Tv className="w-3 h-3 text-white" />
              {event.streaming.isLive && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="p-3">
        <h3 className="text-gray-900 mb-2 text-sm line-clamp-2 font-medium">
          {event.title}
        </h3>
        
        <div className="flex items-center gap-1.5 mb-1.5 text-gray-600 text-xs">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{event.date}</span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {event.location ? (
            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          ) : (
            <div></div>
          )}
          <span className="text-[#8A2BE2] font-bold text-xs bg-purple-50 px-2 py-0.5 rounded-full">
            {event.price_range === 'Free' ? 'Free' : event.price_range}
          </span>
        </div>
      </div>
    </div>
  );
}
