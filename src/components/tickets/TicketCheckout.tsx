import { Wallet, Smartphone, Ticket } from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { WalletPaymentMethod } from '../../utils/walletCheckout';

interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
}

interface TicketCheckoutProps {
  selections: Record<string, number>;
  tiers: TicketTier[];
  totalPrice: number;
  totalTickets: number;
  formData: { name: string; email: string };
  onFormDataChange: (data: { name: string; email: string }) => void;
  selectedPaymentMethod: WalletPaymentMethod;
  onPaymentMethodChange: (method: WalletPaymentMethod) => void;
  paymentPhone: string;
  onPaymentPhoneChange: (phone: string) => void;
  walletBalance: number;
  walletShortfall: number;
  needsTopUp: boolean;
  formatPrice: (price: string) => string;
}

export function TicketCheckout({
  selections,
  tiers,
  totalPrice,
  formData,
  onFormDataChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  paymentPhone,
  onPaymentPhoneChange,
  walletBalance,
  walletShortfall,
  needsTopUp,
  formatPrice,
}: TicketCheckoutProps) {
  return (
    <div className="space-y-6">
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

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Your Details</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
        />
        <input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
        />
      </div>

      {totalPrice > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Payment Method</h3>
          <PaymentMethodSelector
            value={selectedPaymentMethod}
            onChange={onPaymentMethodChange}
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
                  onChange={(e) => onPaymentPhoneChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>
      )}

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
  );
}
