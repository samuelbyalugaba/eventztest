import { supabase } from './client';

export const createTransaction = async (transactionData: {
  user_id: string;
  event_id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  type?: string;
  metadata?: any;
}) => {
  const { type, metadata, ...rest } = transactionData as any;
  const nextMetadata =
    type && (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || metadata.type == null)
      ? { ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}), type }
      : metadata;

  const insertData = { ...rest, ...(nextMetadata !== undefined ? { metadata: nextMetadata } : {}) };
  const { data, error } = await supabase
    .from('transactions')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const waitForTransactionCompletion = async (transactionId: number, timeoutMs = 60000) => {
  return new Promise<boolean>((resolve) => {
    supabase
      .from('transactions')
      .select('status')
      .eq('id', transactionId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.status === 'completed' || data.status === 'success') {
            resolve(true);
            return;
          }
          if (data.status === 'failed' || data.status === 'cancelled') {
            resolve(false);
            return;
          }
        }
      });

    const channel = supabase
      .channel(`transaction-status-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${transactionId}`
        },
        (payload) => {
          const status = payload.new.status;
          if (status === 'completed' || status === 'success') {
            supabase.removeChannel(channel);
            clearTimeout(timeout);
            resolve(true);
          } else if (status === 'failed' || status === 'cancelled') {
            supabase.removeChannel(channel);
            clearTimeout(timeout);
            resolve(false);
          }
        }
      )
      .subscribe();

    const timeout = setTimeout(() => {
      supabase.removeChannel(channel);
      resolve(false);
    }, timeoutMs);
  });
};
