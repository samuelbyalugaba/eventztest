import { useEffect, useState, useCallback } from 'react';
import { X, Wallet, ArrowDownToLine, Plus, ArrowUpRight, ArrowUpRight as WithdrawIcon, Smartphone } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { ntzsApi, getLocalWalletBalance } from '../utils/ntzs-api';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('M-Pesa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [ntzsAvailable, setNtzsAvailable] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadWalletData();
    }
  }, [isOpen]);

  // Subscribe to transaction changes for real-time balance updates
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

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
          // Refresh wallet data when any transaction changes
          loadWalletData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentUserId]);

  const loadWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // 1. Try nTZS balance first, fall back to local
      let ntzsBalance: number | null = null;
      try {
        const nUser = await ntzsApi.getUser(user.id, user.email || '');
        if (nUser?.id) {
          const { balanceTzs } = await ntzsApi.getBalance(nUser.id);
          ntzsBalance = balanceTzs || 0;
          setNtzsAvailable(true);
        }
      } catch (err: any) {
        if (err?.apiUnavailable) {
          setNtzsAvailable(false);
        } else {
          setNtzsAvailable(false);
        }
      }

      // 2. Always compute local balance as fallback
      const localBalance = await getLocalWalletBalance(user.id);
      setBalance(ntzsBalance !== null ? ntzsBalance : localBalance);

      const transactionSelect = `
          id, amount, currency, provider, provider_transaction_id, status, created_at, metadata,
          event:events(id, title)
        `;

      // 3. Load transaction history (include pending for deposit tracking)
      const { data: transactions } = await supabase
        .from('transactions')
        .select(transactionSelect)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactions) {
        // Only show wallet transactions (deposit, top-up, withdrawal, transfer, gift)
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
            // Reconciliation is best-effort; keep current transaction list if it fails.
          }
        }

        setTxs(walletTxs);
      }

    } catch (error: any) {
      // Don't show error toast for API unavailable — we handle it in UI
      if (!error?.apiUnavailable) {
        toast.error(`Failed to load wallet data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const pollDepositStatus = useCallback(async (depositId: string | number, _userId: string) => {
    // Poll every 3s for up to 60s to check if webhook updated the pending deposit
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
        if (await checkResolvedTransaction()) {
          return;
        }

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

      // 1. Get or create nTZS user to get internal ID
      const nUser = await ntzsApi.getUser(user.id, user.email || '');
      if (!nUser || !nUser.id) {
        throw new Error('Failed to get nTZS user account');
      }

      // 2. Initiate nTZS Deposit
      const deposit = await ntzsApi.deposit(nUser.id, Number(amount), phone);

      // 3. Record deposit in local transactions for history
      const { data: insertedTx } = await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        currency: 'TZS',
        provider: provider,
        provider_transaction_id: deposit.id,
        status: 'pending',
        metadata: {
          type: 'deposit',
          phone,
          provider,
          ntzsDepositId: deposit.id,
          providerStatus: deposit.status,
        }
      }]).select().single();
      
      toast.info('STK Push sent! Please check your phone to complete payment.');
      setShowDeposit(false);
      setAmount('');
      setPhone('');
      
      // Start polling for status update
      if (insertedTx?.id) {
        pollDepositStatus(insertedTx.id, user.id);
      } else {
        setTimeout(loadWalletData, 5000);
      }

    } catch (error: any) {
      // Handle graceful fallback errors from the proxy
      const msg = error?.message || 'Deposit failed';
      if (msg.includes('API') || msg.includes('unavailable')) {
        toast.error('Wallet service is temporarily unavailable. Please try again later.');
      } else {
        toast.error(msg);
      }
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
        toast.error('Insufficient balance');
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

      // 1. Get or create nTZS user to get internal ID
      const nUser = await ntzsApi.getUser(user.id, user.email || '');
      if (!nUser || !nUser.id) {
        throw new Error('Failed to get nTZS user account');
      }

      // 2. Initiate nTZS Withdrawal
      await ntzsApi.withdraw(nUser.id, Number(amount), phone);

      // 3. Record withdrawal in local transactions for history
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        currency: 'TZS',
        provider: provider,
        status: 'completed',
        metadata: { type: 'withdrawal', phone, provider }
      }]);
      
      toast.success('Withdrawal initiated! Funds will be sent to your M-Pesa.');
      setShowWithdraw(false);
      setAmount('');
      setPhone('');
      
      loadWalletData();

    } catch (error: any) {
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const getTxKind = (t: Tx) => {
    const metaType = t.metadata?.type;
    if (typeof metaType === 'string' && metaType.trim()) return metaType.trim();
    if (t.event) return 'payment';
    return 'payment';
  };

  const isOutflow = (kind: string) => ['payment', 'withdrawal', 'gift'].includes(kind);

  const getTxLabel = (t: Tx) => {
    const kind = getTxKind(t);
    switch (kind) {
      case 'deposit': return t.status === 'pending' ? 'Deposit (Pending)' : 'Deposit';
      case 'top-up': return 'Top Up';
      case 'withdrawal': return 'Withdrawal';
      case 'gift': return '🎁 Gift Sent';
      case 'gift-received': return '🎁 Gift Received';
      case 'transfer': return 'Transfer';
      case 'payment': return 'Payment';
      default: return 'Transaction';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl sm:shadow-xl sm:border sm:border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-600" />
            <h3 className="text-gray-900 font-semibold">Wallet</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Balance Card */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-white">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Available Balance
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">TSh {balance.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                  setShowDeposit(!showDeposit);
                  setShowWithdraw(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm transition-colors ${
                  showDeposit ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Deposit
            </button>
            <button 
              onClick={() => {
                  setShowWithdraw(!showWithdraw);
                  setShowDeposit(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-colors ${
                  showWithdraw ? 'bg-gray-100 border-gray-300 text-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <WithdrawIcon className="w-4 h-4" />
              Withdraw
            </button>
          </div>

          {/* Deposit Form */}
          {showDeposit && (
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Deposit via Mobile Money</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Mobile Money Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  >
                    <option value="M-Pesa">M-Pesa (Vodacom)</option>
                    <option value="Tigo Pesa">Mixx by Yas (Tigo Pesa)</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Halopesa">HaloPesa</option>
                    <option value="Azampesa">Azam Pesa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount (TZS)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="2557XXXXXXXX"
                        className="w-full pl-9 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Deposit'}
                </button>
              </div>
            </div>
          )}

          {/* Withdraw Form */}
          {showWithdraw && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Withdraw to Mobile Money</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount (TZS)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="2557XXXXXXXX"
                        className="w-full pl-9 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Withdraw'}
                </button>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-gray-900 font-semibold text-sm mb-2">Recent Transactions</h4>
            {loading ? (
              <div className="py-8 text-center text-gray-600 text-sm">Loading…</div>
            ) : txs.length === 0 ? (
              <div className="py-8 text-center text-gray-600 text-sm">No transactions yet</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {txs.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const kind = getTxKind(t);
                        const isOut = isOutflow(kind);
                        return (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {isOut ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-sm text-gray-900 font-medium">
                          {getTxLabel(t)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleDateString()} • {t.provider}
                          {t.status === 'pending' && ' • ⏳'}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const kind = getTxKind(t);
                      const isOut = isOutflow(kind);
                      return (
                        <span className={`text-sm font-semibold ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                          {isOut ? '-' : '+'}
                          {t.currency || 'TZS'} {t.amount.toLocaleString()}
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
