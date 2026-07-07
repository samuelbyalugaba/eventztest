import { useState, useEffect } from 'react';
import { X, Sparkles, Crown, ArrowRight, CreditCard, Ticket, Minus, Plus, Wallet, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { extractCurrencyFromPrice, currencies, formatPrice } from '../utils/currencies';
import { createTransaction, createTicket } from '../utils/supabase/api';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { formatDateDMY } from '../utils/format';
import { ensureWalletBalanceForPurchase, loadNtzsWalletBalance, type WalletPaymentMethod } from '../utils/walletCheckout';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { PaymentMethodSelector } from './tickets/PaymentMethodSelector';

interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
}

interface SimplifiedTicketModalProps {
  event: {
    id: number;
    title: string;
    date: string;
    location: string;
    ticketTiers?: TicketTier[];
    price_range: string;
    image_url: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function SimplifiedTicketModal({ event, onClose, onSuccess }: SimplifiedTicketModalProps) {
  const [step, setStep] = useState<'select' | 'checkout'>('select');
  
  // Multi-selection state: map of tier name -> quantity
  const [selections, setSelections] = useState<Record<string, number>>({});
  
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<WalletPaymentMethod>('Wallet');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Normalize tiers (handle single price events)
  const tiers: TicketTier[] = (event.ticketTiers && event.ticketTiers.length > 0) 
    ? event.ticketTiers
        .filter(t => t && t.name) // Filter out any null/undefined tiers
        .map(t => ({
          ...t,
          name: t.name || 'Standard', // Ensure name is never null/undefined
          priceNumeric: parseInt((t.price || '').replace(/[^\d]/g, '')) || 0
        }))
    : [{
        name: 'Standard',
        price: event.price_range,
        priceNumeric: parseInt(event.price_range.replace(/[^\d]/g, '')) || 0,
        available: 999,
        features: ['General Admission']
      }];

  // Pre-fill user data & fetch wallet balance
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, contact_email').eq('id', user.id).single();
        if (profile) {
          setFormData({
            name: profile.full_name || '',
            email: profile.contact_email || user.email || ''
          });
        }

        try {
          const { balanceTzs } = await loadNtzsWalletBalance(user.id, user.email || '');
          setWalletBalance(balanceTzs);
        } catch (err) {
          setWalletBalance(0);
        }
      }
    };
    loadUser();
  }, []);

  const updateQuantity = (tierName: string, delta: number) => {
    setSelections(prev => {
      const current = prev[tierName] || 0;
      const tier = tiers.find(t => t.name === tierName);
      if (!tier) return prev;
      
      const newQty = Math.max(0, Math.min(tier.available, current + delta));
      
      if (newQty === 0) {
        const { [tierName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [tierName]: newQty };
    });
  };

  const totalTickets = Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  
  const totalPrice = Object.entries(selections).reduce((sum, [name, qty]) => {
    const tier = tiers.find(t => t.name === name);
    return sum + (tier ? tier.priceNumeric * qty : 0);
  }, 0);

  const getCurrencySymbol = (priceString: string) => {
    const currencyCode = extractCurrencyFromPrice(priceString);
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : 'TSh';
  };

  const currencySymbol = getCurrencySymbol(tiers[0]?.price || '');
  const walletShortfall = Math.max(0, totalPrice - walletBalance);
  const needsTopUp = totalPrice > 0 && selectedPaymentMethod !== 'Wallet' && walletShortfall > 0;

  const handlePurchase = async () => {
    if (totalTickets === 0 || !formData.name || !formData.email) {
      toast.error('Please fill in all details');
      return;
    }

    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase');
        setIsProcessing(false);
        return;
      }

      // Use currency from first selected tier (assuming consistent currency)
      const firstTierName = Object.keys(selections)[0];
      const firstTier = tiers.find(t => t.name === firstTierName);
      const currency = firstTier ? extractCurrencyFromPrice(firstTier.price) : 'TZS';

      // Handle free events - skip payment entirely
      if (totalPrice === 0) {
        // Create a transaction record with amount 0 for free tickets
        const transaction = await createTransaction({
          user_id: user.id,
          event_id: event.id,
          amount: 0,
          currency: currency,
          provider: 'Free',
          status: 'completed',
          metadata: {
            type: 'free_ticket',
            customer_name: formData.name,
            customer_email: formData.email,
            selections: JSON.stringify(selections),
            total_quantity: totalTickets
          }
        });
        
        // Proceed directly to ticket creation
        await finalizeTicketCreation(user.id, transaction.id);
        return;
      }
      
      const { balanceTzs } = await ensureWalletBalanceForPurchase({
        userId: user.id,
        email: user.email || '',
        amount: totalPrice,
        currency,
        eventId: event.id,
        paymentMethod: selectedPaymentMethod,
        phone: paymentPhone,
        onTopUpStarted: (topUpAmount) => {
          toast.info(`Confirm TSh ${topUpAmount.toLocaleString()} on your phone`);
        },
      });
      setWalletBalance(balanceTzs);

      // Transfer funds from buyer's wallet to organizer's wallet via edge function
      const { data: payData, error: payErr } = await supabase.functions.invoke('wallet-ticket-payment', {
        body: {
          eventId: event.id,
          amount: totalPrice,
          currency,
          metadata: {
            customer_name: formData.name,
            customer_email: formData.email,
            selections: JSON.stringify(selections),
            total_quantity: totalTickets,
            wallet_funding_method: selectedPaymentMethod,
          },
        },
      });

      if (payErr || (payData as any)?.error) {
        const msg = (payData as any)?.error || payErr?.message || 'Wallet payment failed';
        throw new Error(msg);
      }

      const transactionId = (payData as any)?.transactionId;
      if (!transactionId) throw new Error('Payment succeeded but transaction was not recorded');

      await finalizeTicketCreation(user.id, transactionId);

    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const finalizeTicketCreation = async (userId: string, transactionId: number) => {
      // 4. Create Tickets
      for (const [tierName, qty] of Object.entries(selections)) {
        const tier = tiers.find(t => t.name === tierName);
        if (!tier) continue;

        for (let i = 0; i < qty; i++) {
          const ticketNumber = `${tierName.substring(0,3).toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const barcode = crypto.randomUUID();
          await createTicket({
            user_id: userId,
            event_id: event.id,
            ticket_number: ticketNumber,
            barcode: barcode,
            price: tier.price,
            purchase_date: new Date().toISOString(),
            customer_name: formData.name,
            customer_email: formData.email,
            ticket_type: tierName,
            status: 'active',
            transaction_id: transactionId
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.profile.tickets(userId) });
      toast.success('Tickets Purchased Successfully!');
      onSuccess();
      onClose();
  };

  const getTierIcon = (name: string | null | undefined) => {
    if (!name) return <Ticket className="w-5 h-5" />;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('vvip')) return <Crown className="w-5 h-5" />;
    if (lowerName.includes('vip')) return <Sparkles className="w-5 h-5" />;
    return <Ticket className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'select' ? 'Select Tickets' : 'Checkout'}
            </h2>
            <p className="text-xs text-gray-500">{event.title} • {formatDateDMY(event.date)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-1">
          {step === 'select' ? (
            <div className="space-y-4">
               {/* Tier List */}
               <div className="space-y-3">
                  {tiers.map((tier) => {
                    const quantity = selections[tier.name] || 0;
                    const isSelected = quantity > 0;
                    
                    return (
                      <div 
                        key={tier.name}
                        className={`border-2 rounded-xl p-4 transition-all ${
                          isSelected ? 'border-primary bg-purple-50/50' : 'border-gray-100 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                              {getTierIcon(tier.name)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{tier.name}</h3>
                              <p className="text-sm text-gray-500">{formatPrice(tier.price)}</p>
                            </div>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                            <button 
                              onClick={() => updateQuantity(tier.name, -1)}
                              disabled={quantity === 0}
                              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${quantity === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-lg w-6 text-center text-gray-900">{quantity}</span>
                            <button 
                              onClick={() => updateQuantity(tier.name, 1)}
                              disabled={quantity >= tier.available}
                              className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Features Preview */}
                        <div className="flex flex-wrap gap-2 mt-2 ml-12">
                          {tier.features.slice(0, 2).map((f, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-white/50 rounded-md text-gray-500 border border-gray-100">{f}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          ) : (
            // Checkout Step
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
                <p className="text-xs font-semibold text-purple-900 uppercase tracking-wider mb-2">Order Summary</p>
                {Object.entries(selections).map(([name, qty]) => {
                   const tier = tiers.find(t => t.name === name);
                   return (
                     <div key={name} className="flex justify-between items-center text-sm">
                       <span className="text-gray-700">{qty}x {name} Ticket</span>
                       <span className="font-medium text-gray-900">
                         {tier ? formatPrice(`${tier.priceNumeric * qty}`) : formatPrice('0')}
                       </span>
                     </div>
                   );
                })}
                <div className="border-t border-purple-200 my-2 pt-2 flex justify-between items-center">
                  <span className="font-bold text-purple-900">Total</span>
                  <span className="text-lg font-bold text-purple-900">
                    {formatPrice(totalPrice.toString())}
                  </span>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Your Details</h3>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
                />
              </div>

              {/* Payment Method - Only show for paid events */}
              {totalPrice > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Payment Method</h3>
                  <PaymentMethodSelector
                    value={selectedPaymentMethod}
                    onChange={setSelectedPaymentMethod}
                    activeClassName="border-primary bg-purple-50 text-purple-700"
                  />
                  {selectedPaymentMethod === 'Wallet' && (
                    <div className={`p-4 rounded-xl border ${walletBalance >= totalPrice ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between gap-3 mb-1">
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
                    <div className="space-y-2">
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="255 7XX XXX XXX"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Free Event Notice */}
              {totalPrice === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Free Event</h3>
                  </div>
                  <p className="text-sm text-green-700">This event is free! Your tickets will be issued immediately after confirming your details.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {step === 'select' ? (
            <button
              onClick={() => {
                if (totalTickets === 0) {
                  toast.error('Please select at least one ticket');
                  return;
                }
                setStep('checkout');
              }}
              disabled={totalTickets === 0}
              className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl py-3.5 text-center font-bold leading-tight text-white shadow-lg transition-all ${
                totalTickets > 0 
                  ? 'bg-primary shadow-purple-200 hover:bg-purple-700 hover:shadow-xl hover:scale-[1.02]' 
                  : 'bg-gray-300 shadow-none cursor-not-allowed'
              }`}
            >
              {totalPrice === 0 ? (
                <>
                  <Ticket className="w-4 h-4 shrink-0" />
                  <span>Get Free Tickets</span>
                </>
              ) : (
                <>
                  <span>Checkout</span>
                  {totalTickets > 0 && (
                    <span className="shrink-0 rounded bg-white/20 px-2 py-0.5 text-sm">
                      {formatPrice(totalPrice.toString())}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 px-4 py-3.5 text-center font-medium leading-tight text-gray-600 transition-colors hover:bg-gray-100"
              >
                Back
              </button>
              <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 py-3.5 text-center font-bold leading-tight text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl ${
                  isProcessing ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="min-w-0">Processing...</span>
                  </>
                ) : totalPrice === 0 ? (
                  <>
                    <span className="min-w-0">Get Free Tickets</span>
                    <Ticket className="w-4 h-4 shrink-0" />
                  </>
                ) : (
                  <>
                    <span className="min-w-0">Pay {currencySymbol} {totalPrice.toLocaleString()}</span>
                    <CreditCard className="w-4 h-4 shrink-0" />
                  </>
                )}
              </button>
            </div>
          )}
          {step === 'checkout' && (
            <p className="mt-3 text-center text-xs leading-5 text-gray-500">
              By continuing, you agree to the{' '}
              <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-700 underline underline-offset-2">Terms</a>
              {' '}and{' '}
              <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-700 underline underline-offset-2">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
