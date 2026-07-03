import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MoreVertical, Plus, ArrowUpRight, History,
  ShieldCheck, Info, ArrowDownLeft, Ticket, Clock, Smartphone,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { ntzsApi, getLocalWalletBalance } from '../utils/ntzs-api';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../utils/legal';

type Tx = {
  id: string | number;
  amount: number;
  currency: string;
  provider: string;
  provider_transaction_id?: string | null;
  status: string;
  created_at: string;
  event?: { id: number; title: string } | null;
  metadata?: any;
};

function getFullPhone(p: string) {
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return '255' + digits.slice(1);
  return '255' + digits;
}

export function WalletPage() {
  const navigate = useNavigate();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('M-Pesa (Vodacom)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [ntzsAvailable, setNtzsAvailable] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`wallet-txs-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadWalletData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      let ntzsBalance: number | null = null;
      try {
        const nUser = await ntzsApi.getUser(user.id, user.email || '');
        if (nUser?.id) {
          const { balanceTzs } = await ntzsApi.getBalance(nUser.id);
          ntzsBalance = balanceTzs || 0;
          setNtzsAvailable(true);
        }
      } catch {
        setNtzsAvailable(false);
      }

      const localBalance = await getLocalWalletBalance(user.id);
      setBalance(ntzsBalance !== null ? ntzsBalance : localBalance);

      const transactionSelect = `
          id, amount, currency, provider, provider_transaction_id, status, created_at, metadata,
          event:events(id, title)
        `;

      const { data: transactions } = await supabase
        .from('transactions')
        .select(transactionSelect)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactions) {
        const walletTypes = ['deposit', 'top-up', 'withdrawal', 'transfer', 'gift'];
        const walletTxs = (transactions as unknown as Tx[]).filter(t => {
          const metaType = t.metadata?.type;
          return typeof metaType === 'string' && walletTypes.includes(metaType.trim());
        });

        const hasPendingDeposits = walletTxs.some(
          (tx) => tx.status === 'pending' && tx.metadata?.type === 'deposit'
        );

        if (ntzsBalance !== null && hasPendingDeposits && ntzsBalance > localBalance) {
          try {
            const reconciliation = await ntzsApi.reconcilePendingDeposits();
            if (reconciliation?.updatedTransactionIds?.length) {
              const { data: refreshedTransactions } = await supabase
                .from('transactions')
                .select(transactionSelect)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

              if (refreshedTransactions) {
                const refreshedWalletTxs = (refreshedTransactions as unknown as Tx[]).filter(t => {
                  const metaType = t.metadata?.type;
                  return typeof metaType === 'string' && walletTypes.includes(metaType.trim());
                });
                setTxs(refreshedWalletTxs);
                return;
              }
            }
          } catch {
            // reconciliation is best-effort
          }
        }

        setTxs(walletTxs);
      }
    } catch (error: any) {
      if (!error?.apiUnavailable) {
        toast.error(`Failed to load wallet data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const pollDepositStatus = useCallback(async (depositId: string | number, _userId: string) => {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 3000;

    const checkResolvedTransaction = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('id', depositId)
        .single();

      if (data && data.status !== 'pending') {
        if (data.status === 'success' || data.status === 'completed') {
          toast.success('Deposit completed successfully!');
        } else if (data.status === 'failed') {
          toast.error('Deposit failed. Please try again.');
        }
        await loadWalletData();
        return true;
      }
      return false;
    };

    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;

      try {
        if (await checkResolvedTransaction()) return;

        if (attempts === 1 || attempts % 2 === 0) {
          const reconciliation = await ntzsApi.reconcilePendingDeposits();
          if (reconciliation?.updatedTransactionIds?.length && await checkResolvedTransaction()) {
            return;
          }
        }

        if (attempts % 3 === 0) {
          await loadWalletData();
        }
      } catch {
        // ignore polling errors
      }

      setTimeout(poll, interval);
    };

    setTimeout(poll, interval);
  }, [loadWalletData]);

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!ntzsAvailable) {
      toast.error('Wallet service is temporarily unavailable. Please try again later.');
      return;
    }

    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nUser = await ntzsApi.getUser(user.id, user.email || '');
      if (!nUser || !nUser.id) {
        throw new Error('Failed to get nTZS user account');
      }

      const fullPhone = getFullPhone(phone);
      const deposit = await ntzsApi.deposit(nUser.id, Number(amount), fullPhone);

      const { data: insertedTx } = await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        currency: 'TZS',
        provider: provider,
        provider_transaction_id: deposit.id,
        status: 'pending',
        metadata: {
          type: 'deposit',
          phone: fullPhone,
          provider,
          ntzsDepositId: deposit.id,
          providerStatus: deposit.status,
        }
      }]).select().single();

      toast.success('Confirm PIN in your mobile');
      setAmount('');
      setPhone('');

      if (insertedTx?.id) {
        pollDepositStatus(insertedTx.id, user.id);
      } else {
        setTimeout(loadWalletData, 5000);
      }

    } catch {
      toast.error('Internal error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (Number(amount) < 5000) {
      toast.error('Minimum withdrawal amount is TSh 5,000');
      return;
    }
    if (Number(amount) > balance) {
      toast.error(`Insufficient balance. Available: TSh ${balance.toLocaleString()}`);
      return;
    }
    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!ntzsAvailable) {
      toast.error('Wallet service is temporarily unavailable. Please try again later.');
      return;
    }

    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nUser = await ntzsApi.getUser(user.id, user.email || '');
      if (!nUser || !nUser.id) {
        throw new Error('Failed to get nTZS user account');
      }

      const fullPhone = getFullPhone(phone);
      await ntzsApi.withdraw(nUser.id, Number(amount), fullPhone);

      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        currency: 'TZS',
        provider: provider,
        status: 'completed',
        metadata: { type: 'withdrawal', phone: fullPhone, provider }
      }]);

      toast.success('Confirm PIN in your mobile');
      setAmount('');
      setPhone('');
      loadWalletData();

    } catch (error: any) {
      if (error?.code === 'amount_too_high') {
        const suggestedAmount = Number(error?.suggestedAmount || 0);
        if (suggestedAmount >= 5000) {
          setAmount(String(suggestedAmount));
        }
        toast.error(suggestedAmount >= 5000 ? `Amount too high. Try TSh ${suggestedAmount.toLocaleString()} or less.` : 'Amount too high. Try a smaller amount.');
      } else {
        toast.error('Internal error.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- derived data ----
  const totalDeposited = txs
    .filter(t => t.metadata?.type === 'deposit' && t.status !== 'pending')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalWithdrawn = txs
    .filter(t => t.metadata?.type === 'withdrawal')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const quickAmounts = [5000, 10000, 20000, 50000, 100000];

  const getTxKind = (t: Tx) => {
    const metaType = t.metadata?.type;
    if (typeof metaType === 'string' && metaType.trim()) return metaType.trim();
    return 'payment';
  };

  const isOutflow = (kind: string) => ['payment', 'withdrawal', 'gift'].includes(kind);

  const getTxLabel = (t: Tx) => {
    const kind = getTxKind(t);
    switch (kind) {
      case 'deposit': return t.status === 'pending' ? 'Deposit (Pending)' : 'Deposit';
      case 'top-up': return 'Top Up';
      case 'withdrawal': return 'Withdrawal';
      case 'gift': return 'Gift Sent';
      case 'gift-received': return 'Gift Received';
      case 'transfer': return 'Transfer';
      case 'payment': return t.event?.title ? `Ticket — ${t.event.title}` : 'Payment';
      default: return 'Transaction';
    }
  };

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'deposit', label: 'Deposit' },
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'history', label: 'History' },
  ];

  const tabIcon = (key: typeof activeTab) => {
    switch (key) {
      case 'deposit': return Plus;
      case 'withdraw': return ArrowUpRight;
      case 'history': return History;
    }
  };

  return (
    <div className="bg-[#F4F1FF] min-h-[100dvh] flex flex-col max-w-[390px] mx-auto">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-10 bg-[#F4F1FF] px-5 pt-4 pb-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center border border-[#DDD6FE]">
          <ArrowLeft className="w-[18px] h-[18px] text-[#6B21E8]" />
        </button>
        <span className="text-lg font-medium text-[#1A0533]">My Wallet</span>
        <button className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center border border-[#DDD6FE]">
          <MoreVertical className="w-[18px] h-[18px] text-[#6B21E8]" />
        </button>
      </div>

      {/* ── Balance Card ── */}
      <div className="relative mx-4 mb-5 rounded-[24px] overflow-hidden bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#9333EA] px-6 pt-7 pb-7">
        <div className="absolute -top-[50px] -right-[50px] w-[180px] h-[180px] rounded-full bg-white/[0.07]" />
        <div className="absolute -bottom-[60px] -left-[40px] w-[150px] h-[150px] rounded-full bg-white/[0.05]" />
        <div className="absolute bottom-[30px] right-[30px] w-[80px] h-[80px] rounded-full bg-white/[0.06]" />
        <div className="absolute top-5 right-5 flex gap-[5px]">
          <div className="w-[7px] h-[7px] rounded-full bg-white/90" />
          <div className="w-[7px] h-[7px] rounded-full bg-white/30" />
          <div className="w-[7px] h-[7px] rounded-full bg-white/30" />
        </div>
        <p className="text-[10px] font-medium tracking-[1.8px] text-white/60 uppercase mb-2.5 relative z-[1]">
          Total Wallet Balance
        </p>
        <div className="text-[42px] font-medium text-white relative z-[1] tracking-[-1px] mb-1.5 flex items-baseline gap-1.5">
          <span className="text-[22px] font-normal opacity-75">TSh</span>
          <span>{balance.toLocaleString()}</span>
        </div>
        <div className="text-[11px] text-white/50 relative z-[1] flex items-center gap-1.5">
          <div className="w-[6px] h-[6px] rounded-full bg-[#4ADE80] shrink-0" />
          Live &middot; Updated just now
        </div>
      </div>

      {/* ── Main Sheet ── */}
      <div className="bg-white rounded-t-[28px] flex-1 border border-[#EDE9FE] border-b-0 px-4 pt-[22px] pb-8">

        {/* Tabs */}
        <div className="flex bg-[#F4F1FF] rounded-[14px] p-[4px] mb-[22px]">
          {tabs.map(tab => {
            const Icon = tabIcon(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-center py-[9px] text-[13px] font-medium rounded-[11px] transition-all duration-[0.18s] flex items-center justify-center gap-1.5 ${
                  isActive ? 'bg-[#7C3AED] text-white' : 'text-[#7C3AED]'
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
              <div className="flex-1 bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] px-[14px] py-3">
                <div className="text-[15px] font-medium text-[#059669]">TSh {totalDeposited.toLocaleString()}</div>
                <div className="text-[10px] text-[#8B7BB0] uppercase tracking-[0.5px] mt-[3px]">Total Deposited</div>
              </div>
              <div className="flex-1 bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] px-[14px] py-3">
                <div className="text-[15px] font-medium text-[#7C3AED]">M-Pesa</div>
                <div className="text-[10px] text-[#8B7BB0] uppercase tracking-[0.5px] mt-[3px]">Default method</div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px] mb-4">
              <label className="text-[12px] font-medium text-[#6B21E8] tracking-[0.4px]">Mobile Money Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] px-[14px] py-[13px] text-[14px] text-[#1A0533] outline-none appearance-none transition-colors focus:border-[#7C3AED] focus:bg-white pr-10"
                >
                  <option>M-Pesa (Vodacom)</option>
                  <option>Airtel Money</option>
                  <option>Tigo Pesa</option>
                  <option>Halopesa</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#7C3AED]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px] mb-4">
              <label className="text-[12px] font-medium text-[#6B21E8] tracking-[0.4px]">Amount (TZS)</label>
              <div className="relative">
                <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#7C3AED] pointer-events-none">TSh</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] pl-[54px] pr-[14px] py-[13px] text-[14px] text-[#1A0533] outline-none transition-colors focus:border-[#7C3AED] focus:bg-white"
                />
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {quickAmounts.map(qa => (
                  <button
                    key={qa}
                    onClick={() => setAmount(String(qa))}
                    className={`px-[15px] py-[7px] rounded-[20px] text-[12px] font-medium transition-all ${
                      Number(amount) === qa
                        ? 'bg-[#7C3AED] text-white border border-[#7C3AED]'
                        : 'bg-[#F4F1FF] text-[#7C3AED] border border-[#DDD6FE]'
                    }`}
                  >
                    {qa >= 1000 ? `${(qa / 1000).toFixed(0)}K` : qa}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[6px] mb-4">
              <label className="text-[12px] font-medium text-[#6B21E8] tracking-[0.4px]">Phone Number</label>
              <div className="relative">
                <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[13px] text-[#6B7280] flex items-center gap-1 pointer-events-none whitespace-nowrap">
                  <Smartphone className="w-3.5 h-3.5" /> +255
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="w-full bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] pl-[78px] pr-[14px] py-[13px] text-[14px] text-[#1A0533] outline-none transition-colors focus:border-[#7C3AED] focus:bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleDeposit}
              disabled={isProcessing}
              className="w-full bg-[#7C3AED] text-white rounded-[16px] py-4 text-[15px] font-medium flex items-center justify-center gap-2 transition-colors hover:bg-[#6D28D9] disabled:opacity-50 mt-2"
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
              <div className="flex-1 bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] px-[14px] py-3">
                <div className="text-[15px] font-medium text-[#DC2626]">TSh {totalWithdrawn.toLocaleString()}</div>
                <div className="text-[10px] text-[#8B7BB0] uppercase tracking-[0.5px] mt-[3px]">Total Withdrawn</div>
              </div>
              <div className="flex-1 bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] px-[14px] py-3">
                <div className="text-[15px] font-medium text-[#7C3AED]">TSh {balance.toLocaleString()}</div>
                <div className="text-[10px] text-[#8B7BB0] uppercase tracking-[0.5px] mt-[3px]">Max Withdrawable</div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px] mb-4">
              <label className="text-[12px] font-medium text-[#6B21E8] tracking-[0.4px]">Mobile Money Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] px-[14px] py-[13px] text-[14px] text-[#1A0533] outline-none appearance-none transition-colors focus:border-[#7C3AED] focus:bg-white pr-10"
                >
                  <option>M-Pesa (Vodacom)</option>
                  <option>Airtel Money</option>
                  <option>Tigo Pesa</option>
                  <option>Halopesa</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#7C3AED]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px] mb-4">
              <label className="text-[12px] font-medium text-[#6B21E8] tracking-[0.4px]">Amount (TZS)</label>
              <div className="relative">
                <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#7C3AED] pointer-events-none">TSh</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] pl-[54px] pr-[14px] py-[13px] text-[14px] text-[#1A0533] outline-none transition-colors focus:border-[#7C3AED] focus:bg-white"
                />
              </div>
                <div className="flex items-center gap-1 mt-1.5 text-[12px] text-[#D97706]">
                  <Info className="w-[14px] h-[14px]" />
                  Maximum withdrawable: TSh {balance.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#6B7280]">
                  <Info className="w-[14px] h-[14px]" />
                  Minimum withdrawal: TSh 5,000
                </div>
              </div>

              <div className="flex flex-col gap-[6px] mb-4">
                <label className="text-[12px] font-medium text-[#6B21E8] tracking-[0.4px]">Phone Number</label>
              <div className="relative">
                <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[13px] text-[#6B7280] flex items-center gap-1 pointer-events-none whitespace-nowrap">
                  <Smartphone className="w-3.5 h-3.5" /> +255
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="w-full bg-[#FAFAFA] border border-[#EDE9FE] rounded-[14px] pl-[78px] pr-[14px] py-[13px] text-[14px] text-[#1A0533] outline-none transition-colors focus:border-[#7C3AED] focus:bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isProcessing}
              className="w-full bg-[#1A0533] text-white rounded-[16px] py-4 text-[15px] font-medium flex items-center justify-center gap-2 transition-colors hover:bg-[#2D0A5A] disabled:opacity-50 mt-2"
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
              <div className="py-8 text-center text-gray-500 text-sm">No transactions yet</div>
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
                    <div key={t.id} className="flex items-center gap-3 py-[13px] border-b border-[#F4F1FF] last:border-b-0">
                      <div className={`w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shrink-0 ${bgClass}`}>
                        <Icon className={`w-[18px] h-[18px] ${iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-[#1A0533] truncate">{getTxLabel(t)}</div>
                        <div className="text-[11px] text-[#8B7BB0] mt-[2px]">
                          {new Date(t.created_at).toLocaleDateString()} &middot; {t.status === 'pending' ? 'Pending' : t.provider}
                        </div>
                      </div>
                      <span className={`text-[14px] font-medium shrink-0 ${
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
        <p className="text-center text-[11px] leading-5 text-gray-500 mt-6">
          Wallet activity is subject to the{' '}
          <a href={TERMS_OF_SERVICE_URL} className="font-medium text-gray-700 underline underline-offset-2">Terms</a>
          {' '}and{' '}
          <a href={PRIVACY_POLICY_URL} className="font-medium text-gray-700 underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
