import { useEffect, useState } from 'react';
import { X, Wallet, ArrowDownToLine, Plus, ArrowUpRight, ArrowUpRight as WithdrawIcon, Smartphone } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { ntzsApi, NtzsUser } from '../utils/ntzs-api';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tx = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadWalletData();
    }
  }, [isOpen]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get or Create nTZS User
      // We use the Supabase User ID as the external ID
      let nUser: NtzsUser;
      try {
        nUser = await ntzsApi.getUser(user.id);
        // If not found (shouldn't happen if we use create as get), create it
        if (!nUser || !nUser.id) {
           nUser = await ntzsApi.createUser(user.id, user.email || '');
        }
      } catch (err) {
        console.error('Failed to get nTZS user, creating...', err);
        nUser = await ntzsApi.createUser(user.id, user.email || '');
      }

      // 2. Get Real Balance from nTZS
      // Use the nTZS internal user ID (nUser.id), not the Supabase external ID
      if (nUser && nUser.id) {
        try {
          const { balanceTzs } = await ntzsApi.getBalance(nUser.id);
          setBalance(balanceTzs || 0);
        } catch (err) {
          console.error('Failed to fetch balance', err);
          // Fallback to 0 or local state if needed
          setBalance(0);
        }
      } else {
        console.warn('No nTZS user ID available for balance check');
        setBalance(0);
      }

      // 3. Load Transactions (For now, we might still rely on local DB if we sync them, 
      //    or we should add an endpoint to fetch nTZS history. 
      //    Let's keep the existing local DB logic for now but maybe we should sync?)
      //    Ideally, we should fetch from nTZS API if available.
      //    For this MVP, we will stick to what's in the Supabase 'transactions' table 
      //    assuming we record them there too upon success.
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id, amount, currency, provider, status, created_at, metadata,
          event:events(id, title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactions) {
        setTxs(transactions as unknown as Tx[]);
      }

    } catch (error: any) {
      console.error('Error loading wallet:', error);
      toast.error(`Failed to load wallet data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!phone) {
        toast.error('Please enter your phone number');
        return;
    }

    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get or create nTZS user to get internal ID
      const nUser = await ntzsApi.getUser(user.id);
      if (!nUser || !nUser.id) {
        throw new Error('Failed to get nTZS user account');
      }

      // 2. Initiate nTZS Deposit
      await ntzsApi.deposit(nUser.id, Number(amount), phone);
      
      // 2. Record intent in local DB (optional but good for UI immediate feedback)
      // We can assume 'pending' status.
      toast.info('STK Push sent! Please check your phone to complete payment.');
      
      // Ideally, we listen for the webhook or poll for status.
      // For MVP, we can tell the user to wait.
      setShowDeposit(false);
      setAmount('');
      
      // Refresh after a delay to see if balance updated (or wait for webhook)
      setTimeout(loadWalletData, 5000); 

    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error(error.message || 'Deposit failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
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

    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get or create nTZS user to get internal ID
      const nUser = await ntzsApi.getUser(user.id);
      if (!nUser || !nUser.id) {
        throw new Error('Failed to get nTZS user account');
      }

      // 2. Initiate nTZS Withdrawal
      await ntzsApi.withdraw(nUser.id, Number(amount), phone);
      
      toast.success('Withdrawal initiated! Funds will be sent to your M-Pesa.');
      setShowWithdraw(false);
      setAmount('');
      
      // Refresh balance immediately as funds should be deducted
      loadWalletData();

    } catch (error: any) {
      console.error('Withdrawal error:', error);
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
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Available Balance</p>
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
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Deposit via M-Pesa</h4>
              <div className="space-y-3">
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
                        const isOut = kind === 'payment' || kind === 'withdrawal';
                        return (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {isOut ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                          </div>
                        );
                      })()}
                      <div>
                        <p className="text-sm text-gray-900 font-medium capitalize">
                          {getTxKind(t) || 'Transaction'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleDateString()} • {t.provider}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const kind = getTxKind(t);
                      const isOut = kind === 'payment' || kind === 'withdrawal';
                      return (
                        <span className={`text-sm font-semibold ${isOut ? 'text-gray-900' : 'text-green-600'}`}>
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
