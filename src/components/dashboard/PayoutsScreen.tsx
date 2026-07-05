import { useState } from 'react';
import { Info, WalletCards, CreditCard, Check, QrCode, Menu } from 'lucide-react';
import { type DashboardTransaction, type ScreenId } from './types';
import { formatMoney, transactionAmount, isWithdrawalTransaction, formatTransactionTime } from './utils';
import { BackTopBar, SectionTitle, WalletCard, InfoRow, EmptyCard, DashboardMenu } from './shared';

export function PayoutsScreen({
  eventCount,
  walletBalance,
  transactions,
  onBack,
  onWithdraw,
  onGo,
  onScan,
}: {
  eventCount: number;
  walletBalance: number;
  transactions: DashboardTransaction[];
  onBack: () => void;
  onWithdraw: () => void;
  onGo: (screen: ScreenId) => void;
  onScan: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const withdrawals = transactions.filter(isWithdrawalTransaction);

  return (
    <>
      <BackTopBar
        title="Payouts"
        onBack={onBack}
        right={
          <div className="flex items-center gap-2">
            <button type="button" className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 w-[38px] h-[38px] p-0" onClick={onScan} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 w-[38px] h-[38px] p-0" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {menuOpen && (
        <DashboardMenu onClose={() => setMenuOpen(false)} onNav={(screen) => { setMenuOpen(false); onGo(screen); }} />
      )}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
        <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
          <div className="flex gap-[10px] items-start my-1 mb-[14px] rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] px-[14px] py-3 text-[#5B21B6] text-xs font-medium leading-[1.55]">
            <Info className="h-4 w-4" />
            <span>Withdraw your available balance. Completed withdrawals will appear here.</span>
          </div>
          <WalletCard eventCount={eventCount} balance={walletBalance} onWithdraw={onWithdraw} />
          <SectionTitle>Payout methods</SectionTitle>
          <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
            <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
              <span>
                <WalletCards className="h-4 w-4 text-gray-500" />
                Withdraw funds
              </span>
            </div>
            <div className="flex items-center justify-between gap-[10px] pt-[13px] border-t border-[#E9EBF0] mt-[9px]">
              <span>
                <WalletCards className="h-3.5 w-3.5" />
                Available wallet balance
              </span>
              <strong>{formatMoney(walletBalance)}</strong>
            </div>
            <button type="button" className="w-full rounded-[14px] py-[14px] px-3 mt-[11px] flex items-center justify-center gap-[9px] text-sm font-semibold tracking-[.02em] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white disabled:opacity-50 disabled:grayscale-[.25] disabled:cursor-not-allowed" onClick={onWithdraw}>
              <CreditCard className="h-4 w-4" />
              Open withdrawal
            </button>
          </div>
          <SectionTitle>Payout history</SectionTitle>
          {withdrawals.length ? (
            <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
              {withdrawals.map((transaction) => (
                <InfoRow
                  key={transaction.id}
                  icon={Check}
                  label={`${transaction.provider || transaction.metadata?.provider || 'Withdrawal'}${formatTransactionTime(transaction.created_at) ? ` - ${formatTransactionTime(transaction.created_at)}` : ''}`}
                  value={formatMoney(transactionAmount(transaction))}
                />
              ))}
            </div>
          ) : (
            <EmptyCard>No completed withdrawals yet.</EmptyCard>
          )}
        </div>
      </div>
    </>
  );
}
