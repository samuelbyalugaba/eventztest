import { supabase } from './supabase/client';

export interface NtzsApiError {
  message: string;
  apiUnavailable?: boolean;
}

export interface NtzsUser {
  id: string;
  walletAddress: string;
  email: string;
  phone?: string;
  balanceTzs?: number;
}

export interface NtzsDeposit {
  id: string;
  status: 'pending' | 'minted' | 'failed' | 'completed' | 'confirmed' | 'success';
  amountTzs: number;
}

export interface NtzsTransfer {
  id: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface NtzsWithdrawal {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  amountTzs: number;
}

export interface NtzsReconcileResult {
  updatedTransactionIds?: Array<string | number>;
  providerBalance?: number;
  localBalance?: number;
  remainingUnreconciledAmount?: number;
}

/**
 * Client-side service to interact with the nTZS proxy edge function.
 */
export const ntzsApi = {
  _available: true as boolean,

  /**
   * Helper to call the edge function. Returns { data, apiUnavailable } on errors.
   */
  async _call(action: string, payload: any = {}) {
    const { data, error } = await supabase.functions.invoke('ntzs-proxy', {
      body: { action, payload },
    });

    if (error) {
      // Check if the error response indicates API unavailability
      const ctx = (error as any)?.context;
      if (ctx instanceof Response) {
        try {
          const body = await ctx.clone().json();
          if (body?.apiUnavailable) {
            this._available = false;
            const err: any = new Error(body.error || 'nTZS API unavailable');
            err.apiUnavailable = true;
            throw err;
          }
        } catch (e: any) {
          if (e.apiUnavailable) throw e;
        }
      }
      throw error;
    }

    if (data?.error) {
      if (data.apiUnavailable) {
        this._available = false;
        const err: any = new Error(data.error);
        err.apiUnavailable = true;
        throw err;
      }
      throw new Error(data.error);
    }

    this._available = true;
    return data;
  },

  /** Whether the nTZS API was reachable on the last call */
  isAvailable(): boolean {
    return this._available;
  },

  async createUser(userId: string, email: string, phone?: string): Promise<NtzsUser> {
    return this._call('create_user', { externalId: userId, email, phone });
  },

  async getUser(userId: string, email?: string): Promise<NtzsUser> {
    return this.createUser(userId, email || '', '');
  },

  async getBalance(ntzsUserId: string): Promise<{ balanceTzs: number }> {
    return this._call('get_balance', { userId: ntzsUserId });
  },

  async deposit(ntzsUserId: string, amountTzs: number, phone: string): Promise<NtzsDeposit> {
    return this._call('deposit', { userId: ntzsUserId, amountTzs, paymentMethod: 'mobile_money', phoneNumber: phone });
  },

  async getDepositStatus(depositId: string): Promise<NtzsDeposit> {
    return this._call('get_deposit', { depositId });
  },

  async reconcilePendingDeposits(): Promise<NtzsReconcileResult> {
    return this._call('reconcile_pending_deposits');
  },

  async transfer(fromUserId: string, toUserId: string, amountTzs: number): Promise<NtzsTransfer> {
    return this._call('transfer', { fromUserId, toUserId, amountTzs });
  },

  async withdraw(ntzsUserId: string, amountTzs: number, phone: string): Promise<NtzsWithdrawal> {
    return this._call('withdraw', { userId: ntzsUserId, amountTzs, phoneNumber: phone });
  },
};

/**
 * Calculate local wallet balance from the transactions table.
 * Sums completed deposits and subtracts completed payments/withdrawals.
 */
export async function getLocalWalletBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, metadata, status')
    .eq('user_id', userId)
    .in('status', ['completed', 'success']);

  if (error || !data) return 0;

  let balance = 0;
  for (const tx of data) {
    const type = tx.metadata?.type;
    if (type === 'deposit' || type === 'top-up' || type === 'gift-received' || type === 'ticket-sale') {
      balance += tx.amount || 0;
    } else if (type === 'withdrawal' || type === 'payment' || type === 'gift') {
      balance -= tx.amount || 0;
    }
  }
  return Math.max(0, balance);
}
