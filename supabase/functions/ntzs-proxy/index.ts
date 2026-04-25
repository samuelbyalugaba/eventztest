import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const NTZS_API_KEY = Deno.env.get('NTZS_API_KEY');
const NTZS_BASE_URL = 'https://www.ntzs.co.tz/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type TransactionRow = {
  id: number | string;
  amount: number;
  status: string;
  provider_transaction_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
};

const SUCCESS_STATUSES = new Set(['success', 'completed', 'confirmed', 'minted']);
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'expired']);

function normalizeNtzsStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase();
  if (SUCCESS_STATUSES.has(normalized)) return 'success';
  if (FAILED_STATUSES.has(normalized)) return 'failed';
  return 'pending';
}

async function ntzsRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${NTZS_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${NTZS_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error: Error & { status?: number; details?: unknown } = new Error(
      (typeof body === 'object' && body && ((body as any).message || (body as any).error)) ||
        `nTZS API Error: ${response.status}`
    );
    error.status = response.status;
    error.details = body;
    throw error;
  }

  return body;
}

async function getOrCreateNtzsUser(externalId: string, email: string) {
  return ntzsRequest('/users', {
    method: 'POST',
    body: JSON.stringify({ externalId, email }),
  }) as Promise<{ id: string; email?: string }>;
}

function computeLocalWalletBalance(transactions: TransactionRow[]) {
  let balance = 0;

  for (const tx of transactions) {
    if (!['success', 'completed'].includes(String(tx.status || '').toLowerCase())) continue;

    const type = tx.metadata?.type;
    const amount = Number(tx.amount || 0);

    if (type === 'deposit' || type === 'top-up' || type === 'gift-received') {
      balance += amount;
    } else if (type === 'withdrawal' || type === 'payment' || type === 'gift') {
      balance -= amount;
    }
  }

  return Math.max(0, balance);
}

