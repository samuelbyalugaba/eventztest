import { memo } from 'react';
import { Calendar, MapPin, Tv } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { formatDateDMY } from '../utils/format';

interface EventCardProps {
  event: ApiEvent;
  onClick: (event: ApiEvent) => void;
  className?: string;
  currentUserId?: string | null;
  onEditEvent?: (event: ApiEvent) => void;
  onDeleteEvent?: (event: ApiEvent) => void;
}

export const EventCard = memo(function EventCard({ event, onClick, className = '' }: EventCardProps) {
  // Use passed organizer data if available, otherwise fallback to "Event Organizer"
  // Avoiding internal fetches to prevent N+1 request problem
  const organizerName = event.organizer?.full_name || 'Event Organizer';

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
          displayWidth={400}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
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
        
        {/* Organizer Name */}
        <div className="flex items-center gap-1.5 mb-1.5 text-gray-500 text-xs">
          <span className="line-clamp-1">by {organizerName || 'Loading...'}</span>
        </div>
        
        <div className="flex items-center gap-1.5 mb-1.5 text-gray-600 text-xs">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{formatDateDMY(event.date)}</span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {event.location ? (
            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
});
