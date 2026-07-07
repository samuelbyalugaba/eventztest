import { Ticket, Sparkles, Phone } from 'lucide-react';
import { formatEventPrice } from '../../utils/eventPriceFormat';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailGetTicketsProps {
  event: ApiEvent;
  isEventPast: boolean;
  isFreeEvent: boolean;
  externalTicketing: boolean;
  externalTicketingPhone: string;
  onExternalTicketing: () => void;
  onPurchaseNormalTicket: (event: ApiEvent) => void;
  onPurchaseTicket: (event: ApiEvent) => void;
}

export function EventDetailGetTickets({
  event,
  isEventPast,
  isFreeEvent,
  externalTicketing,
  externalTicketingPhone,
  onExternalTicketing,
  onPurchaseNormalTicket,
  onPurchaseTicket,
}: EventDetailGetTicketsProps) {
  if (event.ticket_tiers && event.ticket_tiers.length > 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900">Get Tickets</h3>
        {(event as any).ticketsSold && (event as any).ticketsSold > 100 && (
          <span className="text-orange-500 text-sm font-medium animate-pulse">Selling fast</span>
        )}
      </div>

      <div className="space-y-3">
        {externalTicketing ? (
          <button
            onClick={() => !isEventPast && onExternalTicketing()}
            disabled={isEventPast}
            className={`w-full bg-white border-2 border-primary rounded-xl p-4 flex items-center justify-between transition-all group ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center group-hover:bg-primary-dark transition-colors">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-gray-900 font-medium group-hover:text-white">Contact for ticketing</p>
                <p className="text-gray-500 text-xs group-hover:text-white/70">{externalTicketingPhone || 'Contact organizer'}</p>
              </div>
            </div>
            <span className="text-primary font-bold group-hover:text-white">{formatEventPrice(event, event.price_range)}</span>
          </button>
        ) : (
          <button
            onClick={() => !isEventPast && !isFreeEvent && onPurchaseNormalTicket(event)}
            disabled={isEventPast || isFreeEvent}
            className={`w-full rounded-xl border-2 p-4 flex items-center justify-between transition-all group ${
              isEventPast || isFreeEvent
                ? 'cursor-default border-gray-100 bg-gray-50 text-gray-500'
                : 'border-primary bg-white hover:bg-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFreeEvent ? 'bg-gray-100' : 'bg-primary group-hover:bg-primary-dark'}`}>
                <Ticket className={`w-5 h-5 ${isFreeEvent ? 'text-gray-500' : 'text-white'}`} />
              </div>
              <div className="text-left">
                <p className="text-gray-900 font-medium group-hover:text-white">{isFreeEvent ? 'Free Event' : 'Standard Entry'}</p>
                <p className="text-gray-500 text-xs group-hover:text-white/70">{isFreeEvent ? 'No ticket purchase required' : 'General admission access'}</p>
              </div>
            </div>
            <span className="text-primary font-bold group-hover:text-white">{formatEventPrice(event, event.price_range)}</span>
          </button>
        )}

        {!externalTicketing && (event as any).vipPrice && (
          <button
            onClick={() => !isEventPast && onPurchaseTicket(event)}
            disabled={isEventPast}
            className={`w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-4 flex items-center justify-between transition-all transform ${isEventPast ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">VIP Experience</p>
                <p className="text-gray-400 text-xs">Premium access & perks</p>
              </div>
            </div>
            <span className="text-yellow-400 font-bold">{(event as any).vipPrice}</span>
          </button>
        )}
      </div>
    </div>
  );
}