async function reconcileDepositByProviderData(
  admin: ReturnType<typeof createClient>,
  authenticatedUserId: string,
  deposit: any
) {
  const normalizedStatus = normalizeNtzsStatus(deposit?.status);
  if (normalizedStatus === 'pending') {
    return { updated: false, status: normalizedStatus };
  }

  const depositId = String(deposit?.id || deposit?.depositId || '').trim();
  const amount = Number(deposit?.amountTzs ?? deposit?.amount ?? 0);

  const { data: pendingTransactions, error } = await admin
    .from('transactions')
    .select('id, amount, status, provider_transaction_id, metadata, created_at')
    .eq('user_id', authenticatedUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !pendingTransactions?.length) {
    return { updated: false, status: normalizedStatus };
  }

  const candidates = (pendingTransactions as TransactionRow[]).filter(
    (tx) => tx.metadata?.type === 'deposit'
  );

  const matchedTransaction =
    candidates.find(
      (tx) =>
        (depositId && tx.provider_transaction_id === depositId) ||
        (depositId && tx.metadata?.ntzsDepositId === depositId)
    ) ||
    candidates.find((tx) => amount > 0 && Number(tx.amount || 0) === amount);

  if (!matchedTransaction) {
    return { updated: false, status: normalizedStatus };
  }

  const metadata = {
    ...(matchedTransaction.metadata || {}),
    type: 'deposit',
    source: 'ntzs-proxy-reconcile',
    ntzsDepositId: depositId || matchedTransaction.metadata?.ntzsDepositId || null,
    providerStatus: deposit?.status || null,
    lastSyncedAt: new Date().toISOString(),
  };

  const { error: updateError } = await admin
    .from('transactions')
    .update({
      status: normalizedStatus,
      provider: 'nTZS',
      provider_transaction_id: depositId || matchedTransaction.provider_transaction_id || null,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchedTransaction.id);

  if (updateError) {
    throw updateError;
  }

  return {
    updated: true,
    transactionId: matchedTransaction.id,
    status: normalizedStatus,
  };
}

async function reconcilePendingDepositsFromBalance(
  admin: ReturnType<typeof createClient>,
  authenticatedUserId: string,
  email: string
) {
  const ntzsUser = await getOrCreateNtzsUser(authenticatedUserId, email);
  const wallet = await ntzsRequest(`/users/${ntzsUser.id}`) as { balanceTzs?: number; balance?: number };
  const providerBalance = Number(wallet.balanceTzs ?? wallet.balance ?? 0);

  const { data: transactions, error } = await admin
    .from('transactions')
    .select('id, amount, status, provider_transaction_id, metadata, created_at')
    .eq('user_id', authenticatedUserId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error || !transactions?.length) {
    return {
      updatedTransactionIds: [],
      providerBalance,
      localBalance: 0,
      remainingUnreconciledAmount: providerBalance,
    };
  }

  const transactionRows = transactions as TransactionRow[];
  const localBalance = computeLocalWalletBalance(transactionRows);
  let remaining = Number((providerBalance - localBalance).toFixed(2));

  if (remaining <= 0) {
    return {
      updatedTransactionIds: [],
      providerBalance,
      localBalance,
      remainingUnreconciledAmount: 0,
    };
  }

  const pendingDeposits = transactionRows.filter(
    (tx) => tx.status === 'pending' && tx.metadata?.type === 'deposit'
  );

  const updatedTransactionIds: Array<string | number> = [];

  for (const tx of pendingDeposits) {
    const amount = Number(tx.amount || 0);
    if (amount <= 0 || remaining + 0.001 < amount) continue;

    const metadata = {
      ...(tx.metadata || {}),
      type: 'deposit',
      source: 'ntzs-proxy-balance-reconcile',
      reconciledByBalance: true,
      lastSyncedAt: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from('transactions')
      .update({
        status: 'success',
        provider: 'nTZS',
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id);

    if (updateError) {
      throw updateError;
    }

    updatedTransactionIds.push(tx.id);
    remaining = Number(Math.max(0, remaining - amount).toFixed(2));
  }

  return {
    updatedTransactionIds,
    providerBalance,
    localBalance,
    remainingUnreconciledAmount: remaining,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!NTZS_API_KEY) {
      console.error('[ntzs-proxy] Missing NTZS_API_KEY');
      return jsonResponse({ error: 'Server configuration error: Missing NTZS_API_KEY. Add it in Supabase Edge Function Secrets.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Validate JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401);
    }
    const authenticatedUserId = claimsData.claims.sub;
    const authenticatedEmail = String(claimsData.claims.email || '');

    let bodyData;
    try {
      bodyData = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { action, payload } = bodyData;
    if (!action) return jsonResponse({ error: 'Missing action' }, 400);

    if (action === 'reconcile_pending_deposits') {
      if (!supabaseServiceRoleKey) {
        return jsonResponse({ error: 'Server configuration error: Missing service role key.' }, 500);
      }

      const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
      const reconciliation = await reconcilePendingDepositsFromBalance(
        admin,
        authenticatedUserId,
        authenticatedEmail
      );

      return jsonResponse(reconciliation);
    }

    // For create_user, enforce the externalId matches the authenticated user
    if (action === 'create_user' && payload?.externalId && payload.externalId !== authenticatedUserId) {
      return jsonResponse({ error: 'Cannot create user for a different account' }, 403);
    }

    // Route to nTZS API endpoint
    let endpoint = '';
    let method = 'GET';
    let apiBody: any = null;

    switch (action) {
      case 'create_user':
        endpoint = '/users';
        method = 'POST';
        apiBody = payload;
        break;
      case 'get_user':
        if (!payload?.userId) return jsonResponse({ error: 'Missing payload.userId' }, 400);
        endpoint = `/users/${payload.userId}`;
        break;
      case 'get_balance':
        if (!payload?.userId) return jsonResponse({ error: 'Missing payload.userId' }, 400);
        endpoint = `/users/${payload.userId}`;
        break;
      case 'deposit':
        endpoint = '/deposits';
        method = 'POST';
        apiBody = payload;
        break;
      case 'get_deposit':
        if (!payload?.depositId) return jsonResponse({ error: 'Missing payload.depositId' }, 400);
        endpoint = `/deposits/${payload.depositId}`;
        break;
      case 'transfer':
        endpoint = '/transfers';
        method = 'POST';
        apiBody = payload;
        break;
      case 'withdraw':
        endpoint = '/withdrawals';
        method = 'POST';
        apiBody = payload;
        break;
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    const url = `${NTZS_BASE_URL}${endpoint}`;
    console.log(`[ntzs-proxy] ${method} ${url}`);

    const data = await ntzsRequest(endpoint, {
      method,
      body: apiBody ? JSON.stringify(apiBody) : undefined,
    });

    if (action === 'get_deposit' && supabaseServiceRoleKey) {
      const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
      const reconciliation = await reconcileDepositByProviderData(admin, authenticatedUserId, data);
      return jsonResponse({ ...data, reconciliation });
    }

    return jsonResponse(data);

  } catch (error: any) {
    console.error('[ntzs-proxy] Internal Error:', error);
    const statusCode = typeof error?.status === 'number' ? error.status : 500;
    const isFallbackable = statusCode >= 500;
    const details = error?.details as any;
    const providerError = details?.error;
    const providerDetails = details?.details;

    if (providerError === 'insufficient_balance' && providerDetails) {
      const available = Number(providerDetails.available ?? 0);
      const requested = Number(providerDetails.receiveAmountTzs ?? 0);
      const shortfall = Math.max(0, Number(providerDetails.required ?? 0) - available);
      const suggestedAmount = Math.max(0, Math.floor(requested - shortfall));

      return jsonResponse({
        error: 'Amount too high. Try a smaller amount.',
        code: 'amount_too_high',
        suggestedAmount,
        statusCode,
        apiUnavailable: false,
        fallback: false,
      }, 200);
    }

    return jsonResponse({
      error: 'Internal error.',
      statusCode,
      apiUnavailable: isFallbackable,
      fallback: isFallbackable,
    }, 200);
  }
});
