import { WALLET_PAYMENT_METHODS, type WalletPaymentMethod } from '../../utils/walletCheckout';
import { cn } from '../ui/utils';

type PaymentMethodSelectorProps = {
  value: WalletPaymentMethod;
  onChange: (method: WalletPaymentMethod) => void;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

export function PaymentMethodSelector({
  value,
  onChange,
  className,
  activeClassName = 'border-purple-600 bg-purple-50 text-purple-700',
  inactiveClassName = 'border-gray-200 text-gray-600 hover:border-purple-200',
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {WALLET_PAYMENT_METHODS.map((method) => (
        <button
          key={method}
          type="button"
          aria-pressed={value === method}
          onClick={() => onChange(method)}
          className={cn(
            'inline-flex min-h-12 min-w-0 items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-semibold leading-tight transition-all [overflow-wrap:anywhere]',
            value === method ? activeClassName : inactiveClassName,
          )}
        >
          {method}
        </button>
      ))}
    </div>
  );
}
