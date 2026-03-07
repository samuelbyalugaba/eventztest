import { useEffect, useMemo, useState } from 'react';
import { X, Wallet, CreditCard, CircleDollarSign, Calendar, ArrowDownToLine, Plus, ArrowUpRight } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { currencies, extractCurrencyFromPrice } from '../utils/currencies';
import { toast } from 'sonner';
import { createTransaction } from '../utils/supabase/api';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tx = {
  id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
  event?: { id: number; title: string } | null;
  type?: 'payment' | 'deposit' | 'withdrawal' | 'refund';
};

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, amount, currency, provider, status, created_at, type,
        event:events(id, title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTxs(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen]);

  const totals = useMemo(() => {
    // Calculate actual balance: (Deposits + Income) - (Withdrawals + Payments)
    // Assuming 'amount' is always positive in DB and 'type' determines sign, or provider logic
    // Based on existing code, it seems to just sum 'success' transactions.
    // Let's refine this:
    // If we add 'type' to transactions table, we can distinguish.
    // If not, we might need to rely on provider. 
    // For now, let's assume all 'success' transactions add to balance unless they are 'payment' type?
    // Existing code:
    /*
    const totalTZS = success.reduce((sum, t) => {
      ... return sum + amount
    }, 0);
    */
    // We need to support spending.
    // Let's assume:
    // type='deposit' -> +
    // type='income' (ticket sales) -> +
    // type='payment' (buying tickets) -> -
    // type='withdrawal' -> -
    
    // Since we don't know if 'type' column exists for sure, we'll try to use it if present in data, 
    // or infer from provider/context.
    
    const success = txs.filter(t => t.status === 'success');
    let balance = 0;
    
    success.forEach(t => {
      let amount = t.amount || 0;
      const code = t.currency || 'TZS';
      
      // Normalize to TZS for display
      if (code !== 'TZS') {
         const rateMap: Record<string, number> = { USD: 2600, EUR: 2800, GBP: 3200 };
         const rate = rateMap[code] || 2600;
         amount = Math.ceil(amount * rate);
      }

      // Logic to determine sign
      // If t.type exists, use it.
      if (t.type) {
        if (['deposit', 'income', 'refund'].includes(t.type)) {
          balance += amount;
        } else if (['payment', 'withdrawal'].includes(t.type)) {
          balance -= amount;
        }
      } else {
        // Fallback inference
        if (t.provider === 'wallet' && !t.event) {
             // likely a withdrawal or internal transfer? ambiguous without type
             // defaulting to positive for backward compat unless it's clearly a spend
             balance += amount; 
        } else {
             balance += amount;
        }
      }
    });

    return { totalTZS: balance, count: success.length };
  }, [txs]);

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a deposit transaction
      // In a real app, this would trigger a payment gateway (Stripe/Mobile Money) first.
      // Here we simulate a successful deposit.
      await createTransaction({
        amount: Number(depositAmount),
        currency: 'TZS',
        provider: 'Mobile Money', // Simulating external deposit
        status: 'success',
        type: 'deposit',
        user_id: user.id
      });

      toast.success('Deposit successful!');
      setDepositAmount('');
      setShowDeposit(false);
      loadTransactions(); // Refresh
    } catch (error) {
      console.error('Deposit failed:', error);
      toast.error('Deposit failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

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
              <p className="text-2xl font-bold text-gray-900 mt-1">TSh {totals.totalTZS.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowDeposit(!showDeposit)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Deposit
            </button>
            <button className="flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </button>
          </div>

          {/* Deposit Form */}
          {showDeposit && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Top up Wallet</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount (TZS)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Deposit'}
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        t.type === 'deposit' || t.type === 'income' ? 'bg-green-100 text-green-600' : 
                        t.type === 'payment' || t.type === 'withdrawal' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.type === 'deposit' || t.type === 'income' ? <ArrowDownToLine className="w-4 h-4" /> : 
                         t.type === 'payment' || t.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4" /> : <CircleDollarSign className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 font-medium capitalize">
                          {t.type || 'Transaction'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleDateString()} • {t.provider}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      t.type === 'deposit' || t.type === 'income' ? 'text-green-600' : 
                      t.type === 'payment' || t.type === 'withdrawal' ? 'text-gray-900' : 'text-gray-900'
                    }`}>
                      {t.type === 'payment' || t.type === 'withdrawal' ? '-' : '+'}
                      {t.currency || 'TZS'} {t.amount.toLocaleString()}
                    </span>
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
