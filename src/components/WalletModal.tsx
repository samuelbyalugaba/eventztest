import { Plus, ArrowUpRight, History, ShieldCheck, Info, ArrowDownLeft, Ticket, Clock, Smartphone } from 'lucide-react';
import { BackButton } from './ui/BackButton';
import { EmptyState } from './ui/EmptyState';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';
import { useWalletData, type WalletTab } from '../hooks/useWalletData';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
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
  } = useWalletData(isOpen);

  if (!isOpen) return null;

  // ---- derived data ----
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
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-secondary w-full sm:max-w-[390px] rounded-t-[28px] sm:rounded-[28px] sm:shadow-xl flex flex-col max-h-[95dvh] sm:max-h-[85vh] overflow-y-auto">

        {/* ── Topbar ── */}
        <div className="sticky top-0 z-10 bg-secondary px-5 pt-4 pb-3 flex items-center justify-between">
          <BackButton
            onClick={onClose}
            className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center border border-[#DDD6FE]"
            iconClassName="w-[18px] h-[18px] text-[#6B21E8]"
          />
          <span className="text-lg font-medium text-foreground">My Wallet</span>
        </div>

        {/* ── Balance Card ── */}
        <div className="relative mx-4 mb-5 rounded-[24px] overflow-hidden bg-gradient-to-br from-[#5B21B6] via-primary to-[#9333EA] px-6 pt-7 pb-7">
          <div className="absolute -top-[50px] -right-[50px] w-[180px] h-[180px] rounded-full bg-white/[0.07]" />
          <div className="absolute -bottom-[60px] -left-[40px] w-[150px] h-[150px] rounded-full bg-white/[0.05]" />
          <div className="absolute bottom-[30px] right-[30px] w-[80px] h-[80px] rounded-full bg-white/[0.06]" />
          <div className="absolute top-5 right-5 flex gap-[5px]">
            <div className="w-[7px] h-[7px] rounded-full bg-white/90" />
            <div className="w-[7px] h-[7px] rounded-full bg-white/30" />
            <div className="w-[7px] h-[7px] rounded-full bg-white/30" />
          </div>
          <p className="text-2xs font-medium tracking-[1.8px] text-white/60 uppercase mb-2.5 relative z-[1]">
            Total Wallet Balance
          </p>
          <div className="text-[42px] font-medium text-white relative z-[1] tracking-[-1px] mb-1.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-normal opacity-75">TSh</span>
            <span>{balance !== null ? balance.toLocaleString() : '—'}</span>
          </div>
          <div className="text-xs text-white/50 relative z-[1] flex items-center gap-1.5">
            <div className="w-[6px] h-[6px] rounded-full bg-[#4ADE80] shrink-0" />
            Live &middot; Updated just now
          </div>
        </div>

        {/* ── Main Sheet ── */}
        <div className="bg-white rounded-t-[28px] flex-1 border border-border border-b-0 px-4 pt-[22px] pb-8">

          {/* Tabs */}
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

          {/* ── Deposit Pane ── */}
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

          {/* ── Withdraw Pane ── */}
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

          {/* ── History Pane ── */}
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

          {/* ── Footer ── */}
          <p className="text-center text-xs leading-5 text-gray-500 mt-6">
            Wallet activity is subject to the{' '}
            <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-700 underline underline-offset-2">Terms</a>
            {' '}and{' '}
            <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-700 underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
