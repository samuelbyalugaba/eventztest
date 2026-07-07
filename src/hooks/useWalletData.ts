import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useProfileStore } from '../store/profileStore';
import { ntzsApi, getLocalWalletBalance } from '../utils/ntzs-api';
import { supabase } from '../utils/supabase/client';
import { getFullPhoneNumber } from '../utils/media';

export type WalletTab = 'deposit' | 'withdraw' | 'history';

export type WalletTransaction = {
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

const WALLET_TYPES = ['deposit', 'top-up', 'withdrawal', 'transfer', 'gift'];
const transactionSelect = `
  id, amount, currency, provider, provider_transaction_id, status, created_at, metadata,
  event:events(id, title)
`;

function filterWalletTransactions(transactions: unknown) {
  if (!Array.isArray(transactions)) return [];
  return (transactions as WalletTransaction[]).filter((transaction) => {
    const metaType = transaction.metadata?.type;
    return typeof metaType === 'string' && WALLET_TYPES.includes(metaType.trim());
  });
}

export function useWalletData(isActive = true) {
  const cachedBalance = useProfileStore((state) => state.walletBalance);
  const cachedTransactions = useProfileStore((state) => state.dashboardCache?.transactions);

  const [txs, setTxs] = useState<WalletTransaction[]>(() => filterWalletTransactions(cachedTransactions));
  const [loading, setLoading] = useState(() => cachedBalance === null && !cachedTransactions?.length);
  const [activeTab, setActiveTab] = useState<WalletTab>('deposit');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('M-Pesa (Vodacom)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState<number | null>(cachedBalance);
  const [ntzsAvailable, setNtzsAvailable] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadWalletData = useCallback(async (forceLoading = false) => {
    try {
      if (forceLoading) setLoading(true);
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
      } catch (error) {
        console.warn('nTZS balance lookup failed', error);
        setNtzsAvailable(false);
      }

      const localBalance = await getLocalWalletBalance(user.id);
      const resolvedBalance = ntzsBalance !== null ? ntzsBalance : localBalance;
      setBalance(resolvedBalance);
      useProfileStore.getState().setWalletBalance(resolvedBalance);

      const { data: transactions } = await supabase
        .from('transactions')
        .select(transactionSelect)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const walletTxs = filterWalletTransactions(transactions);
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

            setTxs(filterWalletTransactions(refreshedTransactions));
            return;
          }
        } catch (error) {
          console.warn('Wallet reconciliation failed', error);
        }
      }

      setTxs(walletTxs);
    } catch (error: any) {
      if (!error?.apiUnavailable) {
        toast.error(`Failed to load wallet data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      if (forceLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const noCache = cachedBalance === null && !cachedTransactions?.length;
    void loadWalletData(noCache);
  }, [cachedBalance, cachedTransactions?.length, isActive, loadWalletData]);

  useEffect(() => {
    if (!isActive || !currentUserId) return;
    const mountId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    const channel = supabase
      .channel(`wallet-txs-${currentUserId}-${mountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void loadWalletData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, isActive, loadWalletData]);

  const pollDepositStatus = useCallback(async (depositId: string | number) => {
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
      } catch (error) {
        console.warn('Deposit status poll failed', error);
      }

      setTimeout(poll, interval);
    };

    setTimeout(poll, interval);
  }, [loadWalletData]);

  const handleDeposit = useCallback(async () => {
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
      if (!nUser?.id) throw new Error('Failed to get nTZS user account');

      const fullPhone = getFullPhoneNumber(phone);
      const deposit = await ntzsApi.deposit(nUser.id, Number(amount), fullPhone);

      const { data: insertedTx } = await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        currency: 'TZS',
        provider,
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
        void pollDepositStatus(insertedTx.id);
      } else {
        setTimeout(loadWalletData, 5000);
      }
    } catch (error) {
      console.error('Deposit failed', error);
      toast.error('Could not start deposit. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [amount, loadWalletData, ntzsAvailable, phone, pollDepositStatus, provider]);

  const handleWithdraw = useCallback(async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (Number(amount) < 5000) {
      toast.error('Minimum withdrawal amount is TSh 5,000');
      return;
    }
    if (balance !== null && Number(amount) > balance) {
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
      if (!nUser?.id) throw new Error('Failed to get nTZS user account');

      const fullPhone = getFullPhoneNumber(phone);
      await ntzsApi.withdraw(nUser.id, Number(amount), fullPhone);

      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(amount),
        currency: 'TZS',
        provider,
        status: 'completed',
        metadata: { type: 'withdrawal', phone: fullPhone, provider }
      }]);

      toast.success('Confirm PIN in your mobile');
      setAmount('');
      setPhone('');
      void loadWalletData();
    } catch (error: any) {
      if (error?.code === 'amount_too_high') {
        const suggestedAmount = Number(error?.suggestedAmount || 0);
        if (suggestedAmount >= 5000) setAmount(String(suggestedAmount));
        toast.error(suggestedAmount >= 5000 ? `Amount too high. Try TSh ${suggestedAmount.toLocaleString()} or less.` : 'Amount too high. Try a smaller amount.');
      } else {
        console.error('Withdrawal failed', error);
        toast.error('Could not start withdrawal. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [amount, balance, loadWalletData, ntzsAvailable, phone, provider]);

  const totalDeposited = txs
    .filter(t => t.metadata?.type === 'deposit' && t.status !== 'pending')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalWithdrawn = txs
    .filter(t => t.metadata?.type === 'withdrawal')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const getTxKind = (transaction: WalletTransaction) => {
    const metaType = transaction.metadata?.type;
    if (typeof metaType === 'string' && metaType.trim()) return metaType.trim();
    return 'payment';
  };

  const isOutflow = (kind: string) => ['payment', 'withdrawal', 'gift'].includes(kind);

  const getTxLabel = (transaction: WalletTransaction) => {
    const kind = getTxKind(transaction);
    switch (kind) {
      case 'deposit': return transaction.status === 'pending' ? 'Deposit (Pending)' : 'Deposit';
      case 'top-up': return 'Top Up';
      case 'withdrawal': return 'Withdrawal';
      case 'gift': return 'Gift Sent';
      case 'gift-received': return 'Gift Received';
      case 'transfer': return 'Transfer';
      case 'payment': return transaction.event?.title ? `Ticket - ${transaction.event.title}` : 'Payment';
      default: return 'Transaction';
    }
  };

  return {
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
    quickAmounts: [5000, 10000, 20000, 50000, 100000],
    setActiveTab,
    setAmount,
    setPhone,
    setProvider,
    totalDeposited,
    totalWithdrawn,
    txs,
  };
}
