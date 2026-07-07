import { supabase } from './supabase/client';
import { ntzsApi, type NtzsUser } from './ntzs-api';

export const WALLET_PAYMENT_METHODS = ['Wallet', 'Airtel Money', 'Mpesa', 'Mixx (Tigo)'] as const;

export type WalletPaymentMethod = typeof WALLET_PAYMENT_METHODS[number];

const SUCCESS_STATUSES = new Set(['success', 'completed', 'confirmed', 'minted']);
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'expired']);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeStatus = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (SUCCESS_STATUSES.has(normalized)) return 'success';
  if (FAILED_STATUSES.has(normalized)) return 'failed';
  return 'pending';
};

const isCompletedStatus = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'success' || normalized === 'completed';
};

const isFailedStatus = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled';
};

export async function loadNtzsWalletBalance(userId: string, email?: string) {
  const nUser = await ntzsApi.getUser(userId, email || '');
  if (!nUser?.id) throw new Error('Wallet user not found');
  const { balanceTzs } = await ntzsApi.getBalance(nUser.id);
  return { nUser, balanceTzs: balanceTzs || 0 };
}

async function waitForDepositTransaction(transactionId: number, depositId: string, timeoutMs = 90000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', transactionId)
      .single();

    if (isCompletedStatus(data?.status)) return true;
    if (isFailedStatus(data?.status)) return false;

    try {
      const providerDeposit = await ntzsApi.getDepositStatus(depositId);
      const providerStatus = normalizeStatus(providerDeposit?.status);
      if (providerStatus === 'success' || providerStatus === 'failed') {
        await supabase
          .from('transactions')
          .update({ status: providerStatus })
          .eq('id', transactionId);
        return providerStatus === 'success';
      }
    } catch (error) {
      console.error('Failed to get deposit status:', error);
      try {
        await ntzsApi.reconcilePendingDeposits();
      } catch (error2) {
        console.error('Failed to reconcile pending deposits:', error2);
      }
    }

    await sleep(3000);
  }

  return false;
}

export async function ensureWalletBalanceForPurchase({
  userId,
  email,
  amount,
  currency,
  eventId,
  paymentMethod,
  phone,
  onTopUpStarted,
}: {
  userId: string;
  email?: string;
  amount: number;
  currency: string;
  eventId: number;
  paymentMethod: WalletPaymentMethod;
  phone?: string;
  onTopUpStarted?: (amount: number) => void;
}): Promise<{ nUser: NtzsUser; balanceTzs: number }> {
  const { nUser, balanceTzs } = await loadNtzsWalletBalance(userId, email);
  if (balanceTzs >= amount) return { nUser, balanceTzs };

  if (paymentMethod === 'Wallet') {
    throw new Error('Insufficient wallet balance');
  }

  const cleanPhone = String(phone || '').trim();
  if (!cleanPhone) {
    throw new Error('Please enter your phone number');
  }

  const topUpAmount = amount - balanceTzs;
  const deposit = await ntzsApi.deposit(nUser.id, topUpAmount, cleanPhone);
  const initialStatus = normalizeStatus(deposit.status);

  const { data: topUpTransaction, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      event_id: eventId,
      amount: topUpAmount,
      currency,
      provider: paymentMethod,
      provider_transaction_id: deposit.id,
      status: initialStatus,
      metadata: {
        type: 'deposit',
        source: 'ticket-checkout',
        phone: cleanPhone,
        provider: paymentMethod,
        ntzsDepositId: deposit.id,
        providerStatus: deposit.status,
      },
    }])
    .select()
    .single();

  if (error) throw error;

  onTopUpStarted?.(topUpAmount);

  if (!isCompletedStatus(initialStatus)) {
    const completed = await waitForDepositTransaction(topUpTransaction.id, deposit.id);
    if (!completed) {
      throw new Error('Wallet top-up was not confirmed. Please try again after the deposit completes.');
    }
  }

  const refreshed = await ntzsApi.getBalance(nUser.id);
  const nextBalance = refreshed.balanceTzs || 0;

  if (nextBalance < amount) {
    throw new Error('Wallet top-up completed, but balance is still too low. Please retry purchase.');
  }

  return { nUser, balanceTzs: nextBalance };
}
