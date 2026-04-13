import { supabase } from './supabase/client';

export interface NtzsUser {
  id: string;
  walletAddress: string;
  email: string;
  phone?: string;
  balanceTzs?: number;
}

export interface NtzsDeposit {
  id: string;
  status: 'pending' | 'minted' | 'failed';
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

/**
 * Client-side service to interact with the nTZS proxy edge function.
 */
export const ntzsApi = {
  
  /**
   * Helper to call the edge function
   */
  async _call(action: string, payload: any = {}) {
    const { data, error } = await supabase.functions.invoke('ntzs-proxy', {
      body: { action, payload },
    });

    if (error) {
      throw error;
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * Create or retrieve an nTZS user
   */
  async createUser(userId: string, email: string, phone?: string): Promise<NtzsUser> {
    return this._call('create_user', {
      externalId: userId,
      email,
      phone
    });
  },

  /**
   * Get user profile and balance
   * Uses createUser as idempotent get-or-create since nTZS API supports this pattern
   * Note: We need to pass at least an email, so this should be called with email from the caller
   */
  async getUser(userId: string, email?: string): Promise<NtzsUser> {
    // nTZS API: "Calling create with the same externalId returns the existing user."
    // So we can safely use createUser as a get-or-create pattern
    // Pass email if provided, otherwise use empty string (API may require it)
    return this.createUser(userId, email || '', ''); 
  },

  /**
   * Get user balance
   */
  async getBalance(ntzsUserId: string): Promise<{ balanceTzs: number }> {
    return this._call('get_balance', { userId: ntzsUserId });
  },

  /**
   * Initiate a deposit (M-Pesa STK Push)
   */
  async deposit(ntzsUserId: string, amountTzs: number, phone: string): Promise<NtzsDeposit> {
    return this._call('deposit', {
      userId: ntzsUserId,
      amountTzs,
      phone
    });
  },

  /**
   * Check deposit status
   */
  async getDepositStatus(depositId: string): Promise<NtzsDeposit> {
    return this._call('get_deposit', { depositId });
  },

  /**
   * Transfer nTZS to another user
   */
  async transfer(fromUserId: string, toUserId: string, amountTzs: number): Promise<NtzsTransfer> {
    return this._call('transfer', {
      fromUserId,
      toUserId,
      amountTzs
    });
  },

  /**
   * Withdraw nTZS to M-Pesa
   */
  async withdraw(ntzsUserId: string, amountTzs: number, phone: string): Promise<NtzsWithdrawal> {
    return this._call('withdraw', {
      userId: ntzsUserId,
      amountTzs,
      phone
    });
  }
};
