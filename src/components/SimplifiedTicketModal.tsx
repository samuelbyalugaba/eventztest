import React, { useState, useEffect } from 'react';
import { X, Check, Users, Sparkles, Crown, ArrowRight, Smartphone, CreditCard, ChevronLeft, Ticket, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { extractCurrencyFromPrice } from '../utils/currencies';
import { createTransaction, initiateSnippePayment, waitForTransactionCompletion, createTicket } from '../utils/supabase/api';

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
  const [paymentPhone, setPaymentPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('Airtel');
  const [isProcessing, setIsProcessing] = useState(false);

  // Normalize tiers (handle single price events)
  const tiers: TicketTier[] = (event.ticketTiers && event.ticketTiers.length > 0) 
    ? event.ticketTiers 
    : [{
        name: 'Standard',
        price: event.price_range,
        priceNumeric: parseInt(event.price_range.replace(/[^\d]/g, '')) || 0,
        available: 999,
        features: ['General Admission']
      }];

  // Pre-fill user data
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

  const handlePurchase = async () => {
    if (totalTickets === 0 || !formData.name || !formData.email || !paymentPhone) {
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

      // 1. Create Transaction
      const transactionData = {
        user_id: user.id,
        event_id: event.id,
        amount: totalPrice,
        currency: currency,
        provider: selectedProvider,
        status: 'pending',
        metadata: {
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: paymentPhone,
          selections: JSON.stringify(selections), // Store breakdown
          total_quantity: totalTickets
        }
      };

      const transaction = await createTransaction(transactionData);

      // 2. Initiate Payment
      toast.info('Sending payment request...');
      await initiateSnippePayment({
        amount: totalPrice,
        currency: currency,
        phoneNumber: paymentPhone,
        provider: selectedProvider,
        eventId: event.id,
        userId: user.id,
        metadata: { 
          transactionId: transaction.id,
          customer_name: formData.name,
          customer_email: formData.email
        }
      });

      // 3. Wait for Completion
      toast.info(`Please approve payment on your phone (${paymentPhone})`);
      const ok = await waitForTransactionCompletion(transaction.id);
      if (!ok) throw new Error('Payment not confirmed');

      // 4. Create Tickets
      for (const [tierName, qty] of Object.entries(selections)) {
        const tier = tiers.find(t => t.name === tierName);
        if (!tier) continue;

        for (let i = 0; i < qty; i++) {
          const ticketNumber = `${tierName.substring(0,3).toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const barcode = crypto.randomUUID();
          await createTicket({
            user_id: user.id,
            event_id: event.id,
            ticket_number: ticketNumber,
            barcode: barcode,
            price: tier.price,
            purchase_date: new Date().toISOString(),
            customer_name: formData.name,
            customer_email: formData.email,
            ticket_type: tierName,
            status: 'active',
            transaction_id: transaction.id
          });
        }
      }

      toast.success('Tickets Purchased Successfully!');
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTierIcon = (name: string) => {
    if (name.toLowerCase().includes('vvip')) return <Crown className="w-5 h-5" />;
    if (name.toLowerCase().includes('vip')) return <Sparkles className="w-5 h-5" />;
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
            <p className="text-xs text-gray-500">{event.title}</p>
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
                          isSelected ? 'border-[#8A2BE2] bg-purple-50/50' : 'border-gray-100 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#8A2BE2] text-white' : 'bg-gray-100 text-gray-600'}`}>
                              {getTierIcon(tier.name)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{tier.name}</h3>
                              <p className="text-sm text-gray-500">{tier.price}</p>
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
                              className="w-8 h-8 rounded-md bg-[#8A2BE2] text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
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
                         {tier ? (tier.priceNumeric * qty).toLocaleString() : 0}
                       </span>
                     </div>
                   );
                })}
                <div className="border-t border-purple-200 my-2 pt-2 flex justify-between items-center">
                  <span className="font-bold text-purple-900">Total</span>
                  <span className="text-lg font-bold text-purple-900">
                    TSh {totalPrice.toLocaleString()}
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Payment Method</h3>
                <div className="grid grid-cols-4 gap-2">
                  {['Airtel', 'Tigo', 'Halopesa', 'Mpesa'].map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedProvider(p)}
                      className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedProvider === p 
                          ? 'border-[#8A2BE2] bg-purple-50 text-purple-700' 
                          : 'border-gray-200 text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="255 7XX XXX XXX"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
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
              className={`w-full text-white py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                totalTickets > 0 
                  ? 'bg-[#8A2BE2] shadow-purple-200 hover:bg-purple-700 hover:shadow-xl hover:scale-[1.02]' 
                  : 'bg-gray-300 shadow-none cursor-not-allowed'
              }`}
            >
              <span>Checkout</span>
              {totalTickets > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                  TSh {totalPrice.toLocaleString()}
                </span>
              )}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className={`flex-1 bg-gradient-to-r from-[#8A2BE2] to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${
                  isProcessing ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Pay TSh {totalPrice.toLocaleString()}</span>
                    <CreditCard className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
