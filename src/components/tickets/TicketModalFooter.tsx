import { ArrowRight, CreditCard, Ticket } from 'lucide-react';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../utils/legal';

interface TicketModalFooterProps {
  step: 'select' | 'checkout';
  totalTickets: number;
  totalPrice: number;
  isProcessing: boolean;
  onBackToSelect: () => void;
  onProceedToCheckout: () => void;
  onPurchase: () => void;
  formatPrice: (price: string) => string;
  currencySymbol: string;
}

export function TicketModalFooter({
  step,
  totalTickets,
  totalPrice,
  isProcessing,
  onBackToSelect,
  onProceedToCheckout,
  onPurchase,
  formatPrice,
  currencySymbol,
}: TicketModalFooterProps) {
  return (
    <div className="p-4 border-t border-gray-100 bg-gray-50">
      {step === 'select' ? (
        <button
          onClick={onProceedToCheckout}
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
            onClick={onBackToSelect}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 px-4 py-3.5 text-center font-medium leading-tight text-gray-600 transition-colors hover:bg-gray-100"
          >
            Back
          </button>
          <button
            onClick={onPurchase}
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
  );
}
