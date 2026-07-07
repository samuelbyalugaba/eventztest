import { Ticket, Phone, Tv, Bell } from 'lucide-react';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailActionBarProps {
  event: ApiEvent;
  isEventPast: boolean;
  isFreeEvent: boolean;
  isSaved: boolean;
  isCheckingVirtualAccess: boolean;
  externalTicketing: boolean;
  onWatchLive: () => void;
  onExternalTicketing: () => void;
  onPurchaseNormalTicket: (event: ApiEvent) => void;
  onToggleSave: () => void;
}

export function EventDetailActionBar({
  event,
  isEventPast,
  isFreeEvent,
  isSaved,
  isCheckingVirtualAccess,
  externalTicketing,
  onWatchLive,
  onExternalTicketing,
  onPurchaseNormalTicket,
  onToggleSave,
}: EventDetailActionBarProps) {
  return (
    <div className="flex shrink-0 gap-3 border-t border-gray-100 bg-white px-4 pt-4 pb-[calc(1rem+var(--eventz-safe-area-bottom))] z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {event.streaming?.isLive ? (
        <button
          onClick={onWatchLive}
          disabled={isCheckingVirtualAccess}
          className="flex min-w-0 flex-1 animate-pulse items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-center font-medium leading-tight text-white shadow-lg shadow-red-200 transition-colors hover:bg-red-700"
        >
          <Tv className="w-5 h-5 shrink-0" />
          <span className="min-w-0">Watch Live</span>
        </button>
      ) : (
        !isEventPast && (
          externalTicketing ? (
            <button
              onClick={onExternalTicketing}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-center font-medium leading-tight text-white transition-colors hover:bg-primary-dark"
            >
              <Phone className="w-5 h-5 shrink-0" />
              <span className="min-w-0">Contact for ticketing</span>
            </button>
          ) : (
            <button
              onClick={() => !isFreeEvent && onPurchaseNormalTicket(event)}
              disabled={isFreeEvent}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-center font-medium leading-tight transition-colors ${
                isFreeEvent
                  ? 'cursor-default bg-gray-100 text-gray-600 shadow-none'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              <Ticket className="w-5 h-5 shrink-0" />
              <span className="min-w-0">{isFreeEvent ? 'Free Event' : 'Get Tickets Now'}</span>
            </button>
          )
        )
      )}

      {isEventPast && (
        <div className="min-w-0 flex-1 rounded-xl bg-gray-100 py-3 text-center font-medium leading-tight text-gray-500 cursor-not-allowed">
          Event Ended
        </div>
      )}

      <button
        onClick={onToggleSave}
        className={`flex w-14 shrink-0 items-center justify-center rounded-xl border-2 text-gray-700 transition-all hover:bg-gray-50 ${isSaved ? 'border-[#FF4081] bg-[#FF4081]/10' : 'border-gray-200 bg-white'}`}
      >
        <Bell className={`w-6 h-6 ${isSaved ? 'fill-[#FF4081] text-[#FF4081]' : 'text-gray-400'}`} />
      </button>
    </div>
  );
}
