import { ArrowUpRight, Info, Smartphone } from 'lucide-react';

interface WalletWithdrawFormProps {
  totalWithdrawn: number;
  loading: boolean;
  balance: number | null;
  provider: string;
  onProviderChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  isProcessing: boolean;
  onWithdraw: () => void;
}

export function WalletWithdrawForm({
  totalWithdrawn,
  loading,
  balance,
  provider,
  onProviderChange,
  amount,
  onAmountChange,
  phone,
  onPhoneChange,
  isProcessing,
  onWithdraw,
}: WalletWithdrawFormProps) {
  return (
    <div>
      <div className="flex gap-2.5 mb-[18px]">
        <div className="flex-1 bg-input-background border border-border rounded-[14px] px-[14px] py-3">
          <div className="text-sm font-medium text-[#DC2626]">{loading ? '—' : `TSh ${totalWithdrawn.toLocaleString()}`}</div>
          <div className="text-2xs text-muted-foreground uppercase tracking-[0.5px] mt-[3px]">Total Withdrawn</div>
        </div>
        <div className="flex-1 bg-input-background border border-border rounded-[14px] px-[14px] py-3">
          <div className="text-sm font-medium text-primary">{balance !== null ? `TSh ${balance.toLocaleString()}` : '—'}</div>
          <div className="text-2xs text-muted-foreground uppercase tracking-[0.5px] mt-[3px]">Max Withdrawable</div>
        </div>
      </div>

      <div className="flex flex-col gap-[6px] mb-4">
        <label className="text-xs font-medium text-[#6B21E8] tracking-[0.4px]">Mobile Money Provider</label>
        <div className="relative">
          <select
            value={provider}
            onChange={e => onProviderChange(e.target.value)}
            className="w-full bg-input-background border border-border rounded-[14px] px-[14px] py-[13px] text-sm text-foreground outline-none appearance-none transition-colors focus:border-gray-400 focus:bg-white pr-10"
          >
            <option>M-Pesa (Vodacom)</option>
            <option>Airtel Money</option>
            <option>Tigo Pesa</option>
            <option>Halopesa</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[6px] mb-4">
        <label className="text-xs font-medium text-[#6B21E8] tracking-[0.4px]">Amount (TZS)</label>
        <div className="relative">
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-xs font-medium text-primary pointer-events-none">TSh</span>
          <input
            type="number"
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-input-background border border-border rounded-[14px] pl-[54px] pr-[14px] py-[13px] text-sm text-foreground outline-none transition-colors focus:border-gray-400 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-[#D97706]">
          <Info className="w-[14px] h-[14px]" />
          Maximum withdrawable: {balance !== null ? `TSh ${balance.toLocaleString()}` : '—'}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#6B7280]">
          <Info className="w-[14px] h-[14px]" />
          Minimum withdrawal: TSh 5,000
        </div>
      </div>

      <div className="flex flex-col gap-[6px] mb-4">
        <label className="text-xs font-medium text-[#6B21E8] tracking-[0.4px]">Phone Number</label>
        <div className="relative">
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-xs text-[#6B7280] flex items-center gap-1 pointer-events-none whitespace-nowrap">
            <Smartphone className="w-3.5 h-3.5" /> +255
          </span>
          <input
            type="tel"
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
            placeholder="7XX XXX XXX"
            className="w-full bg-input-background border border-border rounded-[14px] pl-[78px] pr-[14px] py-[13px] text-sm text-foreground outline-none transition-colors focus:border-gray-400 focus:bg-white"
          />
        </div>
      </div>

      <button
        onClick={onWithdraw}
        disabled={isProcessing}
        className="w-full bg-foreground text-white rounded-[16px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-[#2D0A5A] disabled:opacity-50 mt-2"
      >
        <ArrowUpRight className="w-[18px] h-[18px]" />
        {isProcessing ? 'Processing...' : 'Confirm Withdraw'}
      </button>
    </div>
  );
}
