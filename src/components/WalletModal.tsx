import { useEffect, useMemo, useState } from 'react';
import { X, Wallet, CreditCard, CircleDollarSign, Calendar, ArrowDownToLine } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { currencies, extractCurrencyFromPrice } from '../utils/currencies';

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
};

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, amount, currency, provider, status, created_at,
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
    load();
  }, [isOpen]);

  const totals = useMemo(() => {
    const success = txs.filter(t => t.status === 'success');
    const totalTZS = success.reduce((sum, t) => {
      const code = t.currency || 'TZS';
      if (code === 'TZS') return sum + (t.amount || 0);
      // Fallback conversion
      const rateMap: Record<string, number> = { USD: 2600, EUR: 2800, GBP: 3200 };
      const rate = rateMap[code] || 2600;
      return sum + Math.ceil((t.amount || 0) * rate);
    }, 0);
    return { totalTZS, count: success.length };
  }, [txs]);

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
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white">
            <div>
              <p className="text-xs text-gray-500">Total Received</p>
              <p className="text-xl font-semibold text-gray-900">TSh {totals.totalTZS.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Successful Payments</p>
              <p className="text-sm font-semibold text-gray-900">{totals.count}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-gray-700">Payouts</p>
            </div>
            <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">
              Withdraw
            </button>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold text-sm mb-2">Recent Transactions</h4>
            {loading ? (
              <div className="py-8 text-center text-gray-600 text-sm">Loading…</div>
            ) : txs.length === 0 ? (
              <div className="py-8 text-center text-gray-600 text-sm">No transactions yet</div>
            ) : (
              <div className="space-y-2">
                {txs.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className={`w-4 h-4 ${t.status === 'success' ? 'text-green-600' : t.status === 'failed' ? 'text-red-600' : 'text-gray-500'}`} />
                      <div>
                        <p className="text-sm text-gray-900 font-medium">
                          {t.provider} • {t.currency || 'TZS'} {t.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${t.status === 'success' ? 'text-green-600' : t.status === 'failed' ? 'text-red-600' : 'text-gray-600'}`}>
                        {t.status.toUpperCase()}
                      </p>
                      {t.event && <p className="text-xs text-gray-500">Event: {t.event.title}</p>}
                    </div>
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
