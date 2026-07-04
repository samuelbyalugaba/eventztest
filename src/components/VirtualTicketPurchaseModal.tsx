import { useState, useEffect } from 'react';
import { X, Tv, CheckCircle2, User, Mail, ArrowRight, Wallet, Smartphone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createTicket, createTransaction } from '../utils/supabase/api';
import { extractCurrencyFromPrice, formatPrice } from '../utils/currencies';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { ensureWalletBalanceForPurchase, loadNtzsWalletBalance, type WalletPaymentMethod } from '../utils/walletCheckout';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { ANDROID_PAID_VIRTUAL_ACCESS_NOTICE, isPaidVirtualAccessAllowed } from '../utils/platform';
import { PaymentMethodSelector } from './tickets/PaymentMethodSelector';

interface VirtualTicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ApiEvent;
}

export function VirtualTicketPurchaseModal({ isOpen, onClose, event }: VirtualTicketPurchaseModalProps) {
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<WalletPaymentMethod>('Wallet');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'success'>('details');
  const [walletBalance, setWalletBalance] = useState(0);

  // Pre-fill user data & fetch wallet
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

        try {
          const { balanceTzs } = await loadNtzsWalletBalance(user.id, user.email || '');
          setWalletBalance(balanceTzs);
        } catch (err) {
          // Fallback to 0 if API fails. nTZS is the source of truth.
          setWalletBalance(0);
        }
      }
    };
    
    if (isOpen) {
      loadUser();
    }
  }, [isOpen]);

  const handleTicketSubmit = async () => {
    if (!event || !ticketFormData.name || !ticketFormData.email) {
      toast.error('Please fill in name and email');
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

      // 1. Calculate Price — virtual ticket only (never the in-person tier range)
      const priceString = event.streaming?.virtualPrice || '0';
      const price = parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0;
      const currency = extractCurrencyFromPrice(priceString);

      if (price <= 0) {
        // Free ticket logic
        await finalizeTicket(user.id, 'Free', 0);
        return;
      }

      const { nUser, balanceTzs } = await ensureWalletBalanceForPurchase({
        userId: user.id,
        email: user.email || '',
        amount: price,
        currency,
        eventId: event.id,
        paymentMethod: selectedPaymentMethod,
        phone: paymentPhone,
        onTopUpStarted: (topUpAmount) => {
          toast.info(`Confirm TSh ${topUpAmount.toLocaleString()} on your phone`);
        },
      });
      setWalletBalance(balanceTzs);

      const transaction = await createTransaction({
        user_id: user.id,
        event_id: event.id,
        amount: price,
        currency: currency,
        provider: 'Wallet',
        status: 'pending',
        metadata: {
          type: 'payment',
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          ticket_type: 'Virtual',
          wallet_funding_method: selectedPaymentMethod
        }
      });

      const { ntzsApi } = await import('../utils/ntzs-api');
      await ntzsApi.withdraw(nUser.id, price, 'wallet-payment');

      const { error: updateErr } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id)
        .eq('user_id', user.id);
      if (updateErr) throw new Error('Failed to verify wallet payment');

      await finalizeTicket(user.id, priceString, transaction.id);

    } catch (error: any) {
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

      window.dispatchEvent(new CustomEvent('virtualAccessPurchased', { detail: { eventId: event.id } }));
      setPaymentStep('success');
      toast.success('Virtual Access Granted');
      setTimeout(() => {
        onClose();
        setPaymentStep('details');
        setPaymentPhone('');
      }, 2500);
  };

  if (!isOpen) return null;
  
  // Calculate price for display — always use the dedicated virtual ticket price.
  // Never fall back to price_range (which is the in-person tier range).
  const priceString = event.streaming?.virtualPrice || '0';
  const price = parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0;
  const isFreeVirtual = price <= 0;
  const paidVirtualBlocked = !isFreeVirtual && !isPaidVirtualAccessAllowed();
  const walletShortfall = Math.max(0, price - walletBalance);
  const needsTopUp = price > 0 && selectedPaymentMethod !== 'Wallet' && walletShortfall > 0;

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
                        <p className="text-purple-700 font-bold text-sm">{isFreeVirtual ? 'Free' : formatPrice(event.streaming?.virtualPrice)}</p>
                    </div>
                </div>

                {paidVirtualBlocked ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Virtual ticketing unavailable</p>
                    <p className="mt-1 text-sm leading-5 text-amber-800">{ANDROID_PAID_VIRTUAL_ACCESS_NOTICE}</p>
                  </div>
                ) : (
                <>
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

                {/* Payment — only show if not free */}
                {!isFreeVirtual && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Method</p>
                    <PaymentMethodSelector
                        value={selectedPaymentMethod}
                        onChange={setSelectedPaymentMethod}
                    />
                    {selectedPaymentMethod === 'Wallet' && (
                        <div className={`p-4 rounded-xl border ${walletBalance >= price ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex justify-between items-center mb-1">
                               <div className="flex items-center gap-2">
                                  <Wallet className="w-4 h-4 text-purple-600" />
                                  <span className="text-sm font-medium text-gray-700">Eventz Wallet</span>
                               </div>
                               <span className="font-bold text-gray-900">TSh {walletBalance.toLocaleString()}</span>
                            </div>
                            {walletShortfall > 0 && (
                               <p className="text-xs text-red-600 font-medium">
                                 Insufficient balance. Topup your wallet or pay with mobile money instead
                               </p>
                            )}
                        </div>
                    )}
                    {needsTopUp && (
                        <div className="relative">
                            <Smartphone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                            <input
                                type="tel"
                                placeholder="255 7XX XXX XXX"
                                value={paymentPhone}
                                onChange={(e) => setPaymentPhone(e.target.value)}
                                className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                            />
                        </div>
                    )}
                </div>
                )}

                <p className="text-center text-xs leading-5 text-gray-500">
                  By continuing, you agree to the{' '}
                  <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-700 underline underline-offset-2">Terms</a>
                  {' '}and{' '}
                  <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-700 underline underline-offset-2">Privacy Policy</a>.
                </p>

                <button
                    onClick={handleTicketSubmit}
                    disabled={isSubmitting}
                    className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3.5 text-center font-bold leading-tight text-white shadow-lg shadow-purple-200 transition-all ${
                        isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl'
                    }`}
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="min-w-0">
                              {isFreeVirtual
                                ? 'Get Free Access'
                                : `Pay ${formatPrice(event.streaming?.virtualPrice)}`}
                            </span>
                            {isFreeVirtual ? (
                              <ArrowRight className="w-4 h-4 shrink-0" />
                            ) : (
                              <CreditCard className="w-4 h-4 shrink-0" />
                            )}
                        </>
                    )}
                </button>
                </>
                )}
                </>
            ) : (
                <div className="text-center py-8 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">You're In!</h3>
                    <p className="text-gray-600 text-sm">Access details sent to your email.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
