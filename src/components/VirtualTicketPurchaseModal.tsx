import { useState } from 'react';
import { X, ChevronLeft, Tv, Calendar, MapPin, CheckCircle2, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createTicket, createTransaction, initiateSnippePayment, waitForTransactionCompletion, Event as ApiEvent } from '../utils/supabase/api';

interface VirtualTicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ApiEvent;
}

const PAYMENT_PROVIDERS = [
  { id: 'Airtel', name: 'Airtel Money', color: 'bg-red-500' },
  { id: 'Tigo', name: 'Tigo Pesa', color: 'bg-blue-500' },
  { id: 'Halopesa', name: 'HaloPesa', color: 'bg-orange-500' },
  { id: 'Mpesa', name: 'M-Pesa', color: 'bg-red-600' }
];

export function VirtualTicketPurchaseModal({ isOpen, onClose, event }: VirtualTicketPurchaseModalProps) {
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '', phone: '' });
  const [selectedProvider, setSelectedProvider] = useState(PAYMENT_PROVIDERS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'processing' | 'success'>('details');

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !ticketFormData.name || !ticketFormData.email || !ticketFormData.phone) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const supabaseEnvDebug = {
        url: import.meta.env.VITE_SUPABASE_URL,
        hasKey: !!import.meta.env.VITE_SUPABASE_KEY,
      };
      console.log('Supabase config debug (virtual ticket purchase)', supabaseEnvDebug);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase tickets');
        setIsSubmitting(false);
        return;
      }

      // 1. Calculate Price
      const priceString = event.streaming?.virtualPrice || event.price_range || '0';
      // Simple parsing: remove non-numeric chars except dot
      const price = parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0;

      if (price <= 0) {
        // Free event logic (skip payment)
        await finalizeTicket(user.id, 'Free');
        return;
      }

      // 2. Create Pending Transaction
      const transactionData = {
        user_id: user.id,
        event_id: event.id,
        amount: price,
        currency: 'TZS',
        provider: selectedProvider,
        status: 'pending',
        metadata: {
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          customer_phone: ticketFormData.phone
        }
      };

      const transaction = await createTransaction(transactionData);
      
      // 3. Initiate Payment (Snippe)
      setPaymentStep('processing');
      toast.info('Initiating payment request...');

      await initiateSnippePayment({
        amount: price,
        phoneNumber: ticketFormData.phone,
        provider: selectedProvider,
        eventId: event.id,
        userId: user.id,
        metadata: { 
          transactionId: transaction.id,
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email
        }
      });

      toast.info(`Payment request sent to ${ticketFormData.phone}. Waiting for confirmation...`);
      const ok = await waitForTransactionCompletion(transaction.id);
      if (!ok) {
        throw new Error('Payment not confirmed');
      }
      await finalizeTicket(user.id, priceString, transaction.id);

    } catch (error: any) {
      const debugError = {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        context: (error as any)?.context,
      };
      console.error('Error purchasing ticket (debug)', {
        error: debugError,
        raw: error,
      });
      const message =
        error?.message ||
        (error as any)?.error?.message ||
        'Unknown error';
      toast.error(`Payment failed: ${message}`);
      setPaymentStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizeTicket = async (userId: string, priceDisplay: string, transactionId: number) => {
      // Generate ticket
      const ticketNumber = `EVT-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
      const barcode = crypto.randomUUID();
      
      const ticketData = {
        user_id: userId,
        event_id: event.id,
        ticket_number: ticketNumber,
        barcode: barcode,
        price: priceDisplay,
        purchase_date: new Date().toISOString(),
        customer_name: ticketFormData.name,
        customer_email: ticketFormData.email,
        ticket_type: 'Virtual',
        status: 'active',
        transaction_id: transactionId
      };

      await createTicket(ticketData);

      setPaymentStep('success');
      toast.success('Virtual Ticket Purchased! 🎉', {
        description: `Ticket #${ticketNumber} sent to ${ticketFormData.email}. Check Alerts for details.`,
        duration: 5000,
      });

      // Reset form and close modal after delay
      setTimeout(() => {
        setTicketFormData({ name: '', email: '', phone: '' });
        setPaymentStep('details');
        onClose();
      }, 3000);
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

          {paymentStep === 'success' ? (
             <div className="text-center py-8">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle2 className="w-8 h-8 text-green-600" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
               <p className="text-gray-600">Your ticket has been booked.</p>
             </div>
          ) : (
          <>
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
              
              {/* Payment Details */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  Payment Method
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {PAYMENT_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${
                        selectedProvider === provider.id
                          ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${provider.color} text-white flex items-center justify-center text-xs font-bold`}>
                        {provider.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{provider.name}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={ticketFormData.phone}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, phone: e.target.value })}
                      placeholder="255 7XX XXX XXX"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Enter number registered with {PAYMENT_PROVIDERS.find(p => p.id === selectedProvider)?.name}</p>
                </div>
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
          </>
          )}
        </div>
      </div>
    </div>
  );
}
