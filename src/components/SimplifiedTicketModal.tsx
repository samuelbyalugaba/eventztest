import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { extractCurrencyFromPrice, currencies, formatPrice } from '../utils/currencies';
import { createTransaction, createTicket } from '../utils/supabase/api';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { formatDateDMY } from '../utils/format';
import { ensureWalletBalanceForPurchase, loadNtzsWalletBalance, type WalletPaymentMethod } from '../utils/walletCheckout';
import { TicketTierList } from './tickets/TicketTierList';
import { TicketCheckout } from './tickets/TicketCheckout';
import { TicketModalFooter } from './tickets/TicketModalFooter';

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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

        <div className="overflow-y-auto p-4 flex-1">
          {step === 'select' ? (
            <TicketTierList
              tiers={tiers}
              selections={selections}
              onUpdateQuantity={updateQuantity}
              formatPrice={formatPrice}
            />
          ) : (
            <TicketCheckout
              selections={selections}
              tiers={tiers}
              totalPrice={totalPrice}
              totalTickets={totalTickets}
              formData={formData}
              onFormDataChange={setFormData}
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodChange={setSelectedPaymentMethod}
              paymentPhone={paymentPhone}
              onPaymentPhoneChange={setPaymentPhone}
              walletBalance={walletBalance}
              walletShortfall={walletShortfall}
              needsTopUp={needsTopUp}
              formatPrice={formatPrice}
            />
          )}
        </div>

        <TicketModalFooter
          step={step}
          totalTickets={totalTickets}
          totalPrice={totalPrice}
          isProcessing={isProcessing}
          onBackToSelect={() => setStep('select')}
          onProceedToCheckout={() => {
            if (totalTickets === 0) {
              toast.error('Please select at least one ticket');
              return;
            }
            setStep('checkout');
          }}
          onPurchase={handlePurchase}
          formatPrice={formatPrice}
          currencySymbol={currencySymbol}
        />
      </div>
    </div>
  );
}
