import { useState, useEffect } from 'react';
import { X, ChevronLeft, Tv, Calendar, MapPin, CheckCircle2, Phone, CreditCard, User, Mail, Smartphone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createTicket, createTransaction, initiateSnippePayment, waitForTransactionCompletion, Event as ApiEvent } from '../utils/supabase/api';
import { extractCurrencyFromPrice } from '../utils/currencies';

interface VirtualTicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ApiEvent;
}

const PAYMENT_PROVIDERS = [
  { id: 'Airtel', name: 'Airtel', color: 'bg-red-500', short: 'A' },
  { id: 'Tigo', name: 'Tigo', color: 'bg-blue-500', short: 'T' },
  { id: 'Halopesa', name: 'Halo', color: 'bg-orange-500', short: 'H' },
  { id: 'Mpesa', name: 'M-Pesa', color: 'bg-red-600', short: 'M' }
];

export function VirtualTicketPurchaseModal({ isOpen, onClose, event }: VirtualTicketPurchaseModalProps) {
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '', phone: '' });
  const [selectedProvider, setSelectedProvider] = useState(PAYMENT_PROVIDERS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'success'>('details');

  // Pre-fill user data
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, contact_email').eq('id', user.id).single();
        if (profile) {
            setTicketFormData(prev => ({
            ...prev,
            name: profile.full_name || '',
            email: profile.contact_email || user.email || ''
          }));
        }
      }
    };
    if (isOpen) loadUser();
  }, [isOpen]);

  const handleTicketSubmit = async () => {
    if (!event || !ticketFormData.name || !ticketFormData.email || !ticketFormData.phone) {
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

      // 1. Calculate Price
      const priceString = event.streaming?.virtualPrice || event.price_range || '0';
      const price = parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0;
      const currency = extractCurrencyFromPrice(priceString);

      if (price <= 0) {
        await finalizeTicket(user.id, 'Free', 0);
        return;
      }

      // 2. Create Pending Transaction
      const transactionData = {
        user_id: user.id,
        event_id: event.id,
        amount: price,
        currency: currency,
        provider: selectedProvider,
        status: 'pending',
        metadata: {
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          customer_phone: ticketFormData.phone,
          ticket_type: 'Virtual'
        }
      };

      const transaction = await createTransaction(transactionData);
      
      // 3. Initiate Payment (Snippe)
      toast.info('Initiating payment request...');
      await initiateSnippePayment({
        amount: price,
        currency: currency,
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

      toast.info(`Please approve payment on your phone (${ticketFormData.phone})`);
      const ok = await waitForTransactionCompletion(transaction.id);
      if (!ok) throw new Error('Payment not confirmed');
      
      await finalizeTicket(user.id, priceString, transaction.id);

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizeTicket = async (userId: string, priceDisplay: string, transactionId: number) => {
      const ticketNumber = `EVT-V-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
      const barcode = crypto.randomUUID();
      
      await createTicket({
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
      });

      setPaymentStep('success');
      toast.success('Virtual Access Granted! 🎥');
      setTimeout(() => {
        onClose();
        setPaymentStep('details');
        setTicketFormData(prev => ({ ...prev, phone: '' }));
      }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-600" />
            Virtual Access
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
            {paymentStep === 'details' ? (
                <>
                {/* Event Summary */}
                <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="w-12 h-12 bg-white rounded-lg overflow-hidden shrink-0 shadow-sm">
                        <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{event.title}</h3>
                        <p className="text-purple-700 font-bold text-sm">{event.streaming?.virtualPrice}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-3">
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={ticketFormData.name}
                            onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={ticketFormData.email}
                            onChange={(e) => setTicketFormData({ ...ticketFormData, email: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                        />
                    </div>
                </div>

                {/* Payment */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Method</p>
                    <div className="grid grid-cols-4 gap-2">
                        {PAYMENT_PROVIDERS.map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => setSelectedProvider(provider.id)}
                                className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                                    selectedProvider === provider.id
                                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                                    : 'border-gray-200 text-gray-600 hover:border-purple-200'
                                }`}
                            >
                                {provider.name}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Smartphone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input
                            type="tel"
                            placeholder="255 7XX XXX XXX"
                            value={ticketFormData.phone}
                            onChange={(e) => setTicketFormData({ ...ticketFormData, phone: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={handleTicketSubmit}
                    disabled={isSubmitting}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all ${
                        isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl'
                    }`}
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Pay {event.streaming?.virtualPrice}</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
                </>
            ) : (
                <div className="text-center py-8 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">You're In! 🎥</h3>
                    <p className="text-gray-600 text-sm">Access details sent to your email.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
