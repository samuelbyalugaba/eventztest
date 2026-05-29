import { memo } from 'react';
import { Calendar, MapPin, MoreVertical, Pencil, Trash2, Tv } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { formatDateDMY } from '../utils/format';

interface EventCardProps {
  event: ApiEvent;
  onClick: (event: ApiEvent) => void;
  className?: string;
  currentUserId?: string | null;
  onEditEvent?: (event: ApiEvent) => void;
  onDeleteEvent?: (event: ApiEvent) => void;
  showOwnerActions?: boolean;
  compact?: boolean;
}

export const EventCard = memo(function EventCard({
  event,
  onClick,
  className = '',
  onEditEvent,
  onDeleteEvent,
  showOwnerActions = false,
  compact = false,
}: EventCardProps) {
  // Use passed organizer data if available, otherwise fallback to "Event Organizer"
  // Avoiding internal fetches to prevent N+1 request problem
  const organizerName = event.organizer?.full_name || 'Event Organizer';
  const canManage = showOwnerActions && (!!onEditEvent || !!onDeleteEvent);

  return (
    <div
      onClick={() => onClick(event)}
      className={`bg-white ${compact ? 'rounded-xl' : 'rounded-2xl'} overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer ${className}`}
    >
      {/* Event Image */}
      <div className={`relative w-full ${compact ? 'h-36' : 'h-40'} overflow-hidden`}>
        <ImageWithFallback
          src={event.image_url}
          alt={event.title}
          displayWidth={400}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {canManage && (
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Event actions"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full bg-black/55 text-white backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-black/70 active:scale-95 transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 min-w-[150px]">
                {onEditEvent && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEvent(event);
                    }}
                    className="gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit event</span>
                  </DropdownMenuItem>
                )}
                {onDeleteEvent && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEvent(event);
                    }}
                    className="gap-2 text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete event</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
      <div className={compact ? 'p-2.5' : 'p-3'}>
        <h3 className={`text-gray-900 line-clamp-2 font-medium ${compact ? 'mb-1.5 text-[13px] leading-snug' : 'mb-2 text-sm'}`}>
          {event.title}
        </h3>
        
        {/* Organizer Name */}
        <div className={`flex items-center gap-1.5 mb-1.5 text-gray-500 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          <span className="line-clamp-1">by {organizerName || 'Loading...'}</span>
        </div>
        
        <div className={`flex items-center gap-1.5 mb-1.5 text-gray-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{formatDateDMY(event.date)}</span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {event.location ? (
            <div className={`flex items-center gap-1.5 text-gray-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
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
