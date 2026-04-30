import { X, Ticket as TicketIcon, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Ticket } from '../utils/supabase/api';
import { formatPrice } from '../utils/currencies';
import { formatDateDMY } from '../utils/format';

interface TicketListModalProps {
  isOpen: boolean;
  eventName: string;
  tickets: Ticket[];
  onClose: () => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export function TicketListModal({ isOpen, eventName, tickets, onClose, onSelectTicket }: TicketListModalProps) {
  if (!isOpen) return null;
  // Group tickets by type if needed, but for now simple list is fine
  
  const event = tickets[0]?.event;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-900">My Tickets</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 truncate pr-4">{eventName}</p>
        </div>

        {/* Event Summary (Optional) */}
        {event && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                <ImageWithFallback 
                  src={event.image_url} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateDMY(event.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket)}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                  <TicketIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">
                    {ticket.ticket_type} Ticket
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    #{ticket.ticket_number.split('-').pop()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="block text-sm font-medium text-gray-900">{formatPrice(ticket.price)}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Tap a ticket to view QR code
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
