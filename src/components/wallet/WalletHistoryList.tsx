import { ArrowUpRight, ArrowDownLeft, Ticket, Clock } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import type { WalletTransaction } from '../../hooks/useWalletData';

interface WalletHistoryListProps {
  txs: WalletTransaction[];
  loading: boolean;
  getTxKind: (tx: WalletTransaction) => string;
  getTxLabel: (tx: WalletTransaction) => string;
  isOutflow: (kind: string) => boolean;
}

export function WalletHistoryList({ txs, loading, getTxKind, getTxLabel, isOutflow }: WalletHistoryListProps) {
  if (loading) {
    return <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>;
  }

  if (txs.length === 0) {
    return <EmptyState title="No transactions yet" />;
  }

  return (
    <div>
      {txs.map(t => {
        const kind = getTxKind(t);
        const isOut = isOutflow(kind);

        let Icon: typeof Clock;
        let bgClass: string;
        let iconClass: string;

        if (t.status === 'pending') {
          Icon = Clock;
          bgClass = 'bg-[#FFFBEB]';
          iconClass = 'text-[#D97706]';
        } else if (isOut) {
          Icon = kind === 'payment' ? Ticket : ArrowUpRight;
          bgClass = 'bg-[#FEF3F2]';
          iconClass = 'text-[#DC2626]';
        } else {
          Icon = ArrowDownLeft;
          bgClass = 'bg-[#ECFDF5]';
          iconClass = 'text-[#059669]';
        }

        return (
          <div key={t.id} className="flex items-center gap-3 py-[13px] border-b border-secondary last:border-b-0">
            <div className={`w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shrink-0 ${bgClass}`}>
              <Icon className={`w-[18px] h-[18px] ${iconClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{getTxLabel(t)}</div>
              <div className="text-xs text-muted-foreground mt-[2px]">
                {new Date(t.created_at).toLocaleDateString()} &middot; {t.status === 'pending' ? 'Pending' : t.provider}
              </div>
            </div>
            <span className={`text-sm font-medium shrink-0 ${
              isOut ? 'text-[#DC2626]' : 'text-[#059669]'
            }`}>
              {isOut ? '-' : '+'}{t.currency || 'TZS'} {t.amount.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
