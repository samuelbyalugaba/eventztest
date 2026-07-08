import {
  Plus, ArrowUpRight, History,
  ShieldCheck, Info, ArrowDownLeft, Ticket, Clock, Smartphone,
  CreditCard,
} from 'lucide-react';
import { BackButton } from './ui/BackButton';
import { EmptyState } from './ui/EmptyState';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { useWalletData, type WalletTab } from '../hooks/useWalletData';

export function WalletPage() {
  const {
    activeTab,
    amount,
    balance,
    getTxKind,
    getTxLabel,
    handleDeposit,
    handleWithdraw,
    isOutflow,
    isProcessing,
    loading,
    phone,
    provider,
    quickAmounts,
    setActiveTab,
    setAmount,
    setPhone,
    setProvider,
    totalDeposited,
    totalWithdrawn,
    txs,
  } = useWalletData();

  const tabs: { key: WalletTab; label: string }[] = [
    { key: 'deposit', label: 'Deposit' },
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'history', label: 'History' },
  ];

  const tabIcon = (key: WalletTab) => {
    switch (key) {
      case 'deposit': return Plus;
      case 'withdraw': return ArrowUpRight;
      case 'history': return History;
    }
  };

  return (
    <div className="bg-secondary min-h-[100dvh] flex flex-col max-w-[390px] mx-auto">
      <div className="sticky top-0 z-10 bg-secondary px-5 pt-4 pb-3 flex items-center justify-between">
        <BackButton
          className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center border border-[#DDD6FE]"
          iconClassName="w-[18px] h-[18px] text-[#6B21E8]"
        />
        <span className="text-lg font-medium text-foreground">My Wallet</span>
      </div>

      <section className="bg-gradient-to-br from-primary to-[#9333EA] rounded-[18px] p-5 relative overflow-hidden text-white mx-4 mb-5">
        <div className="relative z-[1] text-2xs font-medium text-white/72 flex items-center gap-[6px] mb-[7px] uppercase tracking-[.06em]">
          <CreditCard className="h-3.5 w-3.5" />
          Total wallet balance
        </div>
        <div className="relative z-[1] text-[30px] font-bold tracking-[-1.4px] leading-[1] mb-1">{balance !== null ? `TSh ${balance.toLocaleString()}` : '—'}</div>
        <div className="relative z-[1] text-2xs font-medium text-white/55 mb-[14px]">Live &middot; Updated just now</div>
      </section>

      <div className="bg-white rounded-t-[28px] flex-1 border border-border border-b-0 px-4 pt-[22px] pb-8">
        <div className="flex bg-secondary rounded-[14px] p-[4px] mb-[22px]">
          {tabs.map(tab => {
            const Icon = tabIcon(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-center py-[9px] text-xs font-medium rounded-[11px] transition-all duration-[0.18s] flex items-center justify-center gap-1.5 ${
                  isActive ? 'bg-primary text-white' : 'text-primary'
                }`}
              >
                <Icon className="w-[15px] h-[15px]" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'deposit' && (
          <div>
            <div className="flex gap-2.5 mb-[18px]">
              <div className="flex-1 bg-input-background border border-border rounded-[14px] px-[14px] py-3">
                <div className="text-sm font-medium text-[#059669]">{loading ? '—' : `TSh ${totalDeposited.toLocaleString()}`}</div>
                <div className="text-2xs text-muted-foreground uppercase tracking-[0.5px] mt-[3px]">Total Deposited</div>
              </div>
              <div className="flex-1 bg-input-background border border-border rounded-[14px] px-[14px] py-3">
                <div className="text-sm font-medium text-primary">M-Pesa</div>
                <div className="text-2xs text-muted-foreground uppercase tracking-[0.5px] mt-[3px]">Default method</div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px] mb-4">
              <label className="text-xs font-medium text-[#6B21E8] tracking-[0.4px]">Mobile Money Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
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
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-input-background border border-border rounded-[14px] pl-[54px] pr-[14px] py-[13px] text-sm text-foreground outline-none transition-colors focus:border-gray-400 focus:bg-white"
                />
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {quickAmounts.map(qa => (
                  <button
                    key={qa}
                    onClick={() => setAmount(String(qa))}
                    className={`px-[15px] py-[7px] rounded-[20px] text-xs font-medium transition-all ${
                      Number(amount) === qa
                        ? 'bg-primary text-white border border-primary'
                        : 'bg-secondary text-primary border border-[#DDD6FE]'
                    }`}
                  >
                    {qa >= 1000 ? `${(qa / 1000).toFixed(0)}K` : qa}
                  </button>
                ))}
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
                  onChange={e => setPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="w-full bg-input-background border border-border rounded-[14px] pl-[78px] pr-[14px] py-[13px] text-sm text-foreground outline-none transition-colors focus:border-gray-400 focus:bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleDeposit}
              disabled={isProcessing}
              className="w-full bg-primary text-white rounded-[16px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-primary-dark disabled:opacity-50 mt-2"
            >
              <ShieldCheck className="w-[18px] h-[18px]" />
              {isProcessing ? 'Processing...' : 'Confirm Deposit'}
            </button>
          </div>
        )}

        {activeTab === 'withdraw' && (
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
                  onChange={e => setProvider(e.target.value)}
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
                  onChange={e => setAmount(e.target.value)}
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
                  onChange={e => setPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="w-full bg-input-background border border-border rounded-[14px] pl-[78px] pr-[14px] py-[13px] text-sm text-foreground outline-none transition-colors focus:border-gray-400 focus:bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isProcessing}
              className="w-full bg-foreground text-white rounded-[16px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-[#2D0A5A] disabled:opacity-50 mt-2"
            >
              <ArrowUpRight className="w-[18px] h-[18px]" />
              {isProcessing ? 'Processing...' : 'Confirm Withdraw'}
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {loading ? (
              <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : txs.length === 0 ? (
              <EmptyState title="No transactions yet" />
            ) : (
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
            )}
          </div>
        )}

        <p className="text-center text-xs leading-5 text-gray-500 mt-6">
          Wallet activity is subject to the{' '}
          <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-700 underline underline-offset-2">Terms</a>
          {' '}and{' '}
          <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-700 underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
