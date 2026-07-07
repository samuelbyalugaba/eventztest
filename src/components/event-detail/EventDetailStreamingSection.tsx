import { Tv, Eye } from 'lucide-react';
import { formatEventPrice } from '../../utils/eventPriceFormat';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailStreamingSectionProps {
  event: ApiEvent;
  requiresVirtualAccess: boolean;
  hasVirtualAccess: boolean;
  isEventPast: boolean;
  onPurchaseTicket: (event: ApiEvent) => void;
}

export function EventDetailStreamingSection({
  event,
  requiresVirtualAccess,
  hasVirtualAccess,
  isEventPast,
  onPurchaseTicket,
}: EventDetailStreamingSectionProps) {
  if (!event.streaming?.available) return null;

  return (
    <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-gray-900 font-semibold text-sm">HD Live Stream</h3>
        </div>
        {event.streaming.isLive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-600 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
            <span className="text-xs font-medium">LIVE</span>
          </div>
        )}
      </div>

      {event.streaming.isLive && (event.streaming.liveViewers || 0) > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Eye className="w-4 h-4" />
          <span>{(event.streaming.liveViewers ?? 0).toLocaleString()} watching now</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-xl border border-gray-100">
        <span className="text-gray-600 text-sm">Virtual Ticket</span>
        <span className="text-gray-900 font-semibold">{formatEventPrice(event, event.streaming.virtualPrice, false)}</span>
      </div>

      {requiresVirtualAccess ? (
        <button
          onClick={() => !isEventPast && onPurchaseTicket(event)}
          disabled={isEventPast}
          className={`w-full bg-gray-900 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
        >
          <Tv className="w-4 h-4" />
          <span className="text-sm font-medium">{isEventPast ? 'Event Ended' : hasVirtualAccess ? 'Access Granted' : 'Get Access'}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="flex w-full cursor-default items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-gray-700 shadow-none"
        >
          <Tv className="w-4 h-4" />
          <span className="text-sm font-medium">{isEventPast ? 'Event Ended' : 'Free Live Stream, Stay Tuned!'}</span>
        </button>
      )}
    </div>
  );
}
