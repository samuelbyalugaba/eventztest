import { useState } from 'react';
import { X, ChevronLeft, Tv, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createTicket, Event as ApiEvent, PurchasedTicket } from '../utils/supabase/api';

interface VirtualTicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ApiEvent;
}

export function VirtualTicketPurchaseModal({ isOpen, onClose, event }: VirtualTicketPurchaseModalProps) {
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !ticketFormData.name || !ticketFormData.email) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase tickets');
        setIsSubmitting(false);
        return;
      }

      // Generate ticket
      const ticketNumber = `EVT-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
      const barcode = crypto.randomUUID();
      const price = event.streaming?.virtualPrice || event.price_range;
      
      const ticketData = {
        user_id: user.id,
        event_id: event.id,
        ticket_number: ticketNumber,
        barcode: barcode,
        price: price,
        purchase_date: new Date().toISOString(),
        customer_name: ticketFormData.name,
        customer_email: ticketFormData.email,
        ticket_type: 'Virtual',
        status: 'active'
      };

      await createTicket(ticketData);

      // Show success toast
      toast.success('Virtual Ticket Purchased! 🎉', {
        description: `Ticket #${ticketNumber} sent to ${ticketFormData.email}. Check Alerts for details.`,
        duration: 5000,
      });

      // Reset form and close modal
      setTicketFormData({ name: '', email: '' });
      onClose();
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      toast.error('Failed to purchase ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header with Navigation - STICKY */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl sm:rounded-t-2xl px-6 pt-6 pb-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-[#8A2BE2] font-bold text-lg touch-manipulation active:scale-95 transition-all min-h-[44px]"
            >
              <ChevronLeft className="w-7 h-7 stroke-[3]" />
              <span>Back</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-900 transition-colors p-2 bg-gray-100 rounded-full touch-manipulation active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-7 h-7 stroke-[3]" />
            </button>
          </div>
          <div>
            <h2 className="text-gray-900 text-xl font-bold mb-0.5">Purchase Virtual Ticket</h2>
            <p className="text-gray-600 text-sm">{event.title}</p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-6 overflow-y-auto flex-1">
          {/* Event Info */}
          <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-700">Virtual Ticket Price</p>
                <p className="text-purple-600">{event.streaming?.virtualPrice}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" />
                {event.date}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {event.location}
              </p>
            </div>
          </div>

          {/* Purchase Form */}
          <form onSubmit={handleTicketSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={ticketFormData.name}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={ticketFormData.email}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-gray-500 text-sm mt-1">Ticket will be sent to this email</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700 mb-2">Included with your ticket:</p>
              <ul className="space-y-2">
                {event.streaming?.features?.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Access to live stream
                </li>
                {event.streaming?.replayAvailable && (
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    48-hour replay access
                  </li>
                )}
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:from-purple-700 hover:to-cyan-600'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Complete Purchase</span>
              )}
            </button>
          </form>

          {/* Note */}
          <p className="text-gray-500 text-xs text-center mt-4">
            ✉️ You'll receive your ticket confirmation via email with access details
          </p>
        </div>
      </div>
    </div>
  );
}
