import { memo } from 'react';
import { Calendar, MapPin, MoreVertical, Pencil, Trash2, Tv } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { formatDateDMY } from '../utils/format';

interface EventCardProps {
  event: ApiEvent;
  onClick: (event: ApiEvent) => void;
  className?: string;
  currentUserId?: string | null;
  onEditEvent?: (event: ApiEvent) => void;
  onDeleteEvent?: (event: ApiEvent) => void;
}

export const EventCard = memo(function EventCard({ event, onClick, className = '', currentUserId, onEditEvent, onDeleteEvent }: EventCardProps) {
  // Use passed organizer data if available, otherwise fallback to "Event Organizer"
  // Avoiding internal fetches to prevent N+1 request problem
  const organizerName = event.organizer?.full_name || 'Event Organizer';
  const canManage = !!currentUserId && currentUserId === event.organizer_id && (!!onEditEvent || !!onDeleteEvent);

  const getCategoryColor = (category: string) => {
    switch ((category || '').toLowerCase()) {
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
          displayWidth={400}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {canManage && (
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="Event actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="min-w-[160px]">
                {onEditEvent && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onEditEvent(event);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit event
                  </DropdownMenuItem>
                )}
                {onEditEvent && onDeleteEvent && <DropdownMenuSeparator />}
                {onDeleteEvent && (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      onDeleteEvent(event);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete event
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${getCategoryColor(event.category)}`}>
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
