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
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={onScan} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {menuOpen && (
        <DashboardMenu onClose={() => setMenuOpen(false)} onNav={(screen) => { setMenuOpen(false); onGo(screen); }} />
      )}
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-info-banner">
            <Info className="h-4 w-4" />
            <span>Withdraw your available balance. Completed withdrawals will appear here.</span>
          </div>
          <WalletCard eventCount={eventCount} balance={walletBalance} onWithdraw={onWithdraw} />
          <SectionTitle>Payout methods</SectionTitle>
          <div className="dash-card">
            <div className="dash-card-title">
              <span>
                <WalletCards className="h-4 w-4 text-gray-500" />
                Withdraw funds
              </span>
            </div>
            <div className="dash-payout-summary">
              <span>
                <WalletCards className="h-3.5 w-3.5" />
                Available wallet balance
              </span>
              <strong>{formatMoney(walletBalance)}</strong>
            </div>
            <button type="button" className="dash-primary-btn" onClick={onWithdraw}>
              <CreditCard className="h-4 w-4" />
              Open withdrawal
            </button>
          </div>
          <SectionTitle>Payout history</SectionTitle>
          {withdrawals.length ? (
            <div className="dash-card">
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
